"""100 m analysis grid with spatially lagged features (improvements_to_model.txt, sections 2 and 6.1).

Each cell carries baseline features from the impact engine plus neighbourhood summaries:
  *_lag_q    mean of the 8 adjacent cells (queen contiguity, row-standardised)
  *_lag_250  inverse-distance-weighted mean of cells within 250 m (row-standardised)
  *_lag_500  the same within 500 m
  *_local_difference  cell value minus its 250 m neighbourhood

These are the same weights the document builds with PySAL (Queen, DistanceBand with
alpha=-1). On a regular grid they reduce to fixed offsets, so they are computed directly
and the app needs no geospatial dependencies.

Limits, stated plainly: there is no municipal boundary file yet, so the grid is every cell
within COVERAGE_M of a district centre; and the baseline values are interpolated from six
hand-entered district figures, not read from satellite rasters. Replace `_baseline` with
real per-cell data and everything downstream keeps working.
"""
import math
from functools import lru_cache

from .impact_engine import CHAPEL_HILL_CENTER, DISTRICTS, haversine_m, location_features

CELL_M = 100
COVERAGE_M = 1200
LAGGED = ["ndvi", "lst_f", "viirs"]

_LAT_STEP = CELL_M / 111_320
_LNG_STEP = CELL_M / (111_320 * math.cos(math.radians(CHAPEL_HILL_CENTER[0])))


def _offsets(radius_m: float) -> list[tuple[int, int, float]]:
    """Grid offsets within radius_m, with row-standardisable inverse-distance weights."""
    n = int(radius_m // CELL_M)
    out = []
    for di in range(-n, n + 1):
        for dj in range(-n, n + 1):
            dist = math.hypot(di, dj) * CELL_M
            if 0 < dist <= radius_m:
                out.append((di, dj, 1 / dist))
    return out


_QUEEN = [(di, dj, 1.0) for di in (-1, 0, 1) for dj in (-1, 0, 1) if (di, dj) != (0, 0)]
_BANDS = {"lag_q": _QUEEN, "lag_250": _offsets(250), "lag_500": _offsets(500)}


def _baseline(lat: float, lng: float) -> dict:
    f = location_features((lat, lng))
    return {"ndvi": f["ndvi"], "lst_f": f["lst_f"], "viirs": f["viirs"],
            "gauge_dist_km": f["gauge_dist_km"], "watershed": f["watershed"]}


@lru_cache(maxsize=1)
def cells() -> dict[tuple[int, int], dict]:
    """All grid cells keyed by (row, col). Built once per process."""
    lats = [d[0] for d in DISTRICTS.values()]
    lngs = [d[1] for d in DISTRICTS.values()]
    pad_lat, pad_lng = COVERAGE_M / 111_320, COVERAGE_M / 111_320 / math.cos(math.radians(lats[0]))
    lat0, lng0 = min(lats) - pad_lat, min(lngs) - pad_lng
    rows = int((max(lats) + pad_lat - lat0) / _LAT_STEP) + 1
    cols = int((max(lngs) + pad_lng - lng0) / _LNG_STEP) + 1

    grid: dict[tuple[int, int], dict] = {}
    for i in range(rows):
        for j in range(cols):
            lat, lng = lat0 + (i + 0.5) * _LAT_STEP, lng0 + (j + 0.5) * _LNG_STEP
            nearest, dist = min(((k, haversine_m((lat, lng), d[:2])) for k, d in DISTRICTS.items()),
                                key=lambda kd: kd[1])
            if dist > COVERAGE_M:
                continue
            grid[(i, j)] = {"cell_id": f"r{i}c{j}", "lat": lat, "lng": lng, "district": nearest,
                            **_baseline(lat, lng)}

    for (i, j), cell in grid.items():
        for name, offsets in _BANDS.items():
            for var in LAGGED:
                total = weight = 0.0
                for di, dj, w in offsets:
                    other = grid.get((i + di, j + dj))
                    if other is not None:
                        total += other[var] * w
                        weight += w
                cell[f"{var}_{name}"] = total / weight if weight else cell[var]
        for var in LAGGED:
            cell[f"{var}_local_difference"] = cell[var] - cell[f"{var}_lag_250"]
    return grid


def cell_bounds(cell: dict) -> dict:
    return {"south": cell["lat"] - _LAT_STEP / 2, "north": cell["lat"] + _LAT_STEP / 2,
            "west": cell["lng"] - _LNG_STEP / 2, "east": cell["lng"] + _LNG_STEP / 2}
