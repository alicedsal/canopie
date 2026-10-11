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
- [x] Keys pasted into the local env files (`.env`, `frontend/.env.local`, `agent/.env`)
- [ ] Delete the keys from the shared Google Doc
- [ ] Pick a name (can wait until the Devpost write-up)

## Phase 1: B's engine in the app (done)

B's engine turned out to be rule-based scoring (hand-set formulas), not a trained model. Its formulas are ported to `backend/ml/impact_engine.py` and drive `predict()`, suggestions and the agent. `python -m ml.test_impact_engine` checks the port against B's TypeScript original.

- [x] Port the scoring formulas to Python, matching B's outputs exactly
- [x] `predict()` uses the engine; stand-in model (`train.py`, `features.py`) deleted
- [x] UI shows the score as "alignment", not "approval"
- [x] "Best impact" ranks by alignment uplift over doing nothing x residents reached
- [ ] B: revoke the Google Maps key that was committed in `chapel-hill-spatial-gbdt-impact-engine/src/App.tsx` (removed from the file, still in git history)
- [ ] Both: in the pitch, call it a rule-based impact scoring engine. Do not claim GBDT, training or SHAP.
- [ ] Optional: reuse B's simulator panel and new-project form in `frontend/`
- [x] Aligned with B's design document where the data allows: 100 m grid, spatial lags, separate need model, per-outcome ranking. `docs/MODEL.md` lists what is and is not built.

## Phase 2: location features on Tiger Data (B data, A database)

Checkpoint: every map cell has the features the model needs, stored in Tiger Data.

- [x] Spatial unit fixed at 100 m cells (`backend/ml/grid.py`, in memory; a `cells` table in Tiger Data is optional)
- [ ] B: load population (Census ACS block groups) into the database
- [ ] B: load the geospatial features the model uses (NDVI from Sentinel-2, surface temperature from Landsat, others) into `observations`, keyed by cell or district
- [x] A: 30 days of real Booker Creek gauge readings loaded (USGS 02097386; the 02097000 in the early notes is the Haw River)
- [x] A: schema and seed loaded on the Tiger Cloud service; `DATABASE_URL` points at it
- [x] A: Booker Creek gauge chart in the sidebar, read from the `observations_daily` continuous aggregate
- [ ] Note for the pitch: row count, compression ratio, raw versus aggregate query time

If B already has these features in files, load those files as they are. Do not rebuild the pipeline.

## Phase 3: the map (A)

Checkpoint: the map shows where each kind of project would work best.

- [x] Need layer: heat, low canopy, flood, dark streets or overall, drawn as 100 m cells from `GET /api/need` (replaces the planned effectiveness layer)
- [x] Status filter chips for the project pins
- [ ] Hand-enter 8 to 12 real Chapel Hill projects (done, in progress, proposed) from the town's capital plan into `db/02_seed.sql`, replacing the invented ones. Context for the map only, not training data.
- [x] Project popup: status, district, budget, description, and scores where available
- [x] District fly-to buttons, and a Show button on each suggestion

## Phase 4: constituent voice with Gemini (A)

Checkpoint: submit a message on the web form, watch it get classified and appear.

- [x] Gemini key in `.env`; `POST /api/feedback` classifies topic, district and sentiment correctly on the messages tried
- [x] Feedback feed with sentiment colour and topics, refreshing every 8 seconds so texts appear live
- [ ] Sentiment-over-time chart per district from `/api/sentiment`
- [x] Real `SENDER_HASH_SALT` set locally; phone numbers never go in the database

## Phase 5: suggestions (A, B advises on scoring)

Checkpoint: move the budget slider, watch the suggested pins change.

- [x] Each candidate is sited at the highest-need 100 m cell in its district
- [x] "Best impact" score = six outcomes with stated weights, adjusted by local need, x residents reached
- [x] "Constituent voice" score = alignment x (2026 survey priority + messages in that district)
- [x] Each card says whether the other list agrees (the sidebar is too narrow for two columns)
- [x] Budget bar: town share committed against the budget
- [x] "Why?" button: Gemini's two-sentence rationale on demand, one call per click
- [x] "Add to proposals" button

## Phase 6: iMessage agent (A)

Checkpoint: text the number, get an answer, see the message on the dashboard and the "Constituent voice" list shift.

- [x] Agent installed, credentials added, connects to Photon
- [ ] Send one real iMessage from an Apple device and confirm a reply (neither of us has an iPhone)
- [x] `npm run chat` runs the agent on Spectrum's terminal provider; full loop confirmed
- [x] Agent answers "what would help most near Booker Creek?" from the top suggestions
- [ ] Put the agent's number in `frontend/.env.local` as `VITE_AGENT_NUMBER`; the number and QR code then appear in the sidebar
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
