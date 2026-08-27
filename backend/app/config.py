from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    # Production never falls back to a local database. A missing Neon/Postgres URL
    # must fail fast instead of silently persisting user contracts on ephemeral disk.
    database_url: str
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"
    soroban_rpc_url: str = "https://soroban-testnet.stellar.org"
    arbitration_contract_address: str | None = None
    reputation_contract_address: str | None = None
    factory_contract_address: str | None = None
    frontend_origins: str = "http://localhost:5173"
    indexer_poll_interval_seconds: int = 8
    log_level: str = "INFO"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
