"""One featurizer shared by training and serving, so they cannot drift apart."""
import math

from .priors import CATEGORIES

FEATURES = [
    *[f"cat_{c}" for c in CATEGORIES],
    "log_budget", "months", "grant_match_pct",
    "district_ndvi", "district_lst_f", "district_sentiment", "log_population",
]


def featurize(project: dict, district: dict) -> list[float]:
    """project: category, budget_usd, months, grant_match_pct.
    district: ndvi, lst_f, sentiment (any may be None), population."""
    return [
        *[1.0 if project["category"] == c else 0.0 for c in CATEGORIES],
        math.log10(max(float(project["budget_usd"]), 1.0)),
        float(project["months"]),
        float(project.get("grant_match_pct") or 0),
        float(district.get("ndvi") or 0.5),
        float(district.get("lst_f") or 80.0),
        float(district.get("sentiment") or 0.0),
        math.log10(max(int(district["population"]), 1)),
    ]
