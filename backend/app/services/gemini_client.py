"""The only place the app talks to Gemini. Called from the backend only; the browser never sees the key."""

from __future__ import annotations

import httpx

from app.config import Settings

API_BASE = "https://generativelanguage.googleapis.com/v1beta"


class AnalysisUnavailable(Exception):
    """Gemini could not be reached, refused the request, or is not configured."""


class GeminiClient:
    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self._api_key = settings.gemini_api_key
        self._model = settings.gemini_model
        self._client = client or httpx.Client(timeout=settings.gemini_timeout_seconds)

    def generate_json(self, prompt: str) -> str:
        """Returns the model's text answer. Any text that is not valid JSON is the caller's problem to reject."""
        if not self._api_key:
            raise AnalysisUnavailable("GEMINI_API_KEY is not set.")
        body = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0},
        }
        try:
            response = self._client.post(
                f"{API_BASE}/models/{self._model}:generateContent",
                headers={"x-goog-api-key": self._api_key, "Content-Type": "application/json"},
                json=body,
            )
        except httpx.HTTPError as exc:
            raise AnalysisUnavailable("Could not reach Gemini.") from exc
        if response.status_code != 200:
            raise AnalysisUnavailable(f"Gemini returned HTTP {response.status_code}.")
        try:
            return response.json()["candidates"][0]["content"]["parts"][0]["text"]
        except (ValueError, KeyError, IndexError, TypeError):
            return ""  # no text in the answer; the service treats an empty answer as invalid
