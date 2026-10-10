from fastapi import APIRouter, HTTPException

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
