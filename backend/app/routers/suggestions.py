from typing import Literal

from fastapi import APIRouter

from ml.suggest import suggest

from ..db import fetch_all
from ..services import gemini

router = APIRouter(tags=["suggestions"])

_DISTRICT_CONTEXT = """
SELECT d.*,
    (SELECT avg(value) FROM observations o
      WHERE o.district_id = d.id AND o.metric = 'ndvi' AND o.time > now() - INTERVAL '90 days') AS ndvi,
    (SELECT avg(value) FROM observations o
      WHERE o.district_id = d.id AND o.metric = 'lst_f' AND o.time > now() - INTERVAL '90 days') AS lst_f,
    (SELECT avg(sentiment) FROM feedback f
      WHERE f.district_id = d.id AND f.time > now() - INTERVAL '90 days') AS sentiment
FROM districts d
"""

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
    """balanced: predicted impact x approval probability.
    constituent: constituent demand x approval probability only (no environmental score)."""
    districts = await fetch_all(_DISTRICT_CONTEXT)
    demand = await fetch_all(_TOPIC_DEMAND)
    picks = suggest(districts, demand, budget=budget, horizon_months=horizon_months, mode=mode)
    if explain:
        for p in picks:
            p["rationale"] = await gemini.write_rationale(p)
    return {"budget": budget, "horizon_months": horizon_months, "mode": mode,
            "spent": sum(p["budget_usd"] for p in picks), "suggestions": picks}
