# Build plan

Two people, **A** (data + ML + backend) and **B** (frontend + agent + demo). Phases are ordered so there is a demoable app after phase 1 and every later phase adds one track's worth of value. If time runs out, cut from the bottom.

## Tracks and what each one needs from us

| Track | What judges look for | Where it lives | Must-have for the demo |
| --- | --- | --- | --- |
| Frutiger Aero | The aesthetic, plus a real sustainability idea | `frontend/src/styles/aero.css`, map UI | Glass panels, glossy buttons, bubble markers, sky/leaf palette; canopy, heat and flood as the subject |
| Community | Tools that bring people together, local orgs | Feedback form, agent, "Constituent voice" mode | A resident's message visibly changing what the town is advised to build |
| Photon | An agent with a real number, built on Spectrum | `agent/` | Text the number live, get a reply, see the message land on the dashboard |
| Gemini | Gemini doing something the app depends on | `backend/app/services/gemini.py` | Structured sentiment/topic/district extraction, plus council-packet rationales |
| Tiger Data | Hypertables, continuous aggregates, SQL, compression | `db/01_schema.sql`, metrics endpoints | Charts served from continuous aggregates; relational + time series in one DB |
| Snowflake | LLMs through Snowflake's REST API | `backend/app/services/snowflake_cortex.py` (stub) | See phase 8 |

### Snowflake: recommendation is to skip it unless phases 1-7 are done

Its job (LLM calls over REST) is the same job Gemini already does here, and Tiger Data already owns storage and analytics. Adding it as a second LLM for the same task reads as bolted on, which hurts more than it helps with judges. It only earns a place if it does something Gemini is not doing. The one role that fits: grounded Q&A over town documents (council minutes, CIP PDFs), so a planner can ask "why was this rejected last time?" That is phase 8, behind everything else.

## Phase 0: setup (both, first hour)

1. Pick a name. Rename in `README.md`, `frontend/index.html`, `App.tsx`, the `gemini.py` agent prompt.
2. Create the GitHub repo, push the scaffold, add each other as collaborators.
3. Get keys: Google Maps (Maps JavaScript API + a Map ID), Gemini, Photon (app.photon.codes/dashboard, promo code HACKWITHPHOTON), Tiger Cloud service.
4. `docker compose up -d`, start backend and frontend, confirm seed pins show on the map.
5. Agree on the API contract in `frontend/src/api.ts`. From here A and B work against it independently.

## Phase 1: the map (B) and real project data (A)

**B**
1. Status filter chips over the map (completed / in progress / proposed / rejected / suggested).
2. Project detail in the InfoWindow or a side panel: budget, dates, description, predicted effects, residents affected.
3. District fly-to buttons using `useMap()`.

**A**
1. Write `backend/ingest/chapel_hill_cip.py`: pull CIP projects and district boundaries from the town's ArcGIS REST services into `projects` and `districts`. Mark which fields are real and which you had to fill in by hand.
2. If the open data is thin, hand-enter 20 to 30 real projects from the published CIP document into a CSV and load that. Real records matter more than a clever loader.
3. Record approved vs rejected and the decision date for every project. This is the approval model's label.

Checkpoint: real Chapel Hill projects on a hybrid map.

## Phase 2: environmental time series on Tiger Data (A)

1. Run `python -m ingest.nwis P30D` and fix whatever the live API disagrees with.
2. `ingest/sentinel_ndvi.py`: Sentinel-2 B04/B08 via the Copernicus STAC API, NDVI averaged per district polygon, one row per scene. Pull two to three years. Cache raw responses under `data/raw/`.
3. `ingest/landsat_lst.py`: Landsat 9 Band 10 to land surface temperature in °F per district.
4. Move from local docker to the Tiger Cloud service: run `db/01_schema.sql` there, point `DATABASE_URL` at it.
5. (B) District panel with NDVI and temperature charts reading `/api/districts/{id}/metrics`, which reads the `observations_daily` continuous aggregate.
6. Note the numbers for the pitch: row count, compression ratio (`hypertable_compression_stats`), query time for raw vs aggregate.

Checkpoint: click a district, see its canopy and heat history.

## Phase 3: constituent voice with Gemini (A backend, B UI)

1. Add a Gemini key and test `POST /api/feedback` with a dozen varied messages. Tune the prompt in `analyze_feedback` until topics and districts are right.
2. (B) Feedback feed panel: recent messages with sentiment colour and topic chips. Sentiment-over-time chart per district from `/api/sentiment` (the `sentiment_daily` aggregate).
3. (B) Allow feedback on a specific project from its detail view (`project_id`).
4. Keep phone numbers out of the database. `sender_hash` only, and set a real `SENDER_HASH_SALT`.

