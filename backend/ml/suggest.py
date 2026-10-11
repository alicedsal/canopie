"""Generate candidate projects, score them, and pick the best set that fits the budget.

Follows improvements_to_model.txt, section 1: outcomes are predicted separately, then
combined in a transparent ranking function (OUTCOME_WEIGHTS and OUTCOME_SCALE below),
never in one opaque score. Every pick carries its per-outcome contributions.
"""
from .grid import DISTRICT_RADIUS_M, cell_at, cells
from .impact_engine import DISTRICTS, haversine_m, predict_impact
from .need import blended, need_scores
from .priors import CATEGORIES, SIZE_FIELDS
from .survey import SURVEY, demand_weight

MODEL_VERSION = "impact-engine-rules-2"

# How much each outcome counts in "Best impact". Hand-set from the town priorities listed
# in the design document (stormwater and transportation first). Tune with the team.
OUTCOME_WEIGHTS = {"flood": 0.25, "heat": 0.20, "mobility": 0.20, "canopy": 0.15, "lighting": 0.10, "housing": 0.10}
# The change that counts as a full point for each outcome, so different units can be added.
OUTCOME_SCALE = {"flood": 3.0,      # million gallons of runoff held back
                 "heat": 5.0,       # degrees F of cooling
                 "mobility": 15.0,  # points of bike/pedestrian safety satisfaction
                 "canopy": 0.10,    # NDVI gained
                 "lighting": 51.0,  # lighting index gained (scale runs 45..96)
                 "housing": 15.0}   # points of housing satisfaction
# Outcomes the need model covers are weighted by local need (0.5x to 1.5x).
NEED_DOMAIN = {"flood": "flood", "heat": "heat", "canopy": "canopy", "lighting": "lighting"}
# "Constituent voice": the town-wide survey sets the baseline (0..1 per category) and each
# resident message about that topic in that district adds this much on top.
MESSAGE_WEIGHT = 0.5


def predict(project: dict, district: dict) -> dict:
    """Score one project at a location with the rule-based impact engine, against a
    no-project baseline at the same place.

    project: category, budget_usd, optionally lat / lng (defaults to the district centre).
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
    site = cell_at(*loc)
    out = predict_impact(loc, engine_input, site)
    nothing = predict_impact(loc, {"capital_cost": 0, "fema": False, "ncdot": False,
                                   **{k: 0 for k in SIZE_FIELDS}}, site)
    # Residents living within 500 m of the site when the town grid has population;
    # otherwise a fixed share of the district's population.
    residents = (site or {}).get("residents_500m")
    if residents is None:
        residents = int(district["population"] * template["reach"])
    outcomes = {
        "flood": out["runoff_mgal"],
        "heat": -out["delta_lst_f"],
        "mobility": out["survey_delta_pct"]["bike_ped_safety"] - nothing["survey_delta_pct"]["bike_ped_safety"],
        "canopy": out["delta_ndvi"],
        "lighting": out["lighting_index"] - nothing["lighting_index"],
        "housing": max(0.0, out["survey_delta_pct"]["housing"] - nothing["survey_delta_pct"]["housing"]),
    }
    return {
        "model_version": MODEL_VERSION,
        "approval_prob": out["alignment_score"] / 100,
        "alignment_uplift": out["alignment_score"] - nothing["alignment_score"],
        "delta_ndvi": out["delta_ndvi"],
        "delta_lst_f": out["delta_lst_f"],
        "delta_flood_risk": None,  # the engine reports runoff held back instead, see runoff_mgal
        "runoff_mgal": out["runoff_mgal"],
        "constituents_affected": residents,
        "town_cost_usd": out["fiscal"]["net_town_cost"],
        "goals": out["goals"],
        "survey_delta_pct": out["survey_delta_pct"],
        "outcomes": {k: round(v, 3) for k, v in outcomes.items()},
    }


def rank(outcomes: dict, need: dict) -> tuple[float, dict]:
    """The transparent ranking function: weighted, need-adjusted sum of scaled outcomes.
    Returns the benefit and each outcome's contribution to it."""
    parts = {}
    for name, weight in OUTCOME_WEIGHTS.items():
        scaled = min(1.5, max(0.0, outcomes[name] / OUTCOME_SCALE[name]))
        need_factor = 0.5 + need[NEED_DOMAIN[name]] if name in NEED_DOMAIN else 1.0
        parts[name] = round(weight * scaled * need_factor, 4)
    return sum(parts.values()), parts


def _best_site(district: dict, need_weights: dict) -> tuple[dict, dict]:
    """The grid cell in this district where the project type's need is highest. Project
    types the need model does not cover go at the district centre."""
    centre = (district["lat"], district["lng"])
    engine_key = min(DISTRICTS, key=lambda k: haversine_m(centre, DISTRICTS[k][:2]))
    grid, scores = cells(), need_scores()
    local = [k for k, c in grid.items() if c["district"] == engine_key and c["centre_dist_m"] <= DISTRICT_RADIUS_M]
    if need_weights:
        key = max(local, key=lambda k: blended(scores[k], need_weights))
    else:
        key = min(local, key=lambda k: haversine_m(centre, (grid[k]["lat"], grid[k]["lng"])))
    return grid[key], scores[key]


def suggest(districts: list[dict], demand: list[dict], *, budget: float, horizon_months: int,
            mode: str = "balanced") -> list[dict]:
    """districts: rows with lat / lng / population.
    demand: rows of (district_id, topic, n) counted from constituent feedback (web form
    and iMessage)."""
    asks = {(r["district_id"], r["topic"]): r["n"] for r in demand}
    candidates = []
    for d in districts:
        for cat, template in CATEGORIES.items():
            if template["months"] > horizon_months:
                continue
            site, need = _best_site(d, template["need"])
            pred = predict({"category": cat, "budget_usd": template["cost"],
                            "lat": site["lat"], "lng": site["lng"]}, d)
            benefit, contributions = rank(pred["outcomes"], need)
            mentions = asks.get((d["id"], cat), 0)
            demand = demand_weight(cat) + MESSAGE_WEIGHT * mentions
            if mode == "constituent":
                # Constituent data and alignment only: survey priority plus local
                # messages. No outcome or need term.
                score = pred["approval_prob"] * demand
            else:
                score = benefit * pred["constituents_affected"] / 1000 * (1 + 0.1 * mentions)
            if score <= 0:
                continue
            candidates.append({
                "title": f"{template['label']} in {d['name']}",
                "category": cat, "district_id": d["id"], "district": d["name"],
                "lat": site["lat"], "lng": site["lng"], "cell_id": site["cell_id"],
                "budget_usd": template["cost"], "months": template["months"],
                "grant_match_pct": round((1 - pred["town_cost_usd"] / template["cost"]) * 100),
                "constituent_mentions": mentions, "constituent_demand": round(demand, 3),
                "survey": SURVEY.get(cat), "score": round(score, 3),
                "need": {k: round(v, 2) for k, v in need.items()},
                "contributions": contributions, **pred,
            })

    # Greedy knapsack on score per town dollar. Fine for a few dozen candidates.
    picks, left = [], budget
    for c in sorted(candidates, key=lambda c: c["score"] / c["town_cost_usd"], reverse=True):
        if c["town_cost_usd"] <= left:
            picks.append(c)
            left -= c["town_cost_usd"]
    return picks
