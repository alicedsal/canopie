"""100 m analysis grid with spatially lagged features (improvements_to_model.txt, sections 2 and 6.1).

When ml/data/town_grid.json exists (built by `python -m ingest.town_grid`), the grid is
every 100 m cell inside the real town limits, carrying measured values:
  ndvi         Sentinel-2
  lst_f        Landsat surface temperature
  stream_m     distance to the nearest mapped stream
  population   residents in the cell, from the town's population density raster
Without that file it falls back to cells near the district centres with values
interpolated from six hand-entered district figures, so a fresh clone still runs.

Night-time radiance (`viirs`) is interpolated in both cases; no real source is loaded yet.

Every cell also gets neighbourhood summaries:
  *_lag_q    mean of the 8 adjacent cells (queen contiguity, row-standardised)
  *_lag_250  inverse-distance-weighted mean of cells within 250 m (row-standardised)
  *_lag_500  the same within 500 m
  *_local_difference  cell value minus its 250 m neighbourhood
These are the weights the design document builds with PySAL (Queen, DistanceBand with
alpha=-1). On a regular grid they reduce to fixed offsets, so they are computed directly.
"""
import json
import math
from functools import lru_cache
from pathlib import Path

from .impact_engine import CHAPEL_HILL_CENTER, DISTRICTS, haversine_m, location_features

CELL_M = 100
DISTRICT_RADIUS_M = 1200  # how far from its centre a district is taken to extend
LAGGED = ["ndvi", "lst_f", "viirs"]
DATA_FILE = Path(__file__).parent / "data" / "town_grid.json"

LAT_STEP = CELL_M / 111_320
LNG_STEP = CELL_M / (111_320 * math.cos(math.radians(CHAPEL_HILL_CENTER[0])))


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
_RESIDENT_OFFSETS = [(0, 0), *[(di, dj) for di, dj, _ in _offsets(500)]]


@lru_cache(maxsize=1)
def _data() -> dict | None:
    return json.loads(DATA_FILE.read_text(encoding="utf-8")) if DATA_FILE.exists() else None


def source() -> dict | None:
    """Where the measured cell values came from, or None when running on the fallback."""
    data = _data()
    return data["meta"] if data else None


def _frame() -> tuple[float, float]:
    data = _data()
    if data:
        return data["frame"]["lat0"], data["frame"]["lng0"]
    pad = DISTRICT_RADIUS_M / 111_320
    return (min(d[0] for d in DISTRICTS.values()) - pad,
            min(d[1] for d in DISTRICTS.values()) - pad / math.cos(math.radians(CHAPEL_HILL_CENTER[0])))


def _cell(i: int, j: int, measured: dict) -> dict:
    lat0, lng0 = _frame()
    lat, lng = lat0 + (i + 0.5) * LAT_STEP, lng0 + (j + 0.5) * LNG_STEP
    f = location_features((lat, lng))
    nearest, dist = min(((k, haversine_m((lat, lng), d[:2])) for k, d in DISTRICTS.items()), key=lambda kd: kd[1])
    cell = {"cell_id": f"r{i}c{j}", "lat": lat, "lng": lng, "district": nearest, "centre_dist_m": dist,
            "ndvi": f["ndvi"], "lst_f": f["lst_f"], "viirs": f["viirs"],
            "gauge_dist_km": f["gauge_dist_km"], "watershed": f["watershed"],
            "stream_m": None, "population": None}
    cell.update({k: v for k, v in measured.items() if v is not None})
    return cell


@lru_cache(maxsize=1)
def cells() -> dict[tuple[int, int], dict]:
    """All grid cells keyed by (row, col). Built once per process."""
    data = _data()
    if data:
        grid = {(i, j): _cell(i, j, {"ndvi": ndvi, "lst_f": lst_f, "stream_m": stream_m, "population": pop})
                for i, j, ndvi, lst_f, stream_m, pop in data["cells"]}
    else:
        reach = int(DISTRICT_RADIUS_M / CELL_M) * 2 + 2
        lat0, lng0 = _frame()
        rows = int((max(d[0] for d in DISTRICTS.values()) - lat0) / LAT_STEP) + reach
        cols = int((max(d[1] for d in DISTRICTS.values()) - lng0) / LNG_STEP) + reach
        grid = {}
        for i in range(rows):
            for j in range(cols):
                cell = _cell(i, j, {})
                if cell["centre_dist_m"] <= DISTRICT_RADIUS_M:
                    grid[(i, j)] = cell

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
        if cell["population"] is not None:
            cell["residents_500m"] = round(sum(
                (grid.get((i + di, j + dj)) or {}).get("population") or 0 for di, dj in _RESIDENT_OFFSETS))
    return grid


def cell_at(lat: float, lng: float) -> dict | None:
    lat0, lng0 = _frame()
    return cells().get((int((lat - lat0) / LAT_STEP), int((lng - lng0) / LNG_STEP)))


def cell_bounds(cell: dict) -> dict:
    return {"south": cell["lat"] - LAT_STEP / 2, "north": cell["lat"] + LAT_STEP / 2,
            "west": cell["lng"] - LNG_STEP / 2, "east": cell["lng"] + LNG_STEP / 2}
