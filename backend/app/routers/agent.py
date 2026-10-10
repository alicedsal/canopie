from fastapi import APIRouter
from pydantic import BaseModel

from ..db import fetch_all
from ..services import gemini
from .feedback import FeedbackIn, store_feedback

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
    reply = await gemini.agent_reply(msg.text, stored["intent"], projects)
    return {"reply": reply, "intent": stored["intent"]}
