# The model, and how it lines up with the design document

`improvements_to_model.txt` (repo root) describes the target: a spatially aware gradient-boosting system. This page says which parts of it exist in the code, which do not, and why. Use it for the pitch so nothing is overclaimed.

**One-line honest description:** a rule-based need and impact scoring system on a 100 m grid with spatial neighbourhood features and a transparent ranking function. Nothing in it is trained on data yet.

## What is built

| Document section | In the code | Where |
| --- | --- | --- |
| 1. Two questions: need vs impact | Two separate models. Need scores each cell; impact scores a project at a cell against a no-project baseline. | `backend/ml/need.py`, `backend/ml/impact_engine.py` |
| 1. Separate outcomes, combined in a transparent ranking function | Six outcomes (flood, heat, mobility, canopy, lighting, housing) are predicted separately. `rank()` combines them with stated weights and scales, and every suggestion returns each outcome's contribution. | `backend/ml/suggest.py` |
| 2. 100 m grid | 2,168 cells of 100 m. | `backend/ml/grid.py` |
| 5.1 Queen adjacency, 5.2 distance bands (250 m, 500 m, inverse distance, row-standardised) | Same weights, computed directly on the regular grid. | `backend/ml/grid.py` |
| 6.1 Spatial lags and local differences | `*_lag_q`, `*_lag_250`, `*_lag_500`, `*_local_difference` for NDVI, surface temperature and night radiance. The need model uses them. | `backend/ml/grid.py`, `backend/ml/need.py` |
| 3.6 Project "dosage" features | Canopy added, retention added, bike length added, lighting, affordable units, scaled by budget. | `backend/ml/priors.py` |
| 4. Targets relative to no-project baseline | Heat, NDVI and runoff change are reported against the same location with nothing built. | `backend/ml/suggest.py` (`predict`) |

## Real data in the system

The only measured data so far is the 2026 Town of Chapel Hill Community Survey (ETC Institute, 421 households), in `backend/ml/survey.py` with page references. It drives "Constituent voice": each project category takes the Importance-Satisfaction rating of the closest survey item as its town-wide baseline, and resident messages add to it per district. Two matches are weak and flagged in the file: tree planting uses the parks and greenways item as a proxy, and the housing rating is computed with the report's formula because the report does not publish one.

The survey figures hard-coded in B's prototype (`SURVEY_2026_BENCHMARKS`: 1,284 respondents, housing as the top priority at 61% dissatisfied) do not match the report and are not used. The engine's "satisfaction shift" outputs were tuned to those figures, so they are not shown in the UI.

## What is not built, and what it would take

| Document section | Status | Blocker |
| --- | --- | --- |
| Gradient-boosted models (XGBoost / LightGBM), one per outcome | Not built. Outcomes come from hand-set formulas. | Needs before/after measurements for completed projects (section 4's `project_id x cell x pre/post period` table). There is no such data yet, and a model fitted to our own formulas would only be a copy of them. |
| 2. Grid clipped to the municipal boundary | Approximated: cells within 1.2 km of a district centre. | Boundary polygon from the town's GIS service. |
| 3.2 Real per-cell environmental features | Not built. Cell values are interpolated from six hand-entered district figures. | Sentinel-2 and Landsat rasters aggregated per cell. `grid._baseline()` is the one function to replace. |
| 3.1 Population and equity per cell | Not built. District population is spread by a fixed share. | Census block-group data. |
| 3.3 Hydrology beyond gauge distance | Not built. Flood need is creek sub-basin plus distance to the Booker Creek gauge. | Rainfall, elevation, impervious surface, flood incidents. |
| 3.4, 3.5 Transport, safety, planning features | Not built, so those need domains are not scored at all rather than guessed. | Crash, sidewalk, transit and zoning layers. |
| 5.3 to 5.5 KNN, watershed and network weights | Not built. | Drainage network and street network graphs. |
| 6.2 Local Moran clusters and later sections | Not built. The document as committed stops mid-section 6.2. | PySAL (`esda`); adds a heavy install. |
| Monthly or quarterly time unit | Not built. The grid is a single snapshot. | A `cell_id x period` hypertable in Tiger Data is the natural home. |

## Swapping in a trained model later

`predict()` in `backend/ml/suggest.py` is the only place the app asks for outcomes. A trained model per outcome replaces the six lines that build `outcomes` there; the grid, need model, ranking function, API and UI stay as they are.
