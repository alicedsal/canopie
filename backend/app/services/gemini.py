"""All Gemini calls live here so prompts are easy to find and tune.

Without GEMINI_API_KEY every function returns a neutral fallback, so the rest of the
stack can be developed offline.
"""
import json

from google import genai
from pydantic import BaseModel

from ml.priors import CATEGORIES

from ..config import settings

_client = genai.Client(api_key=settings.gemini_api_key) if settings.gemini_api_key else None

TOPICS = [*CATEGORIES, "other"]


class FeedbackAnalysis(BaseModel):
    sentiment: float          # -1 (angry) .. 1 (delighted)
    topics: list[str]         # subset of TOPICS
    district: str | None      # one of the known district names, or null
    intent: str               # feedback | suggestion | question


async def analyze_feedback(body: str, district_names: list[str]) -> dict:
    if _client is None:
        return {"sentiment": 0.0, "topics": ["other"], "district": None, "intent": "feedback"}
    prompt = (
        "You triage messages from residents of Chapel Hill, NC to their town planners.\n"
        f"Allowed topics: {TOPICS}\n"
        f"Known districts: {district_names}\n"
        "Score sentiment toward the current state of the town from -1 to 1. "
        "Pick a district only if the message clearly refers to one.\n\n"
        f"Message: {body!r}"
    )
    resp = await _client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config={"response_mime_type": "application/json", "response_schema": FeedbackAnalysis},
    )
    out = FeedbackAnalysis.model_validate_json(resp.text).model_dump()
    out["sentiment"] = max(-1.0, min(1.0, out["sentiment"]))
    out["topics"] = [t for t in out["topics"] if t in TOPICS] or ["other"]
    return out


async def write_rationale(suggestion: dict) -> str:
    """Plain-language case for a model-suggested project. The numbers come from the model, not Gemini."""
    if _client is None:
        return ""
    resp = await _client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=(
            "Write a 2-sentence, plain-language case for this proposed town project for a council "
            "packet. Use only the numbers given; do not invent any.\n" + json.dumps(suggestion, default=str)
        ),
    )
    return resp.text.strip()


async def agent_reply(text: str, intent: str, projects: list[dict]) -> str:
    if _client is None:
        return "Thanks, your message was logged for the planning team."
    resp = await _client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=(
            "You are Canopy, a friendly text-message assistant for Chapel Hill residents. "
            "Reply in under 60 words, no markdown. If they gave feedback or a suggestion, confirm it "
            "was logged for planners. If they asked a question, answer only from the project list.\n"
            f"Projects: {json.dumps(projects, default=str)}\n"
            f"Intent: {intent}\nResident: {text!r}"
        ),
    )
    return resp.text.strip()
