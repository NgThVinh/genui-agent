# Generative UI Agent (Pydantic AI + AG-UI)

A small AI agent that talks back **and draws**. You chat with it on the left; on
the right is a live canvas the agent controls by writing HTML. It uses the
[AG-UI protocol](https://docs.ag-ui.com) to stream both the conversation and the
generated UI over a single Server-Sent Events connection.

```
┌──────────────────────────────────────────────────────────────┐
│  Generative UI Agent · ag-ui          model gpt-4.1-mini  ● ready
├──────────────────────┬───────────────────────────────────────┤
│  Conversation        │   Generative UI                        │
│  ┌────────────────┐  │   ┌─────────────────────────────────┐  │
│  │ user / agent   │  │   │  (the agent's HTML renders here │  │
│  │ bubbles        │ ⟿│   │   in a sandboxed iframe)        │  │
│  │ ⚙ render_ui    │  │   └─────────────────────────────────┘  │
│  └────────────────┘  │   < / > source                         │
│  [ type a message ]  │                                         │
└──────────────────────┴───────────────────────────────────────┘
        chat rail            event wire          generative canvas
```

## How it works

- **Agent** (`agent/agent.py`) — a [Pydantic AI](https://ai.pydantic.dev)
  agent with one tool, `render_ui(html, title)`. The model *writes the HTML
  itself*; the tool wraps it in an AG-UI `CustomEvent` and returns it as
  `ToolReturn` metadata. Pydantic AI streams that event to the browser.
- **Transport** (`agent/app.py`) — a thin FastAPI layer. `POST /agent` hands
  the request to `AGUIAdapter.dispatch_request(...)`, which runs the agent and
  returns the AG-UI event stream. The same server also serves the frontend.
- **Frontend** (`webui/index.html`) — one file, no build step. It POSTs an
  AG-UI `RunAgentInput`, reads the SSE stream, renders `TEXT_MESSAGE_*` events
  into the chat, and drops `CUSTOM` events named `render_ui` into a sandboxed
  iframe. The wire on the divider pulses each time an event crosses it.

The agent → UI contract is just two strings inside one custom event:

```jsonc
{ "type": "CUSTOM", "name": "render_ui", "value": { "html": "<!doctype html>…", "title": "Moons by planet" } }
```

## Run it

Requires Python 3.10+.

```bash
cd agent
uv sync

cp .env.example .env        # then edit .env: set MODEL + your provider API key

uvicorn app:app --reload --port 8000
```

Open <http://localhost:8000>.

### Choosing a model

`.env` controls everything:

```dotenv
MODEL=openai:gpt-4.1-mini
OPENAI_API_KEY=sk-...
```

Swap in any provider Pydantic AI supports (Anthropic, Google, Groq, Ollama, …) —
set `MODEL` to the right `provider:model` string and the matching API key. Exact,
current model names are listed at <https://ai.pydantic.dev/models/>.

## Try these

- *"Bar chart of the planets by number of moons"*
- *"A tip calculator I can actually use"*
- *"Diagram a RAG pipeline: ingest → chunk → embed → retrieve → generate"*
- *"A 3-column kanban board with a few sample cards"*

Each request **replaces** the canvas. Ask for a tweak ("make the bars teal",
"add a 4th column") and the agent re-renders the whole view.

## Notes & extending

- **Sandbox.** The iframe uses `sandbox="allow-scripts"` (no `allow-same-origin`):
  the agent's HTML can run inline JS and load CDN libraries like Chart.js, but
  can't touch this page or use `localStorage`/`sessionStorage`. The system prompt
  tells the model to keep state in memory.
- **Chat is plain text.** Assistant messages render via `textContent`, so model
  output can't inject markup into the app shell — only the explicitly-sandboxed
  canvas runs HTML.
- **History.** Each turn re-sends user + assistant text as AG-UI messages. Tool
  calls aren't replayed into history (kept simple); the conversation still has
  enough context to iterate.
- **Swapping the frontend.** The backend is a standard AG-UI server, so you can
  point any AG-UI client at `POST /agent` instead — e.g. a React app using
  `@ag-ui/client`'s `HttpAgent`, or CopilotKit. Listen for the `render_ui`
  custom event there the same way this page does.
- **More than HTML.** `render_ui` is one custom event. Add more tools that emit
  other `CustomEvent` names (charts-as-data, state updates via `StateSnapshot`,
  etc.) and handle them in `handleEvent()` on the frontend.

Built against `pydantic-ai` 1.94.x, which provides the non-deprecated adapter at
`pydantic_ai.ui.ag_ui.AGUIAdapter`. (`Agent.to_ag_ui()` / `AGUIApp` still work in
1.x but are slated for removal in 2.0.)