Checkpoint: submit a message on the web form, watch it get classified and appear.

## Phase 4: the models (A)

The honest constraint: one town has a few dozen decided projects, which is not enough to train on alone. `ml/train.py` already handles this by weighting real rows heavily and topping up with synthetic rows drawn around `ml/priors.py`. Say this out loud in the demo; judges respect it more than an inflated accuracy number.

1. Replace the placeholder effect sizes in `ml/priors.py` with published figures (urban tree cooling, cool pavement, stormwater retention). Keep a source list in the README.
2. Finish the two TODOs in `train.py`: district sentiment before the decision date, and a flood label from gauge-height exceedance days before and after.
3. `python -m ml.train`, then check the outputs are sane: more budget means lower approval, trees raise NDVI and lower temperature, and so on. Fix the features if a relationship points the wrong way.
4. Hold out the real rows once (leave-one-out) and write down the approval accuracy and impact error. Report it as-is.
5. Add `python -m ml.score`: run `predict()` over every proposed project and write rows to `predictions`, so proposed pins show approval chance and effects.
6. Stretch: before/after comparison for completed projects ("the model predicted -1.4 °F, satellites measured -1.1 °F"). This is the strongest single slide you can have.

Checkpoint: every proposed pin shows approval probability, predicted effects and residents affected.

## Phase 5: suggestions (A logic, B UI)

1. Candidate generation in `ml/suggest.py` is one template per category per district. Improve it: vary size (small / medium / large budgets), and place candidates at the hottest or least-green point in the district instead of its centre.
2. Tune `UTILITY` weights together. Expose them as sliders if there is time ("what does the council care about this year?").
3. (B) Wire the budget and time-span sliders (already in the sidebar) and show the running total against the town's CIP ceiling.
4. (B) "Best impact" vs "Constituent voice" toggle. Show both lists side by side if space allows; the difference between them is the story.
5. Turn on `explain=true` and show Gemini's two-sentence rationale on each card. The numbers come from the model; Gemini only words them.
6. "Add to proposals" button: `POST` a suggestion into `projects` with `status='proposed'`, `source='model'`.

Checkpoint: move the budget slider, watch the suggested pins change.

## Phase 6: iMessage agent (B)

1. `cd agent && npm install`, add Photon credentials, run `npm run dev`. Text the number and confirm a reply.
2. Develop against Spectrum's terminal provider so you are not dependent on a phone while iterating.
3. Make it more than a form: let residents ask "what's planned near Booker Creek?" and "what happened to the greenway?" The backend already passes the project list to `agent_reply`.
4. Remember context per sender (last district mentioned) so follow-ups work.
5. Stretch, and the best Community moment: when a project's status changes, text the residents who asked for it. Needs a consent line in the first reply and a way to opt out.
6. Put the number and a QR code on the web app.

Checkpoint: text the number, get an answer, see the message appear on the dashboard and shift the "Constituent voice" list.

## Phase 7: Frutiger Aero polish and demo (B, A helps)

1. Bubbles and soft lens flares in the background of panels, glossy progress bars for budget, water-drop or leaf icons for categories, a subtle sky gradient header.
2. Keep text readable over glass: check contrast on the sidebar over bright satellite tiles.
3. Loading and error states for every panel. A blank panel during the demo costs more than a missing feature.
4. Seed the demo: clear test feedback, load a realistic set of messages, retrain, rescore.
5. Write the demo script (3 minutes): map of what exists, click a district for canopy and heat, text the agent live, show the message land, move the budget slider, compare the two suggestion modes, close on predicted vs measured.
6. Record a backup video in case of bad wifi.
7. Devpost: one paragraph per track saying exactly how the project uses it, with a screenshot each.

## Phase 8: Snowflake (optional, only if everything above is done)

1. Start the student trial, create a programmatic access token, fill in the `SNOWFLAKE_*` variables.
2. Load 5 to 10 council minutes / CIP documents as text chunks. Use Cortex Search for retrieval, or keep it simple and pass the two most relevant chunks by keyword.
3. Finish `services/snowflake_cortex.py` (check the response shape against the docs) and add `POST /api/ask`.
4. (B) "Ask the record" box on a project's detail view.

## What to cut first

1. Phase 8.
2. VIIRS night-light ingest.
3. Proactive agent notifications.
4. Landsat temperature (keep NDVI; one satellite signal is enough to make the point).
5. Utility-weight sliders.

Do not cut: real project records, the live text-in moment, the two suggestion modes.
