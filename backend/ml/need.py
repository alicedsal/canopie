"""Need model: where is each kind of need greatest? (improvements_to_model.txt, section 1.)

Kept separate from the impact model on purpose. Need says where a problem is; impact
(ml/impact_engine.py) says what a given project would change there.

Each domain is a 0..1 percentile rank across the grid. Heat and canopy come from satellite
measurements and use the neighbourhood features in ml/grid.py so that one odd cell does
not dominate. Lighting still rests on interpolated night-radiance figures, not real data:
  heat      surface temperature: 250 m neighbourhood, plus how much hotter the cell is than it
  canopy    lack of vegetation over the 250 m neighbourhood
  flood     closeness to the nearest mapped stream (town stormwater division centerlines)
  lighting  low night-time radiance over the 250 m neighbourhood

Transport, safety, accessibility and housing need are in the design document but have no
data behind them yet, so they are not scored here rather than being guessed.
"""
import math
from functools import lru_cache

from .grid import cells

DOMAINS = ["heat", "canopy", "flood", "lighting"]


def _raw(cell: dict) -> dict:
    return {
        "heat": cell["lst_f_lag_250"] + 2 * cell["lst_f_local_difference"],
        "canopy": -cell["ndvi_lag_250"],
        # Fallback when the town grid has not been built: sub-basin flag and gauge distance.
        "flood": (-cell["stream_m"] if cell["stream_m"] is not None
                  else (1.0 if cell["watershed"] else 0.0) + math.exp(-cell["gauge_dist_km"])),
        "lighting": -cell["viirs_lag_250"],
    }


@lru_cache(maxsize=1)
def need_scores() -> dict[tuple[int, int], dict]:
    """Per cell: a 0..1 score per domain, plus 'overall' (their mean)."""
    grid = cells()
    raw = {key: _raw(cell) for key, cell in grid.items()}
    out: dict[tuple[int, int], dict] = {key: {} for key in grid}
    for domain in DOMAINS:
        ranked = sorted(grid, key=lambda key: raw[key][domain])
        last = max(len(ranked) - 1, 1)
        for rank, key in enumerate(ranked):
            out[key][domain] = rank / last
    for scores in out.values():
        scores["overall"] = sum(scores[d] for d in DOMAINS) / len(DOMAINS)
    return out


def blended(scores: dict, weights: dict[str, float]) -> float:
    """Need for a project type: weighted mean of the domains it addresses (0.5 if none)."""
    total = sum(weights.values())
    return sum(scores[d] * w for d, w in weights.items()) / total if total else 0.5
