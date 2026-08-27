import pytest
from app.services.gemini_service import GeminiService


@pytest.mark.asyncio
async def test_review_returns_structured_response(monkeypatch):
    service = GeminiService()
    async def fake_generate(_): return '{"completeness_score": 88, "risk_flags": [], "summary": "Strong delivery.", "suggested_questions": ["Confirm handoff"]}'
    monkeypatch.setattr(service, "_generate", fake_generate)
    result = await service.review_milestone("A responsive landing page", "A Figma link and source files")
    assert result["completeness_score"] == 88
    assert result["suggested_questions"] == ["Confirm handoff"]
