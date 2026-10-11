from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import fetch_all, fetch_one

router = APIRouter(tags=["projects"])

# Latest prediction per project rides along so the map can show impact without a second call.
_SELECT = """
SELECT p.*, d.name AS district,
       pr.approval_prob, pr.delta_ndvi, pr.delta_lst_f, pr.delta_flood_risk, pr.constituents_affected
FROM projects p
JOIN districts d ON d.id = p.district_id
LEFT JOIN LATERAL (
    SELECT * FROM predictions WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1
) pr ON true
"""


@router.get("/projects")
async def list_projects(status: str | None = None):
    if status:
        return await fetch_all(_SELECT + " WHERE p.status = %s ORDER BY p.id", (status,))
    return await fetch_all(_SELECT + " ORDER BY p.id")


@router.get("/projects/{project_id}")
async def get_project(project_id: int):
    row = await fetch_one(_SELECT + " WHERE p.id = %s", (project_id,))
    if not row:
        raise HTTPException(404, "project not found")
    return row


class ProposalIn(BaseModel):
    title: str
    category: str
    district_id: int
    lat: float
    lng: float
    budget_usd: float
    grant_match_pct: float = 0
    description: str = ""


@router.post("/projects")
async def add_proposal(p: ProposalIn):
    """Turn a model suggestion into a proposed project. Adding the same one twice is a no-op."""
    existing = await fetch_one(
        "SELECT id FROM projects WHERE title = %s AND source = 'model' AND status = 'proposed'", (p.title,))
    if existing:
        return await get_project(existing["id"])
    row = await fetch_one(
        """
        INSERT INTO projects (title, description, category, status, source, district_id, lat, lng,
                              budget_usd, grant_match_pct)
        VALUES (%s, %s, %s, 'proposed', 'model', %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (p.title, p.description, p.category, p.district_id, p.lat, p.lng, p.budget_usd, p.grant_match_pct),
    )
    return await get_project(row["id"])
