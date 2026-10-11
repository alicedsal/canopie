"""Parity check against B's TypeScript engine: python -m ml.test_impact_engine

Expected values were produced by running predictProjectImpact() from
chapel-hill-spatial-gbdt-impact-engine on its own INITIAL_PROJECTS.
"""
from .impact_engine import predict_impact

PROTOTYPE_CEILING = 22_000_000  # the prototype's unsourced figure, used here only to compare formulas

# (lat, lng, cost, fema, ncdot, canopy_sqft, retention_acres, bike_miles, units, lumens) -> (alignment, d_ndvi, d_lst_f)
CASES = [
    ((35.9392, -79.0285, 4_850_000, True, False, 65_000, 4.2, 0.8, 0, 8_500), (71, 0.143, -4.5)),
    ((35.9132, -79.0558, 3_200_000, False, True, 38_000, 0.9, 2.4, 0, 32_000), (59, 0.052, -3.0)),
    ((35.9185, -79.0620, 6_400_000, False, False, 18_000, 1.1, 0.5, 38, 14_000), (70, 0.038, -1.8)),
    ((35.9324, -79.0182, 2_950_000, True, True, 140_000, 2.6, 1.2, 16, 22_000), (78, 0.178, -10.0)),
    ((35.9525, -79.0560, 2_400_000, True, True, 52_000, 1.8, 3.1, 0, 18_000), (67, 0.083, -2.5)),
]

KEYS = ["capital_cost", "fema", "ncdot", "canopy_sqft", "retention_acres", "bike_miles", "affordable_units", "lumens"]

if __name__ == "__main__":
    for args, expected in CASES:
        out = predict_impact(args[:2], dict(zip(KEYS, args[2:])), budget_ceiling=PROTOTYPE_CEILING)
        got = (out["alignment_score"], out["delta_ndvi"], out["delta_lst_f"])
        assert got == expected, (args, got, expected)
    print(f"{len(CASES)} cases match the TypeScript engine")
