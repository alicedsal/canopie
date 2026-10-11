# ingest

one script per source. each is safe to re-run. run them from `backend/` with the virtualenv's python, for example `.venv/bin/python -m ingest.town_grid`.

| script | what it loads | from | writes to |
| --- | --- | --- | --- |
| `town_grid.py` | town limits; tree canopy (ndvi); surface temperature; distance to nearest stream; population; night-time light, for every 100 m cell inside the town | see the table below | `backend/ml/data/town_grid.json` (ships with the repo) |
| `cip_projects.py` | the town's named capital projects, with locations | the town's capital improvements program page (names) and the town's gis (locations) | `projects` table |
| `nwis.py` | stream gauge height and discharge, every 15 minutes | usgs national water information system, gauge 02097386, booker creek at sr 1751 | `observations` hypertable, then refreshes the daily aggregate |

## sources behind `town_grid.py`

| value | source | detail |
| --- | --- | --- |
| town limits | town of chapel hill gis, `OpenData/Corporate_Limits` | the grid is the 5,653 cells whose centre is inside it |
| tree canopy | esa sentinel-2 l2a, scene of 1 july 2026 | ndvi = (b08 - b04) / (b08 + b04), averaged to each cell |
| surface temperature | usgs landsat 8 collection 2 level 2, scene of 5 july 2026 | band 10 surface temperature in °f. one hot afternoon, ground surface not air |
| streams | town of chapel hill stormwater division, `OpenData/Streams` | distance from each cell to the nearest centerline, capped at 500 m |
| population | town of chapel hill gis, `Population_Density` raster | unit is undocumented; people per square mile is assumed, giving a town total of about 57,600 |
| night-time light | nasa black marble, viirs day/night band, gap-filled and moonlight-corrected | mean of six nights, june to july 2026. about 500 m native resolution, so neighbouring cells share a value |

the two satellite scenes are read through the microsoft planetary computer catalogue, which mirrors the esa and usgs archives. night lights come from nasa gibs. none of these need an account or a key.

## what `cip_projects.py` can and cannot say

the town's capital improvements program page names six major projects and gives nothing else about them: no budget, no status, no dates, no location. so the script:

- leaves each budget empty, shown in the app as "budget not published". nothing is estimated.
- gives each the status `capital_program`, meaning only "named in the town's program".
- looks up each location in the town's own gis and says in the project's description what the pin stands for. two are assumptions: "ephesus road" is taken to be ephesus church rd, and the public works roof is taken to be the administration building at 6850 millhouse rd.
- leaves out fire apparatus replacement, which is on the town's list but is equipment with no location.

## looked for and not loaded

| source | why not |
| --- | --- |
| the town's capital projects map layer | needs a login |
| ncdot bike and pedestrian data | not attempted |
| fema data | not attempted |
| gauge 02097000 | this number, from early notes, is the haw river near pittsboro, not booker creek |
