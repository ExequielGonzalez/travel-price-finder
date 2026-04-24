from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .api.routes import router
from .config import settings

app = FastAPI(
    title="Travel Price Finder",
    description="Flight search API and dashboard for autonomous agents",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

static_dir = Path(__file__).parent.parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")


def main():
    import uvicorn

    uvicorn.run(
        "travel_price_finder.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
