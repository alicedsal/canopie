"""All Gemini calls live here so prompts are easy to find and tune.

Without GEMINI_API_KEY, or when Gemini is unavailable or rate limited, every function
returns a neutral fallback so the request still succeeds.
"""
import asyncio
import json
from typing import Literal

from google import genai
from pydantic import BaseModel

from ml.priors import CATEGORIES

from ..config import settings

_client = genai.Client(api_key=settings.gemini_api_key) if settings.gemini_api_key else None

TOPICS = [*CATEGORIES, "other"]


async def _generate(contents: str, config: dict | None = None) -> str | None:
    """One Gemini call, retried once. Returns None if Gemini is unavailable (no key, 503
    under load, free-tier rate limit, slow) so callers fall back instead of failing or
    hanging the request."""
    if _client is None:
        return None
    for attempt in range(2):
        try:
            resp = await asyncio.wait_for(
                _client.aio.models.generate_content(
                    model=settings.gemini_model, contents=contents, config=config),
                timeout=12)
            return resp.text
        except Exception as exc:
            print(f"gemini attempt {attempt + 1} failed: {str(exc)[:120]}")
            if "RESOURCE_EXHAUSTED" in str(exc):
                return None  # rate limited: waiting a second will not help
            await asyncio.sleep(1)
    return None


class FeedbackAnalysis(BaseModel):
    sentiment: float          # -1 (angry) .. 1 (delighted)
    topics: list[str]         # subset of TOPICS
    district: str | None      # one of the known district names, or null
    intent: Literal["feedback", "suggestion", "question"]


async def analyze_feedback(body: str, district_names: list[str]) -> dict:
    prompt = (
        "You triage messages from residents of Chapel Hill, NC to their town planners.\n"
        f"Allowed topics: {TOPICS}\n"
        f"Known districts: {district_names}\n"
        "Score sentiment toward the current state of the town from -1 to 1. "
        "Pick a district only if the message clearly refers to one.\n\n"
        f"Message: {body!r}"
    )
    text = await _generate(
        prompt, {"response_mime_type": "application/json", "response_schema": FeedbackAnalysis})
    if text is None:
        return {"sentiment": 0.0, "topics": ["other"], "district": None, "intent": "feedback"}
    out = FeedbackAnalysis.model_validate_json(text).model_dump()
    out["sentiment"] = max(-1.0, min(1.0, out["sentiment"]))
    out["topics"] = [t for t in out["topics"] if t in TOPICS] or ["other"]
    return out


async def write_rationale(suggestion: dict) -> str:
    """Plain-language case for a model-suggested project. The numbers come from the model, not Gemini."""
    text = await _generate(
        (
            "Write a 2-sentence, plain-language case for this proposed town project for a council "
            "packet. Use only the numbers given; do not invent any.\n" + json.dumps(suggestion, default=str)
        ),
    )
    return text.strip() if text else ""


async def agent_reply(text: str, intent: str, projects: list[dict]) -> str:
    text = await _generate(
        (
            "You are Canopy, a friendly text-message assistant for Chapel Hill residents. "
            "Reply in under 60 words, no markdown. If they gave feedback or a suggestion, confirm it "
            "was logged for planners. If they asked a question, answer only from the project list.\n"
            f"Projects: {json.dumps(projects, default=str)}\n"
            f"Intent: {intent}\nResident: {text!r}"
        ),
    )
    return text.strip() if text else "Thanks, your message was logged for the planning team."
