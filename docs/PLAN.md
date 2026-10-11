# Build plan

Revised 2026-10-10 (evening). **What changed:** Chapel Hill's records of current projects turned out not to be usable as training data, so B built a model that predicts how effective a project would be at a location from population and geospatial data. The plan below is rebuilt around that model.

Roles after the change (swap if this is wrong): **B** owns the model and the location features it needs. **A** owns the app: backend, database, Gemini, agent, frontend.

**Short on time: A's order, none of it blocked on B.** Phase 4 (Gemini feedback), then phase 6 (iMessage agent), then phase 5 (the two suggestion lists side by side), then phase 7 (polish and demo). Phase 3's effectiveness layer comes after those, and only if there is time.

## What the change means

| Before | Now |
| --- | --- |
| Train on the town's past projects (approved or rejected, measured effects) | B's model predicts effectiveness from population and geospatial features |
| Loader for the town's project records was the first data task | Dropped. A handful of real projects are entered by hand, for map context only |
| "Approval probability" learned from past decisions | No decision history to learn from. Replaced by a transparent **feasibility score** (see phase 1) |
| Suggestions: one candidate per district per category | Candidates per map cell, scored by B's model, so the map can show *where* each kind of project works best |
| Satellite and gauge data were for charts | They are now model inputs first, charts second |

`backend/ml/train.py` and the effect sizes in `backend/ml/priors.py` were stand-ins for a model. Once B's model is in, `train.py` goes and `priors.py` keeps only cost and duration templates.

## Tracks (unchanged)

| Track | Where it lives | Must show in the demo |
| --- | --- | --- |
| Frutiger Aero | `frontend/src/styles/aero.css`, map UI | Glass panels, glossy buttons, bubble markers; canopy, heat and flood as the subject |
| Community | Feedback form, agent, "Constituent voice" mode | A resident's message visibly changing what the town is advised to build |
| Photon | `agent/` | Text the number live, get a reply, see the message land on the dashboard |
| Gemini | `backend/app/services/gemini.py` | Sentiment, topic and district extraction, plus council-packet rationales |
| Tiger Data | `db/01_schema.sql`, metrics endpoints | Location features and feedback in hypertables; charts from continuous aggregates |
| Snowflake | Stub only | Skip unless everything else is done (phase 8) |

## Phase 0: setup

- [x] Add teammate as collaborator
- [x] Keys: Google Maps, Gemini, Photon, Tiger Cloud
- [x] Docker database up, backend and frontend running, seed pins on the map
- [x] API contract: decided. The API already in the repo stays as it is (`frontend/src/api.ts` and the output of `predict()` in `backend/ml/suggest.py`). Nothing waits on a negotiation.
- [ ] Paste the keys into the local env files (`.env`, `frontend/.env.local`, `agent/.env`) and delete them from the shared Google Doc
- [ ] Pick a name (can wait until the Devpost write-up)

## Phase 1: B's model plugs into the existing API (B; A does not wait)

The app already runs end to end on the stand-in model, so A carries on with phases 3 to 7. B's model replaces the stand-in whenever it is ready, and if it is not ready the demo still works.

The one requirement for B: for a project (category, budget, duration) at a location, return these fields, which is what `predict()` returns today:

`approval_prob`, `delta_ndvi`, `delta_lst_f`, `delta_flood_risk`, `constituents_affected`

- [ ] B: push the model code and saved model to `backend/ml/` on a branch, with a function that returns those fields (any it cannot predict keep the stand-in value)
- [ ] B: add anything new to `backend/requirements.txt`
- [ ] A: point `predict()` at B's function (one edit, about ten lines)
- [ ] A: show `approval_prob` as "feasibility" in the UI text. The field name stays; the label changes because there is no decision history to back the word "probability".
- [ ] B: write three sentences on training data and validation for the README and the pitch
- [ ] Only after B's model is in: delete `ml/train.py` and trim `ml/priors.py`

Phase 2 (location features) is B's and is only needed for B's model. The seed data already feeds the charts.

## Phase 2: location features on Tiger Data (B data, A database)

Checkpoint: every map cell has the features the model needs, stored in Tiger Data.

