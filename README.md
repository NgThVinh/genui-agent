# Live Generative Canvas (Pydantic AI + AG-UI)

An AI agent that doesn't just answer — it **builds a visual workspace as it
thinks**. You chat on the left; on the right is a live **Canvas** the agent
assembles panel-by-panel while it works through a response. It streams both the
conversation and every UI update over a single [AG-UI](https://docs.ag-ui.com)
Server-Sent Events connection.

```
┌──────────────────────────────────────────────────────────────┐
│  Live Generative Canvas · ag-ui     model gpt-4.1-mini  ● ready
├──────────────────────┬───────────────────────────────────────┤
│  Conversation        │   Canvas · 3 panels        ui_panel    │
│  ┌────────────────┐  │   ┌─ ✓ Step 1 · Ingest ────────────┐   │
│  │ "First, the    │  │   │  (diagram)                     │   │
│  │  documents…"   │ ⟿│   └────────────────────────────────┘   │
│  │ "Now chunking… │  │   ┌─ ✓ Step 2 · Chunk ─────────────┐   │
│  │  here's how…"  │  │   │  (diagram)                     │   │
│  │                │  │   └────────────────────────────────┘   │
│  │                │  │   ┌─ ◐ Step 3 · Embed ─────────────┐   │
│  └────────────────┘  │   │  (working…)                    │   │
│  [ type a message ]  │   └────────────────────────────────┘   │
└──────────────────────┴───────────────────────────────────────┘
        chat rail            event wire           live canvas
```

## What's different from a static render

The agent has a small toolkit for an **upsertable, multi-panel canvas** instead
of one all-or-nothing render. Because Pydantic AI streams each tool call's event
the instant it happens within a single run, the panels appear and update in real
time as the agent narrates.

| Tool | What it does |
| --- | --- |
| `add_or_update_panel(id, title?, html?, status?)` | Add a panel, or update an existing one (matched by `id`). Pass `html` to (re)render; omit it to just flip `status` or change the title. |
| `push_panel_data(id, data)` | Stream live data **into** an already-rendered panel via `postMessage` — no reload. For charts/feeds that update in place. |
| `focus_panel(id)` | Scroll the canvas to a panel and highlight it. |
| `clear_canvas()` | Reset the canvas for a new task. |

The step-by-step rhythm the agent is told to use: add a panel as `status="active"`
when a step starts, then update the **same** `id` to `status="done"` with the
finished visual. The header badge shows ◐ working → ✓ done per panel.

## How it works

- **Agent** (`agent/agent.py`) — a [Pydantic AI](https://ai.pydantic.dev)
  agent. Each UI tool returns a `ToolReturn` whose `metadata` is an AG-UI
  `CustomEvent`; Pydantic AI streams those to the browser. Emitted events:
  `ui_panel`, `ui_push`, `ui_focus`, `ui_clear`.
- **Transport** (`agent/app.py`) — a thin FastAPI layer. `POST /agent` hands
  the request to `AGUIAdapter.dispatch_request(...)`, which runs the agent and
  returns the AG-UI event stream. The same server serves the frontend.
- **Frontend** (`webui/index.html`) — one file, no build step. It POSTs an
  AG-UI `RunAgentInput`, reads the SSE stream, renders `TEXT_MESSAGE_*` into the
  chat, and turns the `ui_*` custom events into panels. Each panel is its own
  sandboxed iframe.

The agent → UI contract is just custom events, e.g. a panel upsert:

```jsonc
{ "type": "CUSTOM", "name": "ui_panel",
  "value": { "id": "step-2", "title": "Chunk", "status": "done", "html": "<!doctype html>…" } }
```

## Run it

Requires Python 3.10+.

```bash
cd agent
uv sync

cp .env.example .env        # then edit .env: set MODEL + your provider API key

uvicorn app:app --reload --port 8000
```

Open <http://localhost:8000>. Or from the project root, `./run.sh`.

### Choosing a model

```dotenv
MODEL=google:gemini-3-flash-preview
GOOGLE_API_KEY=...
```

Swap in any provider Pydantic AI supports (Anthropic, Google, Groq, Ollama, …) —
set `MODEL` to the `provider:model` string and the matching API key. Exact model
names: <https://ai.pydantic.dev/models/>. A capable model helps here, since the
agent has to plan steps and write good HTML for each.

## Try these

- *"Walk me through how RAG works, one diagram panel per stage"*
- *"Compare 3 vector databases — a panel each, then a summary"*
- *"Simulate a model training run and stream the loss curve live"* (uses `push_panel_data`)
- *"Build a dashboard: a metric card, a bar chart, then a data table"*

Ask for a tweak to any panel ("mark step 2 done", "make the bars teal", "add a
4th column") and the agent updates that panel in place.

## The live-data contract

To update a panel without reloading it, the agent renders a panel whose script
listens for messages, then calls `push_panel_data(id, data)`:

```js
window.addEventListener('message', (e) => {
  const m = e.data;
  if (!m || m.source !== 'agui' || m.type !== 'data') return;
  const data = m.data;   // update your chart / UI with this
});
```

The host forwards `push_panel_data` payloads to that panel as
`{ source:'agui', type:'data', data }`. Pushes that arrive before the iframe has
finished loading are **queued and flushed on load**, so none are lost.

## Notes & design

- **Each panel is sandboxed** with `sandbox="allow-scripts"` (no
  `allow-same-origin`): panels can run inline JS and load CDN libs (Chart.js,
  D3) but can't touch this page, each other, or `localStorage`. The agent is
  told to keep state in memory.
- **Auto-sizing.** A tiny height reporter is appended to every panel's HTML; it
  posts the content height back (under a private `agui-internal` channel that
  can't collide with the agent's `agui` data messages) so each panel fits its
  content. Heights are clamped to a sane range.
- **Chat stays plain text** (`textContent`), so model output can't inject markup
  into the app shell — only the explicitly-sandboxed panels run HTML.
- **History.** Each turn re-sends user + assistant text as AG-UI messages; tool
  calls aren't replayed (kept simple). The conversation keeps enough context to
  iterate on panels by `id`.
- **Updating vs. replacing.** Re-rendering a panel (`html` provided) reloads its
  iframe — fine for "fill in the result" steps. For genuinely live updates
  without losing in-panel state, render once and drive it with
  `push_panel_data`.
- **Swap the frontend.** The backend is a standard AG-UI server, so any AG-UI
  client can point at `POST /agent` — e.g. a React app using `@ag-ui/client`'s
  `HttpAgent`, or CopilotKit — and handle the same `ui_*` events.
- **Structured UIs.** For predictable, schema-shaped UIs (a plan with
  checkboxes, a known dashboard), AG-UI's state channel (`StateSnapshot` /
  `StateDelta` with JSON Patch, via Pydantic AI's `StateDeps`) is an alternative
  to free-form HTML. This project uses HTML panels because the agent invents the
  visuals on the fly.

Built against `pydantic-ai` 1.94.x, which provides the non-deprecated adapter at
`pydantic_ai.ui.ag_ui.AGUIAdapter`. (`Agent.to_ag_ui()` / `AGUIApp` still work in
1.x but are slated for removal in 2.0.)
