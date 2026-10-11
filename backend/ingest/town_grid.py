"""Build the real 100 m town grid: python -m ingest.town_grid

Writes backend/ml/data/town_grid.json, which ml/grid.py reads at startup. Sources, all public:

  town limits   Town of Chapel Hill GIS, OpenData/Corporate_Limits
  canopy        Sentinel-2 L2A, NDVI = (B08 - B04) / (B08 + B04), averaged to each cell
  heat          Landsat 8/9 Collection 2 Level 2 surface temperature (band 10), averaged to each cell
  streams       Town of Chapel Hill Stormwater Division stream centerlines, distance from each cell
  population    Town of Chapel Hill GIS Population_Density raster, sampled at each cell centre

Satellite scenes come from the Microsoft Planetary Computer catalogue, which serves the ESA
and USGS archives. Each is one cloud-free summer scene, so heat is a single hot afternoon,
not a seasonal average.
"""
import json
import math
import struct
from pathlib import Path

import httpx

from ml.grid import CELL_M, DATA_FILE, LAT_STEP, LNG_STEP

TOWN_GIS = "https://gis-portal.townofchapelhill.org/server/rest/services"
PC_DATA = "https://planetarycomputer.microsoft.com/api/data/v1/item"
SENTINEL_ITEM = "S2C_MSIL2A_20260701T155821_R097_T17SPV_20260701T211311"
LANDSAT_ITEM = "LC08_L2SP_016035_20260705_02_T1"
STREAM_CAP_M = 500
# The density raster's unit is not documented. People per square mile is assumed; the
# script prints the implied town population so the assumption can be checked.
SQ_MILES_PER_CELL = (CELL_M / 1609.344) ** 2

_http = httpx.Client(timeout=180, follow_redirects=True)


def town_limits() -> list[list[list[float]]]:
    r = _http.get(f"{TOWN_GIS}/OpenData/Corporate_Limits/MapServer/0/query",
                  params={"f": "json", "where": "1=1", "outSR": 4326, "returnGeometry": "true"})
    return r.json()["features"][0]["geometry"]["rings"]


def inside(lng: float, lat: float, rings: list) -> bool:
    """Even-odd ray casting across all rings, so holes in the town limits are respected."""
    hit = False
    for ring in rings:
        for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
            if (y1 > lat) != (y2 > lat) and lng < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
                hit = not hit
    return hit


def raster(collection: str, item: str, bbox: str, rows: int, cols: int, **params) -> list[list[float | None]]:
    """One band over bbox, averaged down to rows x cols. Row 0 is the northern edge."""
    r = _http.get(f"{PC_DATA}/bbox/{bbox}/{cols}x{rows}.npy",
                  params={"collection": collection, "item": item, "resampling": "average", **params})
    r.raise_for_status()
    raw = r.content
    header_len = struct.unpack("<H", raw[8:10])[0]
    header = raw[10:10 + header_len].decode()
    code = {"f8": "d", "f4": "f", "u2": "H", "i2": "h", "u1": "B"}[header.split("'descr': '")[1][1:3]]
    shape = tuple(int(n) for n in header.split("'shape': (")[1].split(")")[0].split(",") if n.strip())
    values = struct.unpack(f"<{math.prod(shape)}{code}", raw[10 + header_len:])
    size = rows * cols
    band, mask = values[:size], values[-size:] if shape[0] > 1 else None  # last band is the valid-data mask
    return [[None if (mask and not mask[i * cols + j]) or band[i * cols + j] != band[i * cols + j]
             else band[i * cols + j] for j in range(cols)] for i in range(rows)]


def stream_points() -> list[tuple[float, float]]:
    """Stream centerline vertices, densified so no two are more than about 30 m apart."""
    points, offset = [], 0
    while True:
        r = _http.get(f"{TOWN_GIS}/OpenData/Streams/MapServer/0/query",
                      params={"f": "json", "where": "1=1", "outSR": 4326, "returnGeometry": "true",
                              "outFields": "OBJECTID", "geometryPrecision": 6,
                              "resultOffset": offset, "resultRecordCount": 2000, "orderByFields": "OBJECTID"})
        features = r.json().get("features", [])
        for f in features:
            for path in f.get("geometry", {}).get("paths", []):
                for (x1, y1), (x2, y2) in zip(path, path[1:]):
                    steps = max(1, int(math.hypot((x2 - x1) / LNG_STEP, (y2 - y1) / LAT_STEP) * CELL_M / 30))
                    points.extend((x1 + (x2 - x1) * t / steps, y1 + (y2 - y1) * t / steps) for t in range(steps + 1))
        if len(features) < 2000:
            return points
        offset += 2000


