# canopie

a planning map for chapel hill, nc. it shows what the town has built and proposed, where the need is greatest, and which new projects would do the most good for a given budget and time span. residents shape the suggestions by texting an imessage agent or using the web form.

## what it does

- **maps projects.** the town's named capital projects and any proposals you add sit on a satellite map, with filters for each and a jump to any district.
- **shows where the need is.** a 100 m grid over the town is scored for heat, low tree canopy, flood risk and dark streets, and drawn as a layer on the map.
- **suggests projects.** set a budget and a time span and it picks a set of projects that fits, each placed at the highest-need spot in its district. two lists are offered:
  - **best impact** ranks on six predicted outcomes (flood, heat, mobility, canopy, lighting, housing), weighted by local need and residents reached.
  - **constituent voice** ranks on what residents asked for: the town's 2026 community survey plus messages received about each topic in each district.
- **explains itself.** every suggestion says what it was ranked on and whether the other list agrees. a "why?" button asks gemini for a two-sentence case, and "add to proposals" puts it on the map.
- **listens.** residents write in through the web form or by texting the agent. gemini reads each message for topic, district and sentiment, and the suggestions update within seconds.
- **answers.** the agent replies to questions such as "what is planned for franklin st?" or "what would help most near booker creek?" from the project list and the current suggestions.

## what is real and what is not

| | status |
| --- | --- |
| resident priorities | **real.** the 2026 town of chapel hill community survey (etc institute, 421 households), with page references in `backend/ml/survey.py`. |
| stream gauge | **real.** 30 days of readings from usgs gauge 02097386, booker creek at sr 1751. |
| resident messages | **real** once people send them; four seed messages are examples. |
| scoring | **rule-based, not trained.** `backend/ml/impact_engine.py` is hand-set formulas over the measured values above and project size. there is no before-and-after data on real projects to train on yet. |
| tree canopy per cell | **real.** sentinel-2 satellite image of 1 july 2026, vegetation index averaged to each 100 m cell. |
| heat per cell | **real.** landsat 8 surface temperature of 5 july 2026, averaged to each 100 m cell. this is the ground surface on one hot afternoon, not air temperature or a seasonal average. |
| town limits | **real.** the town's own boundary; the grid is the 5,653 cells inside it. |
| streams | **real.** the town stormwater division's stream centerlines; flood need is closeness to the nearest one. |
| residents near a project | **real.** the town's population density map, summed within 500 m of each site. its unit is undocumented; people per square mile is assumed, which gives a town total of about 57,600. |
| night-time light | **real.** nasa black marble (viirs day/night band), mean of six nights in june and july 2026. this is light seen from orbit at about 500 m resolution, so it stands in for street lighting only roughly, and parks and woods read as dark. |
| budget | **real.** the slider is scaled to the town's 2024 bonds: $44 million approved by voters, $10.63 million issued in june 2025, from the town's capital improvements program page. |
| projects on the map | **real names and locations, nothing else.** five of the six major projects the town names in its capital improvements program, placed using the town's gis. the town's page publishes no budget, status or dates for them, so the app shows "budget not published". fire apparatus replacement is on the town's list but has no location. |
| suggested project costs and sizes | **estimates.** typical figures chosen by hand in `backend/ml/priors.py`, not taken from town budgets. |

`docs/MODEL.md` goes through the model design document section by section: what is built, what is not, and what data each missing piece needs.

## run it

you need docker, python 3.11 or newer, and node 20 or newer. the commands below are for macos and linux; on windows use `.venv/Scripts/` wherever you see `.venv/bin/`.

**1. keys.** copy the three example files and fill in what you have.

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp agent/.env.example agent/.env
```

| file | key | needed for |
| --- | --- | --- |
| `frontend/.env.local` | google maps javascript api key (and a map id, or leave `DEMO_MAP_ID`) | the map. required. |
| `.env` | gemini api key | reading resident messages, the "why?" button, agent replies. without it the app still runs and messages are saved as neutral. |
| `agent/.env` | photon spectrum project id and secret | the agent only. |

**2. database.** this starts a local timescaledb and loads the schema, the town's five capital projects and four example messages on first run.

```bash
docker compose up -d
```

**3. backend.** from `backend/`:

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload
```

it is up when http://localhost:8000/api/health returns `{"ok":true}`. the api is documented at http://localhost:8000/docs.

**4. frontend.** in a second terminal, from `frontend/`:

```bash
npm install
npm run dev
```

open http://localhost:5173.

**5. optional: real stream gauge data.** from `backend/`, this loads the last 30 days from the booker creek gauge and makes the gauge chart appear in the sidebar.

```bash
.venv/bin/python -m ingest.nwis P30D
```

the satellite and town data ships with the repo in `backend/ml/data/town_grid.json`. to rebuild it from the sources, run `.venv/bin/python -m ingest.town_grid` from `backend/` (about a minute).

**6. optional: the agent.** in a third terminal, from `agent/`:

```bash
npm install
npm run chat
```

`npm run chat` lets you talk to the agent by typing. `npm run dev` connects it to imessage instead, and then anyone can text the number shown in your photon dashboard.

**things to try:** turn on a need layer, drag the budget slider, switch between best impact and constituent voice, then send a message in "tell the town" and watch the constituent voice list change.

## how it fits together

```
 residents ── imessage ──> agent/ (photon spectrum) ──┐
 residents ── web form ───────────────────────────────┤
                                                      v
 usgs gauge ── backend/ingest ──> tiger data (postgres + timescaledb)
 satellites, town gis ── backend/ingest ──> backend/ml/data/town_grid.json
 town capital program ── backend/ingest ──> projects
                                    │   projects, districts
                                    │   observations + feedback hypertables
                                    │   continuous aggregates
                                    v
            backend/app (fastapi) ── gemini: topic, district, sentiment, rationales, replies
                    │              ── backend/ml: grid, need model, impact engine, ranking, survey
                    v
            frontend/ (react + google maps, frutiger aero ui)
```

## what is where

| folder | what | track |
| --- | --- | --- |
| `frontend/` | react + vite + google maps. glass ui in `src/styles/aero.css`. | frutiger aero |
| `backend/app/` | fastapi: projects, need layer, metrics, survey, feedback, suggestions, agent endpoint. | |
| `backend/app/services/gemini.py` | every gemini call: message analysis, rationales, agent replies. falls back quietly when rate limited. | gemini api |
| `backend/ml/` | 100 m grid of measured values with neighbourhood features, need model, rule-based impact engine, ranking, survey data. | |
| `backend/ingest/` | loaders for the town grid (sentinel-2, landsat, viirs night lights, town limits, streams, population), the town's capital projects and the usgs stream gauge. sources are listed in `backend/ingest/README.md`. | |
| `db/` | schema with hypertables, continuous aggregates and compression, plus seed data. | tiger data |
| `agent/` | imessage agent on photon spectrum. `npm run chat` runs it in the terminal for testing without an apple device. | photon, community |
| `chapel-hill-spatial-gbdt-impact-engine/` | the original standalone prototype of the scoring engine. the app does not run it; its formulas were ported to `backend/ml/impact_engine.py`. | |
| `docs/PLAN.md` | build plan and checklist. | |
| `docs/MODEL.md` | what the model is and is not. | |
| `improvements_to_model.txt` | the model design document. | |
| `2026chapelhill_findingsreport_062926.pdf` | the community survey report. | |

## built with

**languages:** python, typescript, sql, css.

**tools and services:** react, vite, google maps platform, fastapi, tiger data (timescaledb), gemini api, photon spectrum, claude code.
