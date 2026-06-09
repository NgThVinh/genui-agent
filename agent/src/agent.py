"""
Agent core: a Pydantic AI agent whose one special ability is painting live HTML
into a "generative UI" panel on the user's screen.

The mechanism is the AG-UI `CUSTOM` event. A normal Pydantic AI tool returns a
`ToolReturn` whose `metadata` carries one or more AG-UI `BaseEvent`s; Pydantic
AI's AG-UI adapter detects those and streams them to the frontend as part of the
same SSE event stream as the chat text. The frontend listens for our custom
event (name = "render_ui") and drops the HTML into a sandboxed iframe.

This module is the importable "core" — it knows nothing about HTTP. The thin
FastAPI/AG-UI transport layer lives in `app.py`.
"""

from __future__ import annotations

import os
from textwrap import dedent

from ag_ui.core import CustomEvent, EventType
from dotenv import load_dotenv
from pydantic_ai import Agent, ToolReturn

# Load .env BEFORE the model string is read, since the Agent is built at import.
load_dotenv()

# Model is "<provider>:<model>", e.g. "openai:gpt-4.1-mini" or
# "anthropic:claude-...". Set MODEL and the matching API key in backend/.env.
# See https://ai.pydantic.dev/models/ for exact, current model strings.
MODEL = os.environ.get("MODEL", "openai:gpt-4.1-mini")

# The name the frontend matches on for CUSTOM events. Keep these in sync.
RENDER_EVENT = "render_ui"


SYSTEM_PROMPT = dedent(
    """
    You are a friendly, capable assistant with one standout ability: you can
    paint live, interactive HTML into a "generative UI" panel on the user's
    screen by calling the `render_ui` tool.

    WHEN TO RENDER
    Reach for `render_ui` whenever a visual communicates better than prose:
    charts, tables, dashboards, comparison cards, diagrams, timelines, forms,
    calculators, or small interactive mini-apps. Lead with the visual whenever
    the user says things like "show", "visualize", "build", "make", "draw",
    "chart", or "design". If the user just wants to chat or asks a plain
    question, answer normally in text and don't call the tool.

    HOW TO WRITE THE HTML (the `html` argument)
    - Return a COMPLETE, self-contained document: a `<!doctype html>`, a
      `<style>` block, and any `<script>` you need. It renders inside a
      sandboxed iframe, fully isolated from the host page.
    - Design for a panel roughly 700px wide on a light background. Aim for
      clean, polished work: generous spacing, a readable type scale, and a
      small, coherent color palette. No lorem ipsum — use real, relevant text.
    - Make interactive things actually work using inline JavaScript (handle
      clicks, inputs, etc.). Do NOT use localStorage or sessionStorage — the
      sandbox blocks them; keep all state in in-memory variables.
    - You MAY load libraries from a CDN via `<script src="...">` (Chart.js, D3,
      etc.); they load when the user is online. For simple visuals, prefer
      inline SVG/CSS so they also work offline.
    - Always pass a short, descriptive `title`.

    AFTER RENDERING
    Do NOT paste or repeat the HTML in your chat reply. Just give a one- or
    two-sentence note about what you put on screen and how to use it. Each
    `render_ui` call replaces whatever is currently in the panel, so build the
    full updated view each time rather than sending fragments.
    """
).strip()


agent = Agent(MODEL, instructions=SYSTEM_PROMPT)


@agent.tool_plain
async def render_ui(html: str, title: str = "Generative UI") -> ToolReturn:
    """Render an HTML document in the generative UI panel on the user's screen.

    Use this to SHOW the user something visual or interactive instead of
    describing it in text. Pass a complete, self-contained HTML document.

    Args:
        html: A complete HTML document (doctype, styles, optional scripts).
            Renders in a sandboxed iframe ~700px wide on a light background.
        title: A short label for what is being shown (e.g. "Moons by planet").

    Returns:
        A confirmation for you (the model). The HTML itself is streamed to the
        screen as an AG-UI custom event — you do not need to repeat it.
    """
    return ToolReturn(
        return_value=(
            f"Rendered '{title}' in the generative UI panel on the user's "
            "screen. Do not repeat the HTML; just briefly tell the user what "
            "you showed them."
        ),
        metadata=[
            CustomEvent(
                type=EventType.CUSTOM,
                name=RENDER_EVENT,
                value={"html": html, "title": title},
            )
        ],
    )
