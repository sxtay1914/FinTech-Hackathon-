from contextlib import asynccontextmanager
from threading import Thread

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine, Base
from backend.routers import events, actions, themes

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Meridian API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(actions.router)
app.include_router(themes.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Meridian"}


_refresh_in_progress = False


@app.post("/api/refresh")
def refresh_news():
    """Fetch live news from Google News RSS, analyze with LLM, and replace DB."""
    global _refresh_in_progress
    if _refresh_in_progress:
        return {"status": "already_running"}

    def do_refresh():
        global _refresh_in_progress
        _refresh_in_progress = True
        try:
            from backend.seed_db import refresh_live
            refresh_live()
        finally:
            _refresh_in_progress = False

    Thread(target=do_refresh, daemon=True).start()
    return {"status": "started"}


@app.get("/api/refresh/status")
def refresh_status():
    return {"in_progress": _refresh_in_progress}
