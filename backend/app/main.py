import logging
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .api import routes_ai, routes_contracts, routes_disputes, routes_milestones
from .config import get_settings
from .db import database_is_available

settings = get_settings()
structlog.configure(wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, settings.log_level, logging.INFO)))
# Vercel functions are request-scoped. Do not start an infinite polling loop or
# a socket server in their lifespan; those workloads belong in a scheduled job.
app = FastAPI(title="Meridian API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])
app.state.limiter = routes_milestones.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.include_router(routes_contracts.router)
app.include_router(routes_milestones.router)
app.include_router(routes_disputes.router)
app.include_router(routes_ai.router)


@app.get("/health", response_model=None)
async def health():
    if not await database_is_available():
        return JSONResponse(status_code=503, content={"status": "degraded", "service": "meridian-api", "database": "unavailable"})
    return {"status": "ok", "service": "meridian-api", "database": "connected"}
