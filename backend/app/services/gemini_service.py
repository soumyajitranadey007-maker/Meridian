import json
from typing import Any
import httpx
from pydantic import ValidationError
from tenacity import retry, stop_after_attempt, wait_exponential
from ..config import get_settings
from ..schemas.ai import ReviewResponse


class GeminiProtocolError(RuntimeError):
    """Raised when Gemini does not return the documented structured payload."""


class GeminiService:
    def __init__(self) -> None:
        self.settings = get_settings()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), reraise=True)
    async def _generate(self, prompt: str) -> str:
        if not self.settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.settings.gemini_model}:generateContent"
        payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2}}
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(url, params={"key": self.settings.gemini_api_key}, json=payload)
            response.raise_for_status()
        try:
            return response.json()["candidates"][0]["content"]["parts"][0]["text"]
        except (IndexError, KeyError, TypeError) as exc:
            raise GeminiProtocolError("Gemini returned no usable candidate.") from exc

    async def review_milestone(self, spec: str, deliverable: str) -> dict[str, Any]:
        prompt = f'''You are a neutral freelance milestone reviewer. Compare the deliverable to the milestone specification. Return JSON only with completeness_score (0-100 integer), risk_flags (array of concise strings), summary (neutral concise string), and suggested_questions (array). Never decide whether funds should be released.\nSPECIFICATION:\n{spec}\nDELIVERABLE:\n{deliverable}'''
        parsed = self._parse(await self._generate(prompt))
        try:
            return ReviewResponse.model_validate(parsed).model_dump()
        except ValidationError as exc:
            raise GeminiProtocolError("Gemini returned an invalid milestone review schema.") from exc

    async def summarize_dispute(self, client_evidence: list[str], freelancer_evidence: list[str]) -> str:
        prompt = f'''Write a neutral dispute brief. Separate uncontested facts, client evidence, freelancer evidence, and open questions. Do not make a ruling.\nCLIENT EVIDENCE: {client_evidence}\nFREELANCER EVIDENCE: {freelancer_evidence}'''
        result = self._parse(await self._generate(prompt))
        summary = result.get("summary")
        if not isinstance(summary, str) or not summary.strip():
            raise GeminiProtocolError("Gemini returned an invalid dispute summary schema.")
        return summary.strip()

    @staticmethod
    def _parse(raw: str) -> dict[str, Any]:
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise GeminiProtocolError("Gemini returned malformed JSON.") from exc
        if not isinstance(parsed, dict):
            raise GeminiProtocolError("Gemini returned a JSON value instead of an object.")
        return parsed


gemini_service = GeminiService()
