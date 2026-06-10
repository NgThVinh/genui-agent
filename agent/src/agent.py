"""
Agent core: a Pydantic AI agent that drives **generative UI** on the user's
screen. Instead of answering in text alone, the agent can mount rich, live HTML
components onto one of two *surfaces* — *inline* in the chat stream, or the
attached *workspace* panel beside the chat (which holds one focused card or a
freeform board of several) — and update or dismiss them as it works.

Protocol (the "genui directive"): every UI tool returns a `ToolReturn` whose
`metadata` carries AG-UI events. Pydantic AI's AG-UI adapter streams those to
the frontend as they happen during a run. Two kinds of event ride the stream:

  1. A single `genui` `CustomEvent` — the render/update/focus/dismiss directive,
     a versioned envelope discriminated by `op` (see `_genui`). For v1 the
     component `type` is always "html"; the field exists so typed components can
     be added later without a protocol break.
  2. A `StateSnapshotEvent` — the authoritative list of on-screen component
     *descriptors* (never the HTML), mirrored from the server-side UI-state so
     the agent stays coherent across turns.

UI-state lives in `StateDeps[AppState]`: the AG-UI adapter deserialises the
frontend's `state` into `deps.state` at the start of each run, the agent reads
it (surfaced into the prompt by `describe_current_ui`), each tool mutates it,
and the snapshot event mirrors it back. This replaces any "summarise the board
into the user message" stopgap.

This module is the importable core; the FastAPI/AG-UI transport lives in app.py.
"""

from __future__ import annotations

import os
from textwrap import dedent
from typing import Any, Literal

from ag_ui.core import CustomEvent, EventType, StateSnapshotEvent
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext, ToolReturn
from pydantic_ai.ui import StateDeps

# Load .env BEFORE the model string is read, since the Agent is built at import.
load_dotenv()


# Model is "<provider>:<model>", e.g. "openai:gpt-4.1-mini" or "anthropic:...".
# Set MODEL and the matching API key in agent/.env.
# See https://ai.pydantic.dev/models/ for exact, current model strings.
MODEL = os.environ.get("MODEL", "openai:gpt-4.1-mini")

# Bump this for any backwards-incompatible change to the genui directive shape.
PROTOCOL_VERSION = 1

# The render targets this client supports (the capability descriptor). The agent
# may only target one of these; the frontend owns how each is physically laid out.
Surface = Literal["inline", "workspace"]
ComponentStatus = Literal["active", "done", "error", "info"]
ComponentSize = Literal["sm", "md", "lg", "full"]


# --------------------------------------------------------------------------- #
# UI-State (mirrored into AG-UI shared `state`, carried as descriptors only).   #
# --------------------------------------------------------------------------- #
class UIComponent(BaseModel):
    """A single on-screen component instance. Descriptor only — no HTML."""

    id: str
    surface: Surface
    title: str | None = None
    status: ComponentStatus | None = None
    turn: int = 0


class UISection(BaseModel):
    components: list[UIComponent] = Field(default_factory=list)


class AppState(BaseModel):
    """Server-side mirror of what's on the user's screen.

    Populated from the frontend's AG-UI `state` at run start, read by the agent,
    mutated by the UI tools, and streamed back via `StateSnapshotEvent`.
    """

    ui: UISection = Field(default_factory=UISection)
    # Monotonic user-turn counter, sent by the frontend, stamped onto new cards.
    turn: int = 0


