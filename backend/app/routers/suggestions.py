from typing import Literal

from fastapi import APIRouter

from ml.suggest import suggest

from ..db import fetch_all
from ..services import gemini

router = APIRouter(tags=["suggestions"])

_TOPIC_DEMAND = """
SELECT district_id, topic, count(*) AS n
FROM feedback, unnest(topics) AS topic
WHERE time > now() - INTERVAL '90 days' AND district_id IS NOT NULL
GROUP BY 1, 2
"""


@router.get("/suggestions")
async def get_suggestions(
    budget: float = 2_000_000,
    horizon_months: int = 12,
    mode: Literal["balanced", "constituent"] = "balanced",
    explain: bool = False,
):
    """balanced: alignment uplift (rule-based impact engine) x residents reached.
    constituent: alignment x how many residents asked for it, nothing else."""
    districts = await fetch_all("SELECT * FROM districts ORDER BY id")
    demand = await fetch_all(_TOPIC_DEMAND)
    picks = suggest(districts, demand, budget=budget, horizon_months=horizon_months, mode=mode)
    if explain:
        for p in picks:
            p["rationale"] = await gemini.write_rationale(p)
    return {"budget": budget, "horizon_months": horizon_months, "mode": mode,
            "spent": sum(p["town_cost_usd"] for p in picks), "suggestions": picks}
