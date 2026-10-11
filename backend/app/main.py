from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import pool
from .routers import agent, feedback, metrics, projects, suggestions


@asynccontextmanager
async def lifespan(_: FastAPI):
    pool.open()
    yield
    pool.close()


app = FastAPI(title="Canopy API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (projects, metrics, feedback, suggestions, agent):
    app.include_router(r.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"ok": True}
