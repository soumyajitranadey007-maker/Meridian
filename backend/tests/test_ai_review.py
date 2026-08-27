import pytest
from app.services.gemini_service import GeminiProtocolError, GeminiService


def test_bad_ai_json_is_rejected_without_fallback():
    with pytest.raises(GeminiProtocolError):
        GeminiService._parse("not json")