SYSTEM_PROMPT = dedent(
    """
    You are a friendly, capable assistant with a powerful ability: you render
    **generative UI** on the user's screen to explain things visually, not just
    in text. You author small, self-contained HTML components and mount them
    onto one of three surfaces. You decide WHAT to show and WHERE (which
    surface); the frontend decides HOW (exact size, position, responsive
    layout). Never reason about pixels, breakpoints, or screen coordinates.

    THE TWO SURFACES
      - "inline" — a rich card placed *inside your chat reply*, right where you
        are speaking, like a visual code block. Use it when the artifact IS the
        explanation at this point: small, self-contained, read-once, fine to
        scroll away with the conversation (a single diagram, a quick comparison,
        a rendered formula). Inline cards are frozen once your turn ends, so
        re-explaining later creates a NEW inline card.
      - "workspace" — a persistent panel attached beside the chat. It holds one
        OR many cards: a single card shows as a focused panel; several cards lay
        out as a freeform board the user can arrange. Use it for anything the
        user keeps coming back to or that needs room: a live metric/monitor, a
        dashboard, a map, a diagram, a timeline, or several cards to compare.
        Workspace cards PERSIST across turns until you dismiss them.

    CHOOSING A SURFACE (rubric)
      - Lifespan: just this turn / read-once -> inline; an ongoing reference,
        anything live or that the user will revisit -> workspace.
      - Size / parts: a quick single illustration tied to what you just said ->
        inline; a focused reference, a dashboard, or several arranged/comparative
        cards -> workspace (render one card per part; they share the panel).
      - An explicit user instruction ("put it in the panel", "keep it up",
        "add it to the workspace") ALWAYS wins.

    YOUR TOOLS
      - render_card(id, surface, html?, title?, status?, size?) — mount a new
        component, or update an existing one (matched by `id`). `surface` is
        REQUIRED and is fixed for the life of that id. Provide `html` to
        (re)render content; OMIT `html` to change only `title`/`status`.
        `status` is "active" (working), "done", "error", or "info". `size` is an
        optional hint ("sm"/"md"/"lg"/"full") — the frontend decides final
        geometry.
      - push_data(id, data) — stream live data into an already-rendered card
        WITHOUT reloading it (animate a chart, append to a feed). Only workspace
        cards receive live data; inline cards are read-once.
      - focus_card(id) — bring a card into view / highlight it.
      - dismiss(id?, surface?) — remove one card by `id`, or clear a whole
        `surface`, or (with neither) clear everything.

    WORK STEP BY STEP, VISUALLY
      For a multi-part answer, don't dump everything at once. For each step: say
      one short sentence in chat about what you're doing, then render or update a
      card for it. A good rhythm in the workspace: render with status="active"
      when you START, then update the SAME id to status="done" with the finished
      visual. Use a stable, meaningful `id` per component ("rag-retrieval",
      "latency", "summary").

    USE WHAT'S ALREADY ON SCREEN
      You are told the CURRENT SCREEN (the live component list) each turn. EDIT
      existing components by their `id` instead of rebuilding or clearing. Do NOT
      clear or recreate components unless the user asks for a fresh start or the
      old content is truly irrelevant. Add or update; don't reset.

    WRITING COMPONENT HTML (the `html` argument)
      - A complete, self-contained document: `<!doctype html>`, a `<style>`
        block, and any inline `<script>`. It renders in a sandboxed iframe,
        isolated from the page and other components. Cards auto-size to their
        content — don't set a body height.
      - Design clean and polished on a light background: clear type, sensible
        spacing, a small coherent palette, real (not placeholder) content. Give
        charts an EXPLICIT pixel height in CSS (otherwise auto-sizing loops).
      - Interactive visuals must work via inline JS. Do NOT use localStorage or
        sessionStorage (the sandbox blocks them) — keep state in memory.
      - You MAY load CDN libraries (Chart.js, D3, ...) via `<script src>`; prefer
        inline SVG/CSS for simple visuals so they also work offline.

    LIVE DATA (workspace only)
      To update a card in place after it renders, include this listener in the
      card's script, then call push_data(id, data) one or more times:
          window.addEventListener('message', (e) => {
            const m = e.data;
            if (!m || m.source !== 'genui' || m.type !== 'data') return;
            const payload = m.payload;   // update your chart / UI with this
          });

    PATTERNS (how to make answers feel alive)
      - ANIMATE / STREAM: don't render the finished picture all at once. Render
        the card first (often `status="active"` with an empty/skeleton frame),
        then drive it step by step with `push_data` while you narrate each step
        in one short chat line — ink a route along a map, draw each handshake
        arrow, count KPI numbers up, grow bars one by one, append streaming log
        lines. Flip to `status="done"` when the visual is complete.
      - PICK A LIBRARY BY ARTIFACT (load via `<script src>` from a CDN):
        maps -> Leaflet; charts/dashboards/KPIs -> Chart.js; graphs, system
        architecture, embedding/knowledge maps -> D3 (or a force layout); simple
        diagrams/timelines -> inline SVG/CSS. Give every chart an explicit pixel
        height.
      - SURFACE BY INTENT: a single quick illustration that belongs with what you
        just said -> "inline". Everything persistent or roomy -> "workspace":
        live status / deploy / metric feeds (+ `push_data`), maps, dashboards,
        diagrams, timelines, architecture, or several arranged/comparative pieces
        (render one card per part plus a summary/verdict card; use `focus_card`
        to spotlight the winner or the current step).
      - RE-FLOW / EDITS: when the user tweaks something ("push the beta a week",
        "now sort descending", "where do I park?"), UPDATE the existing card by
        its `id` (re-render its html) — do not spawn a new one.
      - INTERACTIVITY: build self-contained controls with inline JS — sliders,
        draggable handles, hover tooltips, sortable tables — keeping state in
        memory. The card must work on its own (you don't yet receive events back
        from inside a card, so don't depend on a round-trip).
      - DATA: you have no live data sources, so when a scene needs figures
        (sales, traffic, metrics, retrieval, deploy logs) use plausible,
        clearly-illustrative representative data rather than refusing.

    STYLE
      Keep chat replies short — the components carry the detail. NEVER paste
      component HTML into chat. If the user just wants to talk or asks something
      trivial, answer in text without rendering anything.
    """
).strip()


