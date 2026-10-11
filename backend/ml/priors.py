"""Project templates used to generate suggestion candidates.

PLACEHOLDER NUMBERS, chosen by hand: a typical cost and duration per category, and what
that money buys (the inputs ml/impact_engine.py scores). Sizes scale linearly with budget.

reach: share of the district's residents affected. fema / ncdot: grant programmes the
category can draw on (75% and 50% match in the engine).
"""

CATEGORIES: dict[str, dict] = {
    "tree_canopy":        dict(label="Tree planting",        cost=300_000,   months=6,  reach=0.35, fema=False, ncdot=False,
                               canopy_sqft=40_000, retention_acres=0.0, bike_miles=0.0, affordable_units=0,  lumens=0),
    "stormwater":         dict(label="Stormwater wetland",   cost=1_500_000, months=18, reach=0.25, fema=True,  ncdot=False,
                               canopy_sqft=15_000, retention_acres=2.5, bike_miles=0.0, affordable_units=0,  lumens=0),
    "bike_ped":           dict(label="Bike / sidewalk link", cost=800_000,   months=12, reach=0.30, fema=False, ncdot=True,
                               canopy_sqft=8_000,  retention_acres=0.0, bike_miles=1.5, affordable_units=0,  lumens=8_000),
    "lighting":           dict(label="Pedestrian lighting",  cost=200_000,   months=4,  reach=0.40, fema=False, ncdot=False,
                               canopy_sqft=0,      retention_acres=0.0, bike_miles=0.0, affordable_units=0,  lumens=30_000),
    "greenway":           dict(label="Greenway extension",   cost=1_200_000, months=14, reach=0.35, fema=False, ncdot=True,
                               canopy_sqft=30_000, retention_acres=0.8, bike_miles=2.0, affordable_units=0,  lumens=10_000),
    "affordable_housing": dict(label="Affordable housing",   cost=3_000_000, months=24, reach=0.10, fema=False, ncdot=False,
                               canopy_sqft=8_000,  retention_acres=0.5, bike_miles=0.0, affordable_units=20, lumens=10_000),
}

SIZE_FIELDS = ["canopy_sqft", "retention_acres", "bike_miles", "affordable_units", "lumens"]
