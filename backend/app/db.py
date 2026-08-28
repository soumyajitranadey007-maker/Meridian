from collections.abc import AsyncIterator
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from .config import get_settings


class DatabaseConfigurationError(RuntimeError):
    """Raised when the deployment has no usable persistent database URL."""


_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        database_url = get_settings().database_url
        if not database_url:
            raise DatabaseConfigurationError("DATABASE_URL is not configured")
        try:
            _engine = create_async_engine(database_url, future=True, pool_pre_ping=True)
        except (TypeError, ValueError) as exc:
            raise DatabaseConfigurationError("DATABASE_URL is not a valid async PostgreSQL URL") from exc
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(get_engine(), expire_on_commit=False, class_=AsyncSession)
    return _session_factory


async def get_session() -> AsyncIterator[AsyncSession]:
    try:
        async with get_session_factory()() as session:
            yield session
    except DatabaseConfigurationError as exc:
        # A controlled 503 is useful to the browser and Vercel logs, unlike an
        # import-time crash that becomes FUNCTION_INVOCATION_FAILED.
        from fastapi import HTTPException

        raise HTTPException(status_code=503, detail="Meridian storage is not configured. Set DATABASE_URL in Vercel.") from exc
    except SQLAlchemyError as exc:
        from fastapi import HTTPException

        raise HTTPException(status_code=503, detail="Meridian storage is temporarily unavailable. Check DATABASE_URL and database migrations.") from exc


async def database_is_available() -> bool:
    """Check the persistent store without leaking connection details."""
    try:
        async with get_engine().connect() as connection:
            await connection.execute(text("SELECT 1"))
        return True
    except (DatabaseConfigurationError, SQLAlchemyError):
        return False
