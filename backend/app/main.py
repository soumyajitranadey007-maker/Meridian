import asyncio
from contextlib import asynccontextmanager
import logging
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .api import routes_ai, routes_contracts, routes_disputes, routes_milestones, ws
from .config import get_settings
from .db import SessionLocal
from .services.soroban_indexer import SorobanIndexer

settings = get_settings()
structlog.configure(wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, settings.log_level, logging.INFO)))
indexer = SorobanIndexer(SessionLocal)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(indexer.run())
    yield
    indexer.stop()
    task.cancel()


app = FastAPI(title="Meridian API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])
app.state.limiter = routes_milestones.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.include_router(routes_contracts.router)
app.include_router(routes_milestones.router)
app.include_router(routes_disputes.router)
app.include_router(routes_ai.router)
app.include_router(ws.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "meridian-api"}
