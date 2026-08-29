from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    # Production never falls back to a local database. Keeping this optional at
    # import time lets /health report an actionable 503 instead of making every
    # request fail as an opaque Vercel function-invocation error.
    database_url: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"
    soroban_rpc_url: str = "https://soroban-testnet.stellar.org"
    arbitration_contract_address: str | None = None
    reputation_contract_address: str | None = None
    factory_contract_address: str | None = None
    frontend_origins: str = "http://localhost:5173"
    indexer_poll_interval_seconds: int = 8
    admin_wallet_addresses: str = ""
    admin_auth_secret: str | None = None
    admin_session_ttl_seconds: int = 900
    cron_secret: str | None = None
    log_level: str = "INFO"

    @field_validator("database_url")
    @classmethod
    def normalize_async_database_url(cls, value: str | None) -> str | None:
        if not value:
            return None
        # Neon and Vercel commonly provide a standard PostgreSQL URL. SQLAlchemy
        # needs the asyncpg dialect for this asynchronous application.
        if value.startswith("postgres://"):
            value = "postgresql+asyncpg://" + value.removeprefix("postgres://")
        elif value.startswith("postgresql://"):
            value = "postgresql+asyncpg://" + value.removeprefix("postgresql://")
        if not value.startswith("postgresql+asyncpg://"):
            return value
        # Neon often gives a libpq URL with sslmode/channel_binding parameters.
        # asyncpg uses `ssl` and does not accept channel_binding.
        parsed = urlsplit(value)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        if "sslmode" in query:
            query.setdefault("ssl", query["sslmode"])
            query.pop("sslmode", None)
        query.pop("channel_binding", None)
        return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment))

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.frontend_origins.split(",") if origin.strip()]

    @property
    def admin_wallets(self) -> set[str]:
        return {address.strip() for address in self.admin_wallet_addresses.split(",") if address.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
