"""
Transport layer (thin): exposes the agent over the AG-UI protocol and serves
the frontend.

- POST /agent   -> AG-UI run endpoint. Accepts a RunAgentInput JSON body and
                   returns a Server-Sent Events stream of AG-UI events. This is
                   the whole protocol surface; `AGUIAdapter.dispatch_request`
                   handles request parsing, running the agent, and SSE encoding.
- GET  /config  -> small helper so the UI can show which model is running.
- GET  /        -> the built demo playground (webui/dist-playground), if present.

The real frontend is the `@genui/react` SDK in `webui/`; `/` only serves the
built playground demo for local convenience. Run `npm run build:playground` in
`webui/` to produce it.

Run with:  uvicorn app:app --reload --port 8000
"""


from dataclasses import replace
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic_ai.ui import StateDeps
from pydantic_ai.ui.ag_ui import AGUIAdapter

from .agent import MODEL, AppState, agent

load_dotenv()

PLAYGROUND_DIST = Path(__file__).resolve().parent.parent.parent / "webui" / "dist-playground"

app = FastAPI(title="AG-UI Generative UI Agent")

# Same-origin serving means CORS isn't strictly required, but allowing it keeps
# things painless if you later run the frontend from a separate dev server
# (e.g. Vite on :5173). Tighten `allow_origins` for any real deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/agent")
async def run_agent(request: Request) -> Response:
    """AG-UI endpoint: stream AG-UI events for one agent run.

    A fresh `StateDeps[AppState]` is created per request; the adapter deserialises
    the frontend's `state` into `deps.state` before the run. `replace` guards
    against concurrent requests sharing one deps object.
    """
    deps = replace(StateDeps(AppState()))
    return await AGUIAdapter.dispatch_request(request, agent=agent, deps=deps)


@app.get("/config")
async def config() -> dict:
    """Expose the active model so the UI can display it."""
    return {"model": MODEL}


# Serve the built playground demo at `/` (after the API routes, so they win).
# Skipped gracefully if it hasn't been built yet.
if PLAYGROUND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=PLAYGROUND_DIST, html=True), name="playground")
