"""Build the real 100 m town grid: python -m ingest.town_grid

Writes backend/ml/data/town_grid.json, which ml/grid.py reads at startup. Sources, all public:

  town limits   Town of Chapel Hill GIS, OpenData/Corporate_Limits
  canopy        Sentinel-2 L2A, NDVI = (B08 - B04) / (B08 + B04), averaged to each cell
  heat          Landsat 8/9 Collection 2 Level 2 surface temperature (band 10), averaged to each cell
  streams       Town of Chapel Hill Stormwater Division stream centerlines, distance from each cell
  population    Town of Chapel Hill GIS Population_Density raster, sampled at each cell centre
  night lights  NASA Black Marble (VIIRS Day/Night Band, gap-filled and moonlight-corrected
                radiance), averaged over several nights. Native resolution is about 500 m,
                so neighbouring cells share a value.

Satellite scenes come from the Microsoft Planetary Computer catalogue, which serves the ESA
and USGS archives. Each is one cloud-free summer scene, so heat is a single hot afternoon,
not a seasonal average.
"""
import json
import math
import re
import struct
import zlib
from pathlib import Path

import httpx

from ml.grid import CELL_M, DATA_FILE, LAT_STEP, LNG_STEP

TOWN_GIS = "https://gis-portal.townofchapelhill.org/server/rest/services"
PC_DATA = "https://planetarycomputer.microsoft.com/api/data/v1/item"
SENTINEL_ITEM = "S2C_MSIL2A_20260701T155821_R097_T17SPV_20260701T211311"
LANDSAT_ITEM = "LC08_L2SP_016035_20260705_02_T1"
GIBS = "https://gibs.earthdata.nasa.gov"
NIGHT_LAYER = "VIIRS_SNPP_GapFilled_BRDF_Corrected_DayNightBand_Radiance"
NIGHT_DATES = ["2026-06-20", "2026-06-27", "2026-07-04", "2026-07-08", "2026-07-20", "2026-07-27"]
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


def _png_rgba(raw: bytes) -> tuple[int, int, bytes]:
    """Decode a non-interlaced 8-bit RGBA PNG with the standard library only."""
    width, height, depth, colour = struct.unpack(">IIBB", raw[16:26])
    assert (depth, colour) == (8, 6), "expected 8-bit RGBA"
    data, pos = b"", 8
    while pos < len(raw):
        length, kind = struct.unpack(">I4s", raw[pos:pos + 8])
        if kind == b"IDAT":
            data += raw[pos + 8:pos + 8 + length]
        pos += 12 + length
    data, stride, out, prev = zlib.decompress(data), width * 4, bytearray(), bytes(width * 4)
    for y in range(height):
        f, line = data[y * (stride + 1)], bytearray(data[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for x in range(stride):
            a = line[x - 4] if x >= 4 else 0
            b, c = prev[x], prev[x - 4] if x >= 4 else 0
            if f == 1:
                line[x] = (line[x] + a) & 255
            elif f == 2:
                line[x] = (line[x] + b) & 255
            elif f == 3:
                line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                line[x] = (line[x] + min((a, b, c), key=lambda v: abs(p - v))) & 255
        out += line
        prev = bytes(line)
    return width, height, bytes(out)


def night_radiance(lat0: float, lng0: float, rows: int, cols: int) -> list[list[float | None]]:
    """Mean night-time radiance in nW/(cm2 sr) per cell. Row 0 is the northern edge.

    NASA GIBS serves the product as a grey-scale picture; its published colour map gives the
    radiance range each grey level stands for, and the middle of that range is used. The
    colour map tops out at about 38, so the very brightest cells are understated."""
    cmap = _http.get(f"{GIBS}/colormaps/v1.3/VIIRS_DayNightBand_At_Sensor_Radiance.xml").text
    levels = {}
    for grey, low, high in re.findall(r'rgb="(\d+),\d+,\d+" transparent="false" sourceValue="\[([\d.]+),([\d.]+)\)"', cmap):
        levels[int(grey)] = float(low) if float(high) > 1000 else (float(low) + float(high)) / 2
    greys = sorted(levels)
    totals = [[0.0] * cols for _ in range(rows)]
    counts = [[0] * cols for _ in range(rows)]
    for date in NIGHT_DATES:
        r = _http.get(f"{GIBS}/wms/epsg4326/best/wms.cgi", params={
            "SERVICE": "WMS", "REQUEST": "GetMap", "VERSION": "1.3.0", "LAYERS": NIGHT_LAYER, "CRS": "EPSG:4326",
            "BBOX": f"{lat0},{lng0},{lat0 + rows * LAT_STEP},{lng0 + cols * LNG_STEP}",
            "WIDTH": cols, "HEIGHT": rows, "FORMAT": "image/png", "TIME": date})
        r.raise_for_status()
        _, _, px = _png_rgba(r.content)
        for i in range(rows):
            for j in range(cols):
                grey, alpha = px[(i * cols + j) * 4], px[(i * cols + j) * 4 + 3]
                if alpha:
                    totals[i][j] += levels[min(greys, key=lambda g: abs(g - grey))]
                    counts[i][j] += 1
    return [[totals[i][j] / counts[i][j] if counts[i][j] else None for j in range(cols)] for i in range(rows)]


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
    night = night_radiance(lat0, lng0, rows, cols)
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
        glow = night[rows - 1 - i][j]
        cells.append([i, j, None if v is None else round(v, 3), lst_f, round(nearest),
                      round(dens * SQ_MILES_PER_CELL, 2), None if glow is None else round(glow, 2)])

    DATA_FILE.parent.mkdir(exist_ok=True)
    DATA_FILE.write_text(json.dumps({
        "meta": {
            "town_limits": "Town of Chapel Hill GIS, OpenData/Corporate_Limits",
            "ndvi": f"Sentinel-2 L2A {SENTINEL_ITEM} ({SENTINEL_ITEM[11:19]})",
            "lst_f": f"Landsat Collection 2 Level 2 surface temperature {LANDSAT_ITEM} ({LANDSAT_ITEM[17:25]})",
            "stream_m": f"Town of Chapel Hill stream centerlines; distance capped at {STREAM_CAP_M} m",
            "population": "Town of Chapel Hill GIS Population_Density raster, assumed people per square mile",
            "night_radiance": f"NASA Black Marble via GIBS, {NIGHT_LAYER}, mean of {len(NIGHT_DATES)} nights "
                              f"({NIGHT_DATES[0]} to {NIGHT_DATES[-1]}), nW/(cm2 sr), about 500 m native resolution",
        },
        "frame": {"lat0": lat0, "lng0": lng0, "rows": rows, "cols": cols},
        "columns": ["row", "col", "ndvi", "lst_f", "stream_m", "population", "night_radiance"],
        "cells": cells,
    }, separators=(",", ":")), encoding="utf-8")
    known = [c for c in cells if c[2] is not None and c[3] is not None]
    print(f"wrote {DATA_FILE} ({len(known)} of {len(cells)} cells have both NDVI and temperature)")
    glows = [c[6] for c in cells if c[6] is not None]
    print(f"night radiance {min(glows)}..{max(glows)} nW/(cm2 sr) on {len(glows)} cells")
    print(f"NDVI {min(c[2] for c in known)}..{max(c[2] for c in known)}, "
          f"surface temperature {min(c[3] for c in known)}..{max(c[3] for c in known)} F")


if __name__ == "__main__":
    main()
