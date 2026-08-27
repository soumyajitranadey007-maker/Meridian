"""Vercel's explicit ASGI entry point for the Meridian API.

Keeping this tiny adapter at ``api/index.py`` lets Vercel discover the
application while the backend retains its normal Python package structure.
"""

from backend.app.main import app

__all__ = ["app"]
