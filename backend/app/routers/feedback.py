import hashlib

from fastapi import APIRouter
from pydantic import BaseModel

from ..config import settings
from ..db import fetch_all, fetch_one
from ..services import gemini

router = APIRouter(tags=["feedback"])


class FeedbackIn(BaseModel):
    body: str
    channel: str = "web"
    sender: str | None = None
    project_id: int | None = None


def hash_sender(sender: str | None) -> str | None:
    if not sender:
        return None
    return hashlib.sha256((settings.sender_hash_salt + sender).encode()).hexdigest()


async def store_feedback(fb: FeedbackIn) -> dict:
    """Run Gemini analysis on a constituent message and persist it. Shared by web form and agent."""
    districts = await fetch_all("SELECT id, name FROM districts")
    analysis = await gemini.analyze_feedback(fb.body, [d["name"] for d in districts])
    district_id = next((d["id"] for d in districts if d["name"] == analysis["district"]), None)
    row = await fetch_one(
        """
        INSERT INTO feedback (channel, sender_hash, district_id, project_id, body, sentiment, topics)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id, time, district_id, sentiment, topics
        """,
        (fb.channel, hash_sender(fb.sender), district_id, fb.project_id, fb.body,
         analysis["sentiment"], analysis["topics"]),
    )
    return {**row, "district": analysis["district"], "intent": analysis["intent"]}


@router.post("/feedback")
async def post_feedback(fb: FeedbackIn):
    return await store_feedback(fb)


@router.get("/feedback")
async def recent_feedback(limit: int = 50):
    return await fetch_all(
        """
        SELECT f.id, f.time, f.channel, f.body, f.sentiment, f.topics, d.name AS district
        FROM feedback f LEFT JOIN districts d ON d.id = f.district_id
        ORDER BY f.time DESC LIMIT %s
        """,
        (limit,),
    )
