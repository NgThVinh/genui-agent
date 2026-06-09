import logging

import uvicorn
from dotenv import load_dotenv

from .app import app

logger = logging.getLogger(__name__)

load_dotenv()


def run() -> None:
    """Entry point for `uv run dev`."""

    logging.basicConfig(level=logging.INFO)

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")


if __name__ == "__main__":
    run()
