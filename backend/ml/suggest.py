"""Generate candidate projects, score them, and pick the best set that fits the budget."""
from pathlib import Path

import joblib

from .features import featurize
from .priors import CATEGORIES, IMPACT_TARGETS

_MODEL_PATH = Path(__file__).parent / "artifacts" / "model.joblib"
_model = joblib.load(_MODEL_PATH) if _MODEL_PATH.exists() else None

# How much one unit of each effect is worth in the "balanced" score. Tune with the team.
UTILITY = {"d_ndvi": 10.0, "d_lst": -0.5, "d_flood": -5.0}


def predict(project: dict, district: dict) -> dict:
    """Approval probability + predicted effects for one project. Falls back to priors if untrained."""
    prior = CATEGORIES[project["category"]]
    if _model is None:
        out = {"approval_prob": prior["approve"], **{t: prior[t] for t in IMPACT_TARGETS}}
        version = "priors"
    else:
        x = [featurize(project, district)]
        out = {"approval_prob": float(_model["approval"].predict_proba(x)[0][1]),
               **{t: float(_model["impact"][t].predict(x)[0]) for t in IMPACT_TARGETS}}
        version = _model["version"]
    return {
        "model_version": version,
        "approval_prob": round(out["approval_prob"], 3),
        "delta_ndvi": round(out["d_ndvi"], 4),
        "delta_lst_f": round(out["d_lst"], 2),
        "delta_flood_risk": round(out["d_flood"], 3),
        "constituents_affected": int(district["population"] * prior["reach"]),
    }


def suggest(districts: list[dict], demand: list[dict], *, budget: float, horizon_months: int,
            mode: str = "balanced") -> list[dict]:
    """districts: rows with ndvi / lst_f / sentiment / population.
    demand: rows of (district_id, topic, n) counted from constituent feedback."""
    asks = {(r["district_id"], r["topic"]): r["n"] for r in demand}
    candidates = []
    for d in districts:
        for cat, prior in CATEGORIES.items():
            if prior["months"] > horizon_months:
                continue
            project = {"category": cat, "budget_usd": prior["cost"], "months": prior["months"],
                       "grant_match_pct": prior["grant"]}
            pred = predict(project, d)
            mentions = asks.get((d["id"], cat), 0)
            if mode == "constituent":
                # Constituent data and approval probability only: no environmental term.
                score = pred["approval_prob"] * mentions
            else:
                impact = (UTILITY["d_ndvi"] * pred["delta_ndvi"] + UTILITY["d_lst"] * pred["delta_lst_f"]
                          + UTILITY["d_flood"] * pred["delta_flood_risk"])
                score = pred["approval_prob"] * (impact + 0.1 * mentions) * pred["constituents_affected"] / 1000
            if score <= 0:
                continue
            town_cost = prior["cost"] * (1 - prior["grant"] / 100)
            candidates.append({
                "title": f"{prior['label']} in {d['name']}",
                "category": cat, "district_id": d["id"], "district": d["name"],
                "lat": d["lat"], "lng": d["lng"],
                "budget_usd": prior["cost"], "town_cost_usd": town_cost,
                "months": prior["months"], "grant_match_pct": prior["grant"],
                "constituent_mentions": mentions, "score": round(score, 3), **pred,
            })

    # Greedy knapsack on score per town dollar. Fine for a few dozen candidates.
    picks, left = [], budget
    for c in sorted(candidates, key=lambda c: c["score"] / c["town_cost_usd"], reverse=True):
        if c["town_cost_usd"] <= left:
            picks.append(c)
            left -= c["town_cost_usd"]
    return picks