def population_density(centres: list[tuple[float, float]]) -> list[float]:
    out = []
    for start in range(0, len(centres), 400):
        geometry = {"points": [[lng, lat] for lat, lng in centres[start:start + 400]],
                    "spatialReference": {"wkid": 4326}}
        r = _http.post(f"{TOWN_GIS}/Population_Density/ImageServer/getSamples",
                       data={"f": "json", "geometry": json.dumps(geometry),
                             "geometryType": "esriGeometryMultipoint", "returnFirstValueOnly": "true"})
        by_id = {s["locationId"]: s.get("value") for s in r.json()["samples"]}
        out.extend(_number(by_id.get(i)) for i in range(len(geometry["points"])))
    return out


def _number(value) -> float:
    """Raster samples arrive as strings; cells with no data arrive empty or as 'NoData'."""
    try:
        return max(0.0, float(value))
    except (TypeError, ValueError):
        return 0.0


def main() -> None:
    rings = town_limits()
    xs = [p[0] for ring in rings for p in ring]
    ys = [p[1] for ring in rings for p in ring]
    lat0, lng0 = min(ys), min(xs)
    rows, cols = math.ceil((max(ys) - lat0) / LAT_STEP), math.ceil((max(xs) - lng0) / LNG_STEP)
    bbox = f"{lng0},{lat0},{lng0 + cols * LNG_STEP},{lat0 + rows * LAT_STEP}"
    centre = lambda i, j: (lat0 + (i + 0.5) * LAT_STEP, lng0 + (j + 0.5) * LNG_STEP)
    keys = [(i, j) for i in range(rows) for j in range(cols) if inside(centre(i, j)[1], centre(i, j)[0], rings)]
    print(f"{len(keys)} cells inside the town limits ({rows} x {cols} frame)")

    ndvi = raster("sentinel-2-l2a", SENTINEL_ITEM, bbox, rows, cols,
                  expression="(B08-B04)/(B08+B04)", asset_as_band="true")
    lwir = raster("landsat-c2-l2", LANDSAT_ITEM, bbox, rows, cols, assets="lwir11")
    print("satellite rasters fetched")

    buckets: dict[tuple[int, int], list[tuple[float, float]]] = {}
    for lng, lat in stream_points():
        buckets.setdefault((int((lat - lat0) / LAT_STEP), int((lng - lng0) / LNG_STEP)), []).append((lat, lng))
    reach = STREAM_CAP_M // CELL_M
    print(f"stream vertices bucketed into {len(buckets)} cells")

    density = population_density([centre(i, j) for i, j in keys])
    print(f"implied town population: {sum(density) * SQ_MILES_PER_CELL:,.0f}")

    cells = []
    for (i, j), dens in zip(keys, density):
        lat, lng = centre(i, j)
        nearest = STREAM_CAP_M
        for di in range(-reach, reach + 1):
            for dj in range(-reach, reach + 1):
                for s_lat, s_lng in buckets.get((i + di, j + dj), ()):
                    nearest = min(nearest, math.hypot((s_lat - lat) / LAT_STEP, (s_lng - lng) / LNG_STEP) * CELL_M)
        v, dn = ndvi[rows - 1 - i][j], lwir[rows - 1 - i][j]
        # Landsat Collection 2 surface temperature: Kelvin = DN * 0.00341802 + 149.0; DN 0 is no data.
        lst_f = round((dn * 0.00341802 + 149.0 - 273.15) * 9 / 5 + 32, 1) if dn else None
        cells.append([i, j, None if v is None else round(v, 3), lst_f, round(nearest), round(dens * SQ_MILES_PER_CELL, 2)])

    DATA_FILE.parent.mkdir(exist_ok=True)
    DATA_FILE.write_text(json.dumps({
        "meta": {
            "town_limits": "Town of Chapel Hill GIS, OpenData/Corporate_Limits",
            "ndvi": f"Sentinel-2 L2A {SENTINEL_ITEM} ({SENTINEL_ITEM[11:19]})",
            "lst_f": f"Landsat Collection 2 Level 2 surface temperature {LANDSAT_ITEM} ({LANDSAT_ITEM[17:25]})",
            "stream_m": f"Town of Chapel Hill stream centerlines; distance capped at {STREAM_CAP_M} m",
            "population": "Town of Chapel Hill GIS Population_Density raster, assumed people per square mile",
        },
        "frame": {"lat0": lat0, "lng0": lng0, "rows": rows, "cols": cols},
        "columns": ["row", "col", "ndvi", "lst_f", "stream_m", "population"],
        "cells": cells,
    }, separators=(",", ":")), encoding="utf-8")
    known = [c for c in cells if c[2] is not None and c[3] is not None]
    print(f"wrote {DATA_FILE} ({len(known)} of {len(cells)} cells have both NDVI and temperature)")
    print(f"NDVI {min(c[2] for c in known)}..{max(c[2] for c in known)}, "
          f"surface temperature {min(c[3] for c in known)}..{max(c[3] for c in known)} F")


if __name__ == "__main__":
    main()
