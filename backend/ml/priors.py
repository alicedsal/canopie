"""Intervention catalogue + prior effect sizes.

PLACEHOLDER NUMBERS. They do three jobs until real data replaces them:
  1. templates for candidate generation (cost, duration),
  2. fallback scores when no trained model exists,
  3. the centre of the synthetic samples train.py adds when real history is thin.
Replace with literature / Chapel Hill figures in docs/PLAN.md phase 4 and cite sources in the README.

d_ndvi: change in NDVI, d_lst: change in land surface temp (F), d_flood: change in flood-risk index (0..1),
reach: share of district residents affected, approve: prior approval probability.
"""

CATEGORIES: dict[str, dict] = {
    "tree_canopy":    dict(label="Tree planting",          cost=150_000,   months=6,  grant=0,  d_ndvi=0.04, d_lst=-1.5, d_flood=-0.03, reach=0.35, approve=0.75),
    "cool_pavement":  dict(label="Cool pavement",          cost=400_000,   months=8,  grant=0,  d_ndvi=0.00, d_lst=-2.0, d_flood=0.00,  reach=0.30, approve=0.55),
    "stormwater":     dict(label="Stormwater wetland",     cost=900_000,   months=18, grant=75, d_ndvi=0.02, d_lst=-0.4, d_flood=-0.15, reach=0.25, approve=0.50),
    "lighting":       dict(label="Pedestrian lighting",    cost=200_000,   months=4,  grant=0,  d_ndvi=0.00, d_lst=0.0,  d_flood=0.00,  reach=0.40, approve=0.70),
    "bike_ped":       dict(label="Bike / sidewalk link",   cost=600_000,   months=12, grant=20, d_ndvi=0.00, d_lst=-0.1, d_flood=0.00,  reach=0.30, approve=0.55),
    "revitalization": dict(label="Area revitalization",    cost=1_200_000, months=24, grant=0,  d_ndvi=0.01, d_lst=-0.2, d_flood=0.00,  reach=0.50, approve=0.40),
}

IMPACT_TARGETS = ["d_ndvi", "d_lst", "d_flood"]
