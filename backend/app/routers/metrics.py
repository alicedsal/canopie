from typing import Literal

from fastapi import APIRouter

from ml.grid import CELL_M, cell_bounds, cells
from ml.need import need_scores

from ..db import fetch_all

router = APIRouter(tags=["metrics"])


@router.get("/districts")
async def list_districts():
    return await fetch_all("SELECT * FROM districts ORDER BY id")


@router.get("/districts/{district_id}/metrics")
async def district_metrics(district_id: int, metric: str = "ndvi", days: int = 365):
    # Reads the continuous aggregate, not the raw hypertable.
    return await fetch_all(
        """
        SELECT day, avg_value, max_value
        FROM observations_daily
        WHERE district_id = %s AND metric = %s AND day > now() - make_interval(days => %s)
        ORDER BY day
        """,
        (district_id, metric, days),
    )


@router.get("/sentiment")
async def sentiment(days: int = 90):
    return await fetch_all(
        """
        SELECT s.day, s.district_id, d.name AS district, s.avg_sentiment, s.messages
        FROM sentiment_daily s JOIN districts d ON d.id = s.district_id
        WHERE s.day > now() - make_interval(days => %s)
        ORDER BY s.day
        """,
        (days,),
    )


@router.get("/need")
async def need_layer(domain: Literal["overall", "heat", "canopy", "flood", "lighting"] = "overall",
                     limit: int = 700):
    """Highest-need 100 m cells for one domain, for the map layer."""
    grid, scores = cells(), need_scores()
    top = sorted(grid, key=lambda key: scores[key][domain], reverse=True)[:limit]
    return {
        "domain": domain, "cell_m": CELL_M, "total_cells": len(grid),
        "cells": [{"cell_id": grid[k]["cell_id"], "score": round(scores[k][domain], 3),
                   "district": grid[k]["district"], **cell_bounds(grid[k])} for k in top],
    }
