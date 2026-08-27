"""Explicit test-only configuration; production requires DATABASE_URL."""
import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
