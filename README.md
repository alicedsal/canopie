# canopy

a planning map for chapel hill, nc. it shows what the town has built and proposed, where the need is greatest, and which new projects would do the most good for a given budget and time span. residents shape the suggestions by texting an imessage agent or using the web form.

## what it does

- **maps projects.** completed, in-progress, proposed and rejected projects sit on a satellite map, with filters for each and a jump to any district.
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
| scoring | **rule-based, not trained.** `backend/ml/impact_engine.py` is hand-set formulas over location and project size. there is no before-and-after data on real projects to train on yet. |
| canopy and heat per cell | **placeholder.** interpolated from six hand-entered district figures, not read from satellite images. |
| projects on the map | **placeholder.** the seven seed projects are invented examples. |
| project costs and sizes | **placeholder.** typical figures chosen by hand in `backend/ml/priors.py`. |

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

**2. database.** this starts a local timescaledb and loads the schema and seed data on first run.

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
| `backend/app/services/gemini.py` | every gemini call: message analysis, rationales, agent replies. falls back quietly when rate limited. | gemini |
| `backend/ml/` | 100 m grid with neighbourhood features, need model, rule-based impact engine, ranking, survey data. | |
| `backend/ingest/` | loader for the usgs stream gauge. satellite and town-records loaders are not written. | |
| `db/` | schema with hypertables, continuous aggregates and compression, plus seed data. | tiger data |
| `agent/` | imessage agent on photon spectrum. `npm run chat` runs it in the terminal for testing without an apple device. | photon, community |
| `chapel-hill-spatial-gbdt-impact-engine/` | the original standalone prototype of the scoring engine. the app does not run it; its formulas were ported to `backend/ml/impact_engine.py`. | |
| `docs/PLAN.md` | build plan and checklist. | |
| `docs/MODEL.md` | what the model is and is not. | |
| `improvements_to_model.txt` | the model design document. | |
| `2026chapelhill_findingsreport_062926.pdf` | the community survey report. | |

## built with

react, vite, google maps platform, fastapi, tiger data (timescaledb), google gemini, photon spectrum.