agent = Agent(MODEL, deps_type=StateDeps[AppState], instructions=SYSTEM_PROMPT)


@agent.instructions
def describe_current_ui(ctx: RunContext[StateDeps[AppState]]) -> str:
    """Surface the live on-screen component list into the prompt each turn."""
    components = ctx.deps.state.ui.components
    if not components:
        return "CURRENT SCREEN: empty — nothing is mounted yet."
    lines = [
        f'- id="{c.id}" on {c.surface} — "{c.title or "(untitled)"}" [{c.status or "info"}]'
        for c in components
    ]
    return "CURRENT SCREEN (edit these by id; do not rebuild):\n" + "\n".join(lines)


def _genui(op: str, **fields: Any) -> CustomEvent:  # noqa: ANN401 - directive fields are arbitrary JSON
    """Build the single `genui` directive event, dropping unset fields."""
    value: dict[str, Any] = {"v": PROTOCOL_VERSION, "op": op}
    value.update({k: v for k, v in fields.items() if v is not None})
    return CustomEvent(type=EventType.CUSTOM, name="genui", value=value)


def _state_snapshot(ctx: RunContext[StateDeps[AppState]]) -> StateSnapshotEvent:
    """Mirror the (descriptor-only) UI-state back to the frontend."""
    return StateSnapshotEvent(type=EventType.STATE_SNAPSHOT, snapshot=ctx.deps.state.model_dump())


def _find(ctx: RunContext[StateDeps[AppState]], component_id: str) -> UIComponent | None:
    return next((c for c in ctx.deps.state.ui.components if c.id == component_id), None)


