# Canopy (working name)

A planning map for Chapel Hill, NC. It plots what the town has built and what has been proposed, predicts what each project would change and how likely it is to be approved, and suggests the best set of new projects for a given budget and time span. Residents shape the suggestions by texting an iMessage agent or using the web form.

> The seed data in `db/02_seed.sql` and the effect sizes in `backend/ml/priors.py` are placeholders. Do not present them as real figures.

## How it fits together

```
 residents ── iMessage ──> agent/ (Photon Spectrum) ──┐
 residents ── web form ───────────────────────────────┤
                                                      v
 satellite / gauge / town data ── backend/ingest ──> Tiger Data (Postgres + TimescaleDB)
                                                      │   projects, districts, predictions
                                                      │   observations + feedback hypertables
                                                      │   continuous aggregates
                                                      v
                              backend/app (FastAPI) ── Gemini: sentiment, topics, rationales
                                      │              ── backend/ml: approval + impact models, suggester
                                      v
                              frontend/ (React + Google Maps, Frutiger Aero UI)
```

| Folder | What | Track |
| --- | --- | --- |
| `frontend/` | React + Vite + `@vis.gl/react-google-maps`, glass UI in `src/styles/aero.css` | Frutiger Aero |
| `backend/app/` | FastAPI: projects, metrics, feedback, suggestions, agent endpoint | |
| `backend/app/services/gemini.py` | Sentiment and topic extraction, rationales, agent replies | Gemini |
| `backend/ml/` | Approval and impact models, candidate generation, budget selection | |
| `backend/ingest/` | Loaders for NWIS, Sentinel-2, Landsat, town GIS | |
| `db/` | Schema with hypertables, continuous aggregates, compression | Tiger Data |
| `agent/` | iMessage agent on Spectrum, forwards to the backend | Photon, Community |
| `docs/PLAN.md` | Build plan, step by step | |

## Run it

Needs Docker, Python 3.11+, Node 20+.

```bash
cp .env.example .env
docker compose up -d
```

Backend (from `backend/`):

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # macOS/Linux: .venv/bin/pip
.venv/Scripts/uvicorn app.main:app --reload
```

Frontend (from `frontend/`, after copying `.env.example` to `.env.local` and adding a Maps key):

```bash
npm install
npm run dev
```

Train the models (optional; the API falls back to priors without them), from `backend/`:

```bash
.venv/Scripts/python -m ml.train
```

Agent (from `agent/`, after copying `.env.example` to `.env`):

```bash
npm install
npm run dev
```

API docs are at http://localhost:8000/docs once the backend is up.

## Two suggestion modes

`GET /api/suggestions?budget=&horizon_months=&mode=`

- `balanced`: approval probability x predicted impact (canopy, heat, flood) x residents reached, with a small boost for constituent demand.
- `constituent`: approval probability x how many residents asked for it. No environmental term.

Both pick greedily by score per town dollar (after grant match) until the budget is spent.
