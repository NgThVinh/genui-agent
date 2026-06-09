"""
Transport layer (thin): exposes the agent over the AG-UI protocol and serves
the frontend.

- POST /agent   -> AG-UI run endpoint. Accepts a RunAgentInput JSON body and
                   returns a Server-Sent Events stream of AG-UI events. This is
                   the whole protocol surface; `AGUIAdapter.dispatch_request`
                   handles request parsing, running the agent, and SSE encoding.
- GET  /config  -> small helper so the UI can show which model is running.
- GET  /        -> the single-file frontend (frontend/index.html).

Run with:  uvicorn app:app --reload --port 8000
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic_ai.ui.ag_ui import AGUIAdapter

if TYPE_CHECKING:
    from starlette.requests import Request
    from starlette.responses import Response

from .agent import MODEL, agent

load_dotenv()

FRONTEND = Path(__file__).resolve().parent.parent.parent / "webui"

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
    """AG-UI endpoint: stream AG-UI events for one agent run."""
    return await AGUIAdapter.dispatch_request(request, agent=agent)


@app.get("/config")
async def config() -> dict:
    """Expose the active model so the UI can display it."""
    return {"model": MODEL}


@app.get("/")
async def index() -> FileResponse:
    """Serve the chat + generative-UI frontend."""
    return FileResponse(FRONTEND / "index.html")
