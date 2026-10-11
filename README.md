# Canopy (working name)

A planning map for Chapel Hill, NC. It plots what the town has built and what has been proposed, scores what each project would change at a location, and suggests the best set of new projects for a given budget and time span. Residents shape the suggestions by texting an iMessage agent or using the web form.

> **What the scoring is.** `backend/ml/impact_engine.py` is a rule-based scoring engine: hand-set formulas over location features and project size. It is not a model trained on data. The district baselines in it, the project templates in `backend/ml/priors.py` and the seed data in `db/02_seed.sql` are placeholders chosen by hand. Do not present any of them as measured or learned figures.

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
                                      │              ── backend/ml: rule-based impact engine, suggester
                                      v
                              frontend/ (React + Google Maps, Frutiger Aero UI)
```

| Folder | What | Track |
| --- | --- | --- |
| `frontend/` | React + Vite + `@vis.gl/react-google-maps`, glass UI in `src/styles/aero.css` | Frutiger Aero |
| `backend/app/` | FastAPI: projects, metrics, feedback, suggestions, agent endpoint | |
| `backend/app/services/gemini.py` | Sentiment and topic extraction, rationales, agent replies | Gemini |
| `backend/ml/` | 100 m grid with spatial lag features, need model, rule-based impact engine (Python port of B's), transparent ranking. See `docs/MODEL.md`. | |
| `chapel-hill-spatial-gbdt-impact-engine/` | B's original standalone prototype of the engine and a simulator UI. The app does not run it; kept for reference and UI parts. | |
| `backend/ingest/` | Loaders for NWIS, Sentinel-2, Landsat, town GIS | |
| `db/` | Schema with hypertables, continuous aggregates, compression | Tiger Data |
| `agent/` | iMessage agent on Spectrum, forwards to the backend | Photon, Community |
| `docs/PLAN.md` | Build plan, step by step | |
| `docs/MODEL.md` | What the model is, and how it compares with `improvements_to_model.txt` | |

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

Check the Python engine still matches B's TypeScript original, from `backend/`:

```bash
.venv/Scripts/python -m ml.test_impact_engine
```

Agent (from `agent/`, after copying `.env.example` to `.env`):

```bash
npm install
npm run dev
```

API docs are at http://localhost:8000/docs once the backend is up.

## Two suggestion modes

`GET /api/suggestions?budget=&horizon_months=&mode=`

- `balanced`: six predicted outcomes (flood, heat, mobility, canopy, lighting, housing) combined with stated weights, adjusted by local need, x residents reached, with a small boost for constituent demand. Each suggestion is sited at the highest-need 100 m cell in its district and reports what it was ranked on.
- `constituent`: alignment score x resident demand. Demand is the category's priority in the 2026 Chapel Hill community survey (real figures, `backend/ml/survey.py`) plus messages received about that topic in that district through the web form or iMessage. Nothing else.

The API field `approval_prob` holds the alignment score scaled to 0..1. It is not a probability of approval; the UI labels it "alignment".

Both pick greedily by score per town dollar (after grant match) until the budget is spent.
