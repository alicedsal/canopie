# Ingest

One script per source. Each writes to `observations` (time series) or `projects` (records) and is safe to re-run.

| Script | Source | Writes | State |
| --- | --- | --- | --- |
| `nwis.py` | USGS NWIS gauge 02097000 | `gauge_height_ft`, `discharge_cfs` | written, untested against live API |
| `sentinel_ndvi.py` | Copernicus Sentinel-2 B04/B08 (STAC) | `ndvi` per district | TODO |
| `landsat_lst.py` | Landsat 9 TIRS Band 10 | `lst_f` per district | TODO |
| `viirs.py` | VIIRS Day/Night Band | `radiance` per district | TODO (stretch) |
| `chapel_hill_cip.py` | Town of Chapel Hill ArcGIS REST + CIP | `projects`, district boundaries | TODO |

NDVI = (B08 - B04) / (B08 + B04), averaged over each district polygon.

Satellite pulls are slow and rate-limited. Pull once, cache under `data/raw/` (gitignored), and load from the cache.
