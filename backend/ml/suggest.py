"""Generate candidate projects, score them, and pick the best set that fits the budget."""
from .impact_engine import predict_impact
from .priors import CATEGORIES, SIZE_FIELDS

MODEL_VERSION = "impact-engine-rules-1"


def predict(project: dict, district: dict) -> dict:
    """Score one project at a location with the rule-based impact engine.

    project: category, budget_usd, optionally lat / lng (defaults to the district centre).
    Returns the flat fields the API has always exposed, plus the engine's extra detail.
    approval_prob is the engine's council-goal alignment score scaled to 0..1; it is not a
    probability learned from past decisions, so the UI labels it "alignment".
    """
    template = CATEGORIES[project["category"]]
    scale = float(project["budget_usd"]) / template["cost"]
    engine_input = {
        "capital_cost": float(project["budget_usd"]),
        "fema": template["fema"], "ncdot": template["ncdot"],
        **{k: template[k] * scale for k in SIZE_FIELDS},
    }
    loc = (project.get("lat") or district["lat"], project.get("lng") or district["lng"])
    out = predict_impact(loc, engine_input)
    # The engine scores a location even with nothing built there; the uplift over that
    # is what the project itself adds.
    nothing = predict_impact(loc, {"capital_cost": 0, "fema": False, "ncdot": False,
                                   **{k: 0 for k in SIZE_FIELDS}})
    return {
        "model_version": MODEL_VERSION,
        "approval_prob": out["alignment_score"] / 100,
        "alignment_uplift": out["alignment_score"] - nothing["alignment_score"],
        "delta_ndvi": out["delta_ndvi"],
        "delta_lst_f": out["delta_lst_f"],
        "delta_flood_risk": None,  # the engine reports runoff held back instead, see runoff_mgal
        "runoff_mgal": out["runoff_mgal"],
        "constituents_affected": int(district["population"] * template["reach"]),
        "town_cost_usd": out["fiscal"]["net_town_cost"],
        "goals": out["goals"],
        "survey_delta_pct": out["survey_delta_pct"],
    }


def suggest(districts: list[dict], demand: list[dict], *, budget: float, horizon_months: int,
            mode: str = "balanced") -> list[dict]:
    """districts: rows with lat / lng / population.
    demand: rows of (district_id, topic, n) counted from constituent feedback."""
    asks = {(r["district_id"], r["topic"]): r["n"] for r in demand}
    candidates = []
    for d in districts:
        for cat, template in CATEGORIES.items():
            if template["months"] > horizon_months:
                continue
            pred = predict({"category": cat, "budget_usd": template["cost"]}, d)
            mentions = asks.get((d["id"], cat), 0)
            if mode == "constituent":
                # Constituent demand and alignment only: no reach or uplift term.
                score = pred["approval_prob"] * mentions
            else:
                score = pred["alignment_uplift"] * pred["constituents_affected"] / 1000 * (1 + 0.1 * mentions)
            if score <= 0:
                continue
            candidates.append({
                "title": f"{template['label']} in {d['name']}",
                "category": cat, "district_id": d["id"], "district": d["name"],
                "lat": d["lat"], "lng": d["lng"],
                "budget_usd": template["cost"], "months": template["months"],
                "grant_match_pct": round((1 - pred["town_cost_usd"] / template["cost"]) * 100),
                "constituent_mentions": mentions, "score": round(score, 3), **pred,
            })

    # Greedy knapsack on score per town dollar. Fine for a few dozen candidates.
    picks, left = [], budget
    for c in sorted(candidates, key=lambda c: c["score"] / c["town_cost_usd"], reverse=True):
        if c["town_cost_usd"] <= left:
            picks.append(c)
            left -= c["town_cost_usd"]
    return picks