- [ ] Both: fix the spatial unit to whatever B's model uses; add a `cells` table (id, lat, lng, district, population) if it is finer than districts
- [ ] B: load population (Census ACS block groups) into the database
- [ ] B: load the geospatial features the model uses (NDVI from Sentinel-2, surface temperature from Landsat, others) into `observations`, keyed by cell or district
- [ ] A: run `python -m ingest.nwis P30D` for the Booker Creek gauge and fix whatever the live API disagrees with
- [ ] A: run `db/01_schema.sql` on the Tiger Cloud service and point `DATABASE_URL` at it
- [ ] A: district panel with NDVI and temperature charts from `/api/districts/{id}/metrics`
- [ ] Note for the pitch: row count, compression ratio, raw versus aggregate query time

If B already has these features in files, load those files as they are. Do not rebuild the pipeline.

## Phase 3: the map (A)

Checkpoint: the map shows where each kind of project would work best.

- [ ] Effectiveness layer: pick a project type (trees, cool pavement, stormwater, lighting, bike/sidewalk), colour each cell by B's model score. Needs `GET /api/effectiveness?category=`.
- [ ] Status filter chips for the project pins
- [ ] Hand-enter 8 to 12 real Chapel Hill projects (done, in progress, proposed) from the town's capital plan into `db/02_seed.sql`, replacing the invented ones. Context for the map only, not training data.
- [ ] Project detail view: budget, dates, description, model score at that location, residents affected
- [ ] District fly-to buttons

## Phase 4: constituent voice with Gemini (A)

Checkpoint: submit a message on the web form, watch it get classified and appear.

- [ ] Put the Gemini key in `.env`, test `POST /api/feedback` with a dozen varied messages, tune the prompt until topics and districts are right
- [ ] Feedback feed with sentiment colour and topic chips
- [ ] Sentiment-over-time chart per district from `/api/sentiment`
- [ ] Set a real `SENDER_HASH_SALT`; phone numbers never go in the database

## Phase 5: suggestions (A, B advises on scoring)

Checkpoint: move the budget slider, watch the suggested pins change.

- [ ] Generate candidates per cell and project type instead of per district; keep the top few per type so the list stays short
- [ ] "Best impact" score = B's effectiveness x residents affected x feasibility
- [ ] "Constituent voice" score = how many residents asked for it nearby x feasibility, with no model term
- [ ] Show the two lists side by side; where they disagree is the story
- [ ] Running total against the budget ceiling
- [ ] Turn on `explain=true` so each card carries Gemini's two-sentence rationale, using only the model's numbers
- [ ] "Add to proposals" button

## Phase 6: iMessage agent (A)

Checkpoint: text the number, get an answer, see the message on the dashboard and the "Constituent voice" list shift.

- [ ] `npm install` in `agent/`, add Photon credentials, `npm run dev`, text the number and confirm a reply
- [ ] Develop against Spectrum's terminal provider so iteration does not depend on a phone
- [ ] Answer "what would help most near Booker Creek?" from the model's top suggestions for that area
- [ ] Put the number and a QR code on the web app
- [ ] Stretch: remember each sender's last district; text residents when something they asked for is proposed (with consent and opt-out)

## Phase 7: polish and demo (both)

- [ ] Bubbles, soft lens flares, glossy budget bars, leaf and water-drop category icons
- [ ] Check text contrast on the glass sidebar over bright satellite tiles
- [ ] Loading and error states for every panel
- [ ] Seed the demo with realistic messages
- [ ] 3-minute script: effectiveness layer by project type, district history, live text to the agent, budget slider, the two modes, how the model was built and checked
- [ ] Backup video
- [ ] Devpost: one paragraph and one screenshot per track
- [ ] Make the repo public before submitting (after confirming no keys were ever committed)

## Phase 8: Snowflake (optional)

Only if everything above is done.

- [ ] Student trial, access token, `SNOWFLAKE_*` variables
- [ ] Load 5 to 10 council minutes or capital-plan documents as text chunks
- [ ] Finish `services/snowflake_cortex.py`, add `POST /api/ask`
- [ ] "Ask the record" box on a project's detail view

## What to cut first

1. Phase 8 (Snowflake)
2. Hand-entered real projects (keep the effectiveness layer and suggestions)
3. Night-light data, agent memory and proactive texts
4. Sentiment-over-time chart
5. Gemini rationales on cards

Do not cut: B's model behind `predict()`, the effectiveness layer, the live text-in moment, the two suggestion modes.
