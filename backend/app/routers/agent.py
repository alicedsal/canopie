from fastapi import APIRouter
from pydantic import BaseModel

from ..db import fetch_all
from ..services import gemini
from .feedback import FeedbackIn, store_feedback
from .suggestions import compute

router = APIRouter(tags=["agent"])


class AgentMessage(BaseModel):
    sender: str
    text: str


@router.post("/agent/message")
async def agent_message(msg: AgentMessage):
    """Single entry point for the iMessage agent: log the message as feedback, then answer it."""
    stored = await store_feedback(FeedbackIn(body=msg.text, channel="imessage", sender=msg.sender))
    projects = await fetch_all(
        """
        SELECT p.title, p.category, p.status, p.budget_usd, d.name AS district
        FROM projects p JOIN districts d ON d.id = p.district_id
        """
    )
    top = [{"title": s["title"], "district": s["district"], "town_cost_usd": s["town_cost_usd"],
            "residents_affected": s["constituents_affected"],
            "ranked_on": [k for k, v in sorted(s["contributions"].items(), key=lambda kv: -kv[1]) if v > 0][:2]}
           for s in await compute(5_000_000, 24, "balanced")]
    reply = await gemini.agent_reply(msg.text, stored["intent"], projects, top)
    return {"reply": reply, "intent": stored["intent"]}
