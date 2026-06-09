"""
Agent core: a Pydantic AI agent that drives a live, multi-step "Canvas" on the
user's screen — a visual workspace it builds up panel-by-panel as it works,
rather than a single static render.

Mechanism (unchanged in spirit, richer in vocabulary): each UI tool returns a
`ToolReturn` whose `metadata` carries an AG-UI `CustomEvent`. Pydantic AI's
AG-UI adapter streams those events to the frontend as they happen during a run.
Because the model can call these tools repeatedly across the steps of a single
response, the panels appear and update in real time.

UI custom events emitted here (the frontend matches on `name`):
  - ui_panel : {id, title?, html?, status?}   upsert a panel (add or update)
  - ui_push  : {id, data}                      stream live data into a panel
  - ui_focus : {id}                            scroll to / highlight a panel
  - ui_clear : {}                              reset the whole canvas

This module is the importable core; the FastAPI/AG-UI transport lives in app.py.
"""

from __future__ import annotations

import os
from textwrap import dedent
from typing import Any, Literal

from ag_ui.core import CustomEvent, EventType
from dotenv import load_dotenv
from pydantic_ai import Agent, ToolReturn

# Load .env BEFORE the model string is read, since the Agent is built at import.
load_dotenv()


# Model is "<provider>:<model>", e.g. "openai:gpt-4.1-mini" or "anthropic:...".
# Set MODEL and the matching API key in backend/.env.
# See https://ai.pydantic.dev/models/ for exact, current model strings.
MODEL = os.environ.get("MODEL", "openai:gpt-4.1-mini")

PanelStatus = Literal["active", "done", "error", "info"]


SYSTEM_PROMPT = dedent(
    """
    You are a friendly, capable assistant with a powerful ability: a live
    **Canvas** on the user's screen that you build and update in real time to
    help them understand your answer. Think of it as a visual workspace that
    grows as you think — not a single static picture.

    THE CANVAS
    The Canvas is a vertical stack of **panels** (titled cards). You control it
    with these tools:
      - `add_or_update_panel(panel_id, title?, html?, status?)` — create a
        panel, or update an existing one (matched by `panel_id`). Provide `html`
        to (re)render its content; OMIT `html` to change only its `title` or
        `status`. `status` is one of: "active" (working), "done", "error",
        "info".
      - `push_panel_data(panel_id, data)` — stream live data into an
        already-rendered panel WITHOUT reloading it (for charts or feeds that
        update in place).
      - `focus_panel(panel_id)` — scroll the Canvas to a panel and highlight it.
      - `clear_canvas()` — remove all panels; use at the very start of a brand
        new task.

    WORK STEP BY STEP, VISUALLY
    When a question has multiple steps or parts, do NOT answer all at once. Move
    through it step by step, and for each step:
      1) say one short sentence in chat about what you're doing, then
      2) add or update a panel that visualizes that step.
    This lets the user watch your reasoning take shape. Use one panel per step
    or section, each with a stable `panel_id` (e.g. "step-1", "chart",
    "summary") and a short `title`. A good rhythm: add a panel with
    `status="active"` when you START a step, then update the SAME panel to
    `status="done"` with the finished visual when it's ready. Add a final
    "summary" panel at the end when it helps.

    Reuse a `panel_id` to evolve a panel (fill in results, refine a chart, flip
    its status). Use a NEW `panel_id` to add another panel below.

    WRITING PANEL HTML (the `html` argument)
      - A complete, self-contained document: a `<!doctype html>`, a `<style>`
        block, and any inline `<script>`. It renders in a sandboxed iframe,
        isolated from the page and from other panels. Panels auto-size to their
        content, so you don't need to set a body height.
      - Design for ~700px wide on a light background. Clean and polished: clear
        type, sensible spacing, a small coherent palette, and real (not
        placeholder) content. Give charts an explicit pixel height in CSS.
      - Interactive elements must actually work via inline JS. Do NOT use
        localStorage or sessionStorage (the sandbox blocks them) — keep state in
        memory.
      - You MAY load CDN libraries (Chart.js, D3, etc.) via `<script src>`; they
        load when the user is online. Prefer inline SVG/CSS for simple visuals
        so they also work offline.

    LIVE DATA (optional, for real-time panels)
    To update a panel in place after it's rendered, include this listener in the
    panel's script, then call `push_panel_data(panel_id, data)` one or more
    times:
        window.addEventListener('message', (e) => {
          const m = e.data;
          if (!m || m.source !== 'agui' || m.type !== 'data') return;
          const data = m.data;   // update your chart / UI with this
        });

    STYLE
    Keep chat replies short — the Canvas carries the detail. NEVER paste panel
    HTML into chat. If the user just wants to talk or asks something trivial,
    answer in text without touching the Canvas.
    """
).strip()


agent = Agent(MODEL, instructions=SYSTEM_PROMPT)


def _event(name: str, value: dict) -> list[CustomEvent]:
    return [CustomEvent(type=EventType.CUSTOM, name=name, value=value)]


@agent.tool_plain
async def add_or_update_panel(
    panel_id: str,
    title: str | None = None,
    html: str | None = None,
    status: PanelStatus | None = None,
) -> ToolReturn:
    """Create a panel on the live Canvas, or update an existing one.

    Panels are matched by `panel_id`: a new id adds a panel at the bottom; an
    existing id updates that panel in place. This is your main tool for building
    a step-by-step visual answer.

    Args:
        panel_id: Stable id for the panel (e.g. "step-1", "chart", "summary").
        title: Short panel title shown in its header.
        html: A complete, self-contained HTML document to render in the panel.
            Provide this to (re)render content; omit it to change only title or
            status.
        status: Visual state badge: "active" (in progress), "done", "error", or
            "info".

    Returns:
        A confirmation for you. The UI update is streamed to the screen; do not
        repeat the HTML in chat.
    """
    value: dict[str, Any] = {"id": panel_id}
    if title is not None:
        value["title"] = title
    if html is not None:
        value["html"] = html
    if status is not None:
        value["status"] = status

    note = "Don't repeat the HTML in chat." if html is not None else ""
    return ToolReturn(
        return_value=f"Panel '{panel_id}' set on the Canvas. {note}".strip(),
        metadata=_event("ui_panel", value),
    )


@agent.tool_plain
async def push_panel_data(panel_id: str, data: Any) -> ToolReturn:
    """Stream live data into an already-rendered panel without reloading it.

    The panel's HTML must include a `message` listener (see the system prompt's
    LIVE DATA contract). Call this repeatedly to animate a chart or feed.

    Args:
        panel_id: Id of an existing panel that listens for data.
        data: Any JSON-serializable payload to hand to that panel.
    """
    return ToolReturn(
        return_value=f"Pushed data to panel '{panel_id}'.",
        metadata=_event("ui_push", {"id": panel_id, "data": data}),
    )


@agent.tool_plain
async def focus_panel(panel_id: str) -> ToolReturn:
    """Scroll the Canvas to a panel and briefly highlight it.

    Args:
        panel_id: Id of the panel to bring into view.
    """
    return ToolReturn(
        return_value=f"Focused panel '{panel_id}'.",
        metadata=_event("ui_focus", {"id": panel_id}),
    )


@agent.tool_plain
async def clear_canvas() -> ToolReturn:
    """Remove all panels and reset the Canvas. Use when starting a new task."""
    return ToolReturn(
        return_value="Canvas cleared.",
        metadata=_event("ui_clear", {}),
    )