@agent.tool
async def render_card(  # noqa: PLR0913 - mirrors the genui render directive's fields
    ctx: RunContext[StateDeps[AppState]],
    id: str,  # noqa: A002 - matches the protocol's instance handle
    surface: Surface,
    html: str | None = None,
    title: str | None = None,
    status: ComponentStatus | None = None,
    size: ComponentSize | None = None,
) -> ToolReturn:
    """Mount a new UI component, or update an existing one (matched by `id`).

    A new `id` mounts a fresh component on `surface`; an existing `id` updates it
    in place. `surface` is fixed once an id first renders (it is ignored on
    update). Provide `html` to (re)render content; omit it to change only `title`
    or `status`. This is your main tool for building a visual answer.

    Args:
        id: Stable instance handle (e.g. "rag-retrieval", "latency", "summary").
        surface: Where to mount it — "inline" or "workspace". Required on
            first render; immutable afterwards.
        html: A complete, self-contained HTML document. Provide to (re)render;
            omit to change only title/status.
        title: Short title shown in the component's header.
        status: Visual state badge: "active", "done", "error", or "info".
        size: Optional size hint ("sm"/"md"/"lg"/"full"); the frontend decides.

    Returns:
        A confirmation for you. The UI update streams to the screen; do not
        repeat the HTML in chat.
    """
    existing = _find(ctx, id)
    if existing is not None:
        surface = existing.surface  # surface is immutable after first render
        if title is not None:
            existing.title = title
        if status is not None:
            existing.status = status
        existing.turn = ctx.deps.state.turn
    else:
        ctx.deps.state.ui.components.append(
            UIComponent(id=id, surface=surface, title=title, status=status, turn=ctx.deps.state.turn)
        )

    directive = _genui(
        "render", id=id, surface=surface, type="html", html=html, title=title, status=status, size=size
    )
    verb = "rendered" if existing is None else "updated"
    note = " Don't repeat the HTML in chat." if html is not None else ""
    return ToolReturn(
        return_value=f"Component '{id}' {verb} on the {surface} surface.{note}",
        metadata=[directive, _state_snapshot(ctx)],
    )


@agent.tool
async def push_data(ctx: RunContext[StateDeps[AppState]], id: str, data: Any) -> ToolReturn:  # noqa: A002, ANN401
    """Stream live data into an already-rendered card without reloading it.

    The card's HTML must include a `message` listener (see the LIVE DATA contract
    in the system prompt). Call repeatedly to animate a chart or append to a
    feed. Live data targets workspace cards; inline cards are read-once.

    Args:
        id: Id of an existing card that listens for data.
        data: Any JSON-serializable payload to hand to that card.
    """
    target = _find(ctx, id)
    if target is not None and target.surface == "inline":
        return ToolReturn(
            return_value=(
                f"'{id}' is an inline card, which is read-once and doesn't take live data. "
                "Render it on the workspace surface if you need to stream into it."
            ),
            metadata=[],
        )
    return ToolReturn(
        return_value=f"Pushed data to '{id}'.",
        metadata=[_genui("data", id=id, data=data)],
    )


@agent.tool_plain
async def focus_card(id: str) -> ToolReturn:  # noqa: A002
    """Bring a card into view and briefly highlight it.

    Args:
        id: Id of the card to focus (pan the workspace to it, or scroll the
            inline card into view).
    """
    return ToolReturn(
        return_value=f"Focused '{id}'.",
        metadata=[_genui("focus", id=id)],
    )


@agent.tool
async def dismiss(
    ctx: RunContext[StateDeps[AppState]],
    id: str | None = None,  # noqa: A002
    surface: Surface | None = None,
) -> ToolReturn:
    """Remove components from the screen.

    Use sparingly — prefer updating existing components over clearing. Pass `id`
    to remove one component, `surface` to clear a whole surface, or neither to
    clear everything.

    Args:
        id: Remove just this component.
        surface: Clear every component on this surface.
    """
    components = ctx.deps.state.ui.components
    if id is not None:
        ctx.deps.state.ui.components = [c for c in components if c.id != id]
        scope = f"component '{id}'"
    elif surface is not None:
        ctx.deps.state.ui.components = [c for c in components if c.surface != surface]
        scope = f"the {surface} surface"
    else:
        ctx.deps.state.ui.components = []
        scope = "everything"

    return ToolReturn(
        return_value=f"Dismissed {scope}.",
        metadata=[_genui("dismiss", id=id, surface=surface), _state_snapshot(ctx)],
    )
