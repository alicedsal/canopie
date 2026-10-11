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


async def compute(budget: float, horizon_months: int, mode: str) -> list[dict]:
    districts = await fetch_all("SELECT * FROM districts ORDER BY id")
    demand = await fetch_all(_TOPIC_DEMAND)
    return suggest(districts, demand, budget=budget, horizon_months=horizon_months, mode=mode)


@router.get("/suggestions")
async def get_suggestions(
    budget: float = 2_000_000,
    horizon_months: int = 12,
    mode: Literal["balanced", "constituent"] = "balanced",
):
    """balanced: six predicted outcomes with stated weights, adjusted by local need, x residents reached.
    constituent: alignment x resident demand (2026 community survey priority plus
    messages received about that topic in that district), nothing else."""
    picks = await compute(budget, horizon_months, mode)
    return {"budget": budget, "horizon_months": horizon_months, "mode": mode,
            "spent": sum(p["town_cost_usd"] for p in picks), "suggestions": picks}


_RATIONALE_FIELDS = ["title", "district", "budget_usd", "town_cost_usd", "months", "grant_match_pct",
                     "delta_ndvi", "delta_lst_f", "runoff_mgal", "constituents_affected",
                     "constituent_mentions", "survey"]


@router.post("/rationale")
async def rationale(suggestion: dict):
    """Two plain-language sentences for one suggestion. One Gemini call, made on demand."""
    facts = {k: suggestion[k] for k in _RATIONALE_FIELDS if k in suggestion}
    text = await gemini.write_rationale(facts)
    return {"rationale": text or "Gemini is busy right now. Try again in a minute."}
