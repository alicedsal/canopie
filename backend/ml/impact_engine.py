"""Rule-based impact scoring engine.

Python port of B's `chapel-hill-spatial-gbdt-impact-engine/src/ml/gbdtEngine.ts`, kept
formula-for-formula so both give the same numbers (checked by ml/test_impact_engine.py).

What it is: hand-set scoring rules over location features and project size. It is NOT a
trained model: the coefficients and the district baselines below were chosen by hand, not
fitted to data. Describe it that way in the demo. The TypeScript original also exposes
"SHAP values" and a "decision tree"; those are hard-coded there and are not ported.
"""
import math

CHAPEL_HILL_CENTER = (35.9132, -79.0558)
CIP_BUDGET_CEILING = 22_000_000

# id: (lat, lng, baseline NDVI, baseline surface temp F, night radiance). Hand-entered by B.
DISTRICTS = {
    "franklin-st":  (35.9132, -79.0558, 0.28, 92.4, 42.5),
    "booker-creek": (35.9392, -79.0285, 0.62, 79.2, 4.8),
    "blue-hill":    (35.9324, -79.0182, 0.19, 96.8, 38.2),
    "bolin-creek":  (35.9270, -79.0435, 0.76, 74.8, 2.1),
    "northside":    (35.9185, -79.0620, 0.44, 86.5, 14.3),
    "homestead-rd": (35.9525, -79.0560, 0.58, 81.3, 12.8),
}


def _js_round(x: float) -> int:
    return math.floor(x + 0.5)


def _clamp(x: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, x))


def haversine_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    r = 6371e3
    d_lat, d_lng = math.radians(b[0] - a[0]), math.radians(b[1] - a[1])
    h = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(a[0])) * math.cos(math.radians(b[0])) * math.sin(d_lng / 2) ** 2)
    return r * 2 * math.atan2(math.sqrt(h), math.sqrt(1 - h))


def location_features(loc: tuple[float, float]) -> dict:
    """Features of a point: closeness to each district centre and baselines interpolated from them."""
    gamma = 1 / (1200 * 1200)  # 1.2 km bandwidth
    rbf, weight_sum, ndvi, lst, viirs = {}, 0.0, 0.0, 0.0, 0.0
    for key, (lat, lng, d_ndvi, d_lst, d_viirs) in DISTRICTS.items():
        dist = haversine_m(loc, (lat, lng))
        rbf[key] = math.exp(-gamma * dist * dist)
        w = 1 / max(80, dist) ** 2  # inverse-distance weighting
        weight_sum += w
        ndvi += d_ndvi * w
        lst += d_lst * w
        viirs += d_viirs * w
    return {
        "rbf": rbf,
        "ndvi": ndvi / weight_sum,
        "lst_f": lst / weight_sum,
        "viirs": viirs / weight_sum,
        "gauge_dist_km": haversine_m(loc, DISTRICTS["booker-creek"][:2]) / 1000,
        "form_based_code": rbf["blue-hill"] > 0.45 or loc[1] > -79.03,
        "historic": rbf["northside"] > 0.45,
        "watershed": rbf["booker-creek"] > 0.35 or rbf["bolin-creek"] > 0.35,
    }


