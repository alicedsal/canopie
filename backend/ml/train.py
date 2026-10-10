"""Train the two models and write them to ml/artifacts/.

    python -m ml.train

approval model: P(approved | project, district)        -> LogisticRegression
impact model:   (d_ndvi, d_lst, d_flood | project, ...) -> GradientBoosting, one per target

Labels:
  approval - projects with a decision (completed / in_progress = 1, rejected = 0)
  impact   - completed projects: district metric mean in the year after end_date minus
             the year before start_date (d_flood has no observed label yet, see TODO)

Chapel Hill alone has far too few decided projects to fit anything, so real rows are
topped up with synthetic rows drawn around ml/priors.py. The split is printed and saved
in the artifact so the demo can state it honestly.
"""
import datetime as dt
from pathlib import Path

import joblib
import numpy as np
import psycopg
from psycopg.rows import dict_row
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from app.config import settings

from .features import FEATURES, featurize
from .priors import CATEGORIES, IMPACT_TARGETS

ARTIFACTS = Path(__file__).parent / "artifacts"
N_SYNTHETIC = 600
REAL_WEIGHT = 20.0  # each real row counts this much more than a synthetic one

_REAL_ROWS = """
SELECT p.category, p.budget_usd, p.grant_match_pct, p.status, d.population,
       GREATEST(1, COALESCE((p.end_date - p.start_date) / 30, 12)) AS months,
       m.ndvi_before AS ndvi, m.lst_before AS lst_f,
       m.ndvi_after - m.ndvi_before AS d_ndvi,
       m.lst_after - m.lst_before AS d_lst
FROM projects p
JOIN districts d ON d.id = p.district_id
LEFT JOIN LATERAL (
    SELECT
      avg(value) FILTER (WHERE metric = 'ndvi'  AND time <  p.start_date AND time >= p.start_date - INTERVAL '1 year') AS ndvi_before,
      avg(value) FILTER (WHERE metric = 'ndvi'  AND time >  p.end_date   AND time <= p.end_date   + INTERVAL '1 year') AS ndvi_after,
      avg(value) FILTER (WHERE metric = 'lst_f' AND time <  p.start_date AND time >= p.start_date - INTERVAL '1 year') AS lst_before,
      avg(value) FILTER (WHERE metric = 'lst_f' AND time >  p.end_date   AND time <= p.end_date   + INTERVAL '1 year') AS lst_after
    FROM observations o WHERE o.district_id = p.district_id
) m ON true
WHERE p.status IN ('completed', 'in_progress', 'rejected') AND p.source <> 'model'
"""


def synthetic_rows(n: int, rng: np.random.Generator) -> list[dict]:
    rows = []
    for _ in range(n):
        cat = rng.choice(list(CATEGORIES))
        prior = CATEGORIES[cat]
        budget = prior["cost"] * rng.lognormal(0, 0.5)
        sentiment = rng.uniform(-1, 1)
        # Approval gets less likely as cost outgrows the template and more likely where
        # residents are unhappy with the status quo and outside money is available.
        logit = (np.log(prior["approve"] / (1 - prior["approve"]))
                 - 1.2 * np.log(budget / prior["cost"]) - 0.6 * sentiment + 0.01 * prior["grant"])
        scale = (budget / prior["cost"]) ** 0.5
        rows.append(dict(
            category=cat, budget_usd=budget, months=prior["months"] * rng.uniform(0.7, 1.4),
            grant_match_pct=prior["grant"], population=int(rng.integers(2000, 7000)),
            ndvi=rng.uniform(0.3, 0.7), lst_f=rng.uniform(70, 95), sentiment=sentiment,
            approved=int(rng.random() < 1 / (1 + np.exp(-logit))),
            d_ndvi=prior["d_ndvi"] * scale + rng.normal(0, 0.005),
            d_lst=prior["d_lst"] * scale + rng.normal(0, 0.2),
            d_flood=prior["d_flood"] * scale + rng.normal(0, 0.01),
        ))
    return rows


def real_rows() -> list[dict]:
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        rows = conn.execute(_REAL_ROWS).fetchall()
    for r in rows:
        r["approved"] = int(r["status"] != "rejected")
        r["sentiment"] = None  # TODO: district sentiment in the 90 days before the decision
        r["d_flood"] = None    # TODO: derive from NWIS gauge exceedance days before/after
    return rows


def main() -> None:
    rng = np.random.default_rng(0)
    real, synth = real_rows(), synthetic_rows(N_SYNTHETIC, rng)
    rows = real + synth
    weights = np.array([REAL_WEIGHT] * len(real) + [1.0] * len(synth))
    X = np.array([featurize(r, r) for r in rows])

    approval = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
    approval.fit(X, [r["approved"] for r in rows], logisticregression__sample_weight=weights)

    impact = {}
    for target in IMPACT_TARGETS:
        keep = [i for i, r in enumerate(rows) if r.get(target) is not None]
        impact[target] = GradientBoostingRegressor(random_state=0).fit(
            X[keep], [float(rows[i][target]) for i in keep], sample_weight=weights[keep])

    version = dt.datetime.now().strftime("%Y%m%d-%H%M")
    ARTIFACTS.mkdir(exist_ok=True)
    joblib.dump(
        {"version": version, "features": FEATURES, "approval": approval, "impact": impact,
         "n_real": len(real), "n_synthetic": len(synth)},
        ARTIFACTS / "model.joblib",
    )
    print(f"model {version}: {len(real)} real rows, {len(synth)} synthetic rows -> {ARTIFACTS / 'model.joblib'}")


if __name__ == "__main__":
    main()