def predict_impact(loc: tuple[float, float], p: dict) -> dict:
    """p: capital_cost, fema, ncdot, canopy_sqft, retention_acres, bike_miles, affordable_units, lumens."""
    f = location_features(loc)
    rbf = f["rbf"]
    canopy = p["canopy_sqft"] / 100_000
    retention = p["retention_acres"]
    bike = p["bike_miles"]
    units = p["affordable_units"]

    # Five council-goal scores, 0-100
    env = 45 + canopy * 18 * (1.4 if f["lst_f"] > 88 else 1.0)
    env += retention * 6.5 * (1.5 if f["watershed"] else 0.8)
    env += (rbf["bolin-creek"] + rbf["booker-creek"]) * 8
    env = _clamp(env, 15, 98)

    housing = 30.0
    if units > 0:
        housing += min(50, units * 1.3)
        if f["historic"]:
            housing += 18
        if rbf["franklin-st"] > 0.4:
            housing += 8
    elif f["historic"]:
        housing -= 8
    housing = _clamp(housing, 10, 99)

    mobility = 40 + bike * 12.5
    if rbf["franklin-st"] > 0.45:
        mobility += 14
    if rbf["homestead-rd"] > 0.4:
        mobility += 12
    if rbf["bolin-creek"] > 0.4:
        mobility += 10
    mobility = _clamp(mobility, 15, 99)

    infra = 45 + retention * 9.2
    if f["gauge_dist_km"] < 1.2:
        infra += 16 * (1.3 if retention > 2 else 0.7)
    if p["fema"]:
        infra += 10
    infra = _clamp(infra, 20, 98)

    gross = p["capital_cost"]
    grant = min(gross * 0.85, (gross * 0.75 if p["fema"] else 0) + (gross * 0.5 if p["ncdot"] else 0))
    net = gross - grant
    cip_pct = net / CIP_BUDGET_CEILING * 100
    fiscal = 80.0
    if cip_pct > 25:
        fiscal -= (cip_pct - 25) * 1.4
    if grant > 0:
        fiscal += grant / gross * 22
    fiscal = _clamp(fiscal, 25, 98)

    alignment = _js_round(env * 0.25 + housing * 0.25 + mobility * 0.2 + infra * 0.15 + fiscal * 0.15)

    # Predicted shift in resident survey satisfaction, percentage points
    s_housing = round(units * 0.38 + (4.5 if f["historic"] else 1.2), 1) if units > 0 else -1.2
    s_bike = round(bike * 4.6 + (4.2 if rbf["franklin-st"] > 0.4 else 1.1), 1)
    s_storm = round(retention * 4.2 + (5.8 if f["watershed"] else 0.8), 1)
    s_green = round(bike * 2.8 + canopy * 3.4 + (4.1 if rbf["bolin-creek"] > 0.3 else 0.9), 1)
    s_equity = round((7.5 if f["historic"] else 1.5) + (5.2 if units > 0 else 0) + (2.3 if bike > 1 else 0), 1)
    s_overall = round(
        (s_housing * 0.3 + s_bike * 0.25 + s_storm * 0.2 + s_green * 0.15 + s_equity * 0.1) * 0.6, 1)

    heat = 1.6 if f["lst_f"] > 90 else 1.2 if f["lst_f"] > 85 else 0.8

    return {
        "alignment_score": alignment,
        "goals": {
            "environment": _js_round(env), "housing": _js_round(housing), "mobility": _js_round(mobility),
            "infrastructure": _js_round(infra), "fiscal": _js_round(fiscal),
        },
        "survey_delta_pct": {
            "overall": s_overall, "bike_ped_safety": s_bike, "stormwater": s_storm,
            "housing": s_housing, "greenways": s_green, "equity": s_equity,
        },
        "delta_ndvi": round(canopy * 0.09 + retention * 0.02, 3),
        "delta_lst_f": -round((canopy * 2.8 + retention * 0.9) * heat, 1),
        "runoff_mgal": round(retention * 0.92 + canopy * 0.35, 2),
        "lighting_index": _js_round(min(96, 45 + p["lumens"] / 35_000 * 48)),
        "equity_score": _js_round(min(99, 40 + (32 if f["historic"] else 10) + units * 0.9 + bike * 5)),
        "streets_safety_score": _js_round(min(
            99, 35 + bike * 14 + (18 if rbf["franklin-st"] > 0.4 else 6) + (12 if f["form_based_code"] else 5))),
        "fiscal": {"gross_cost": gross, "grants": grant, "net_town_cost": net,
                   "cip_utilization_pct": round(cip_pct, 1)},
        "baseline": {"ndvi": round(f["ndvi"], 3), "lst_f": round(f["lst_f"], 1)},
    }
