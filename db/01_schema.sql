-- Canopie schema. Runs as-is on Tiger Cloud and on the local docker TimescaleDB.
-- Relational tables and time-series hypertables live side by side.

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ---------- relational ----------

CREATE TABLE districts (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    population  INTEGER NOT NULL
);

CREATE TABLE projects (
    id               SERIAL PRIMARY KEY,
    title            TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    -- keys of backend/ml/priors.py CATEGORIES
    category         TEXT NOT NULL,
    -- capital_program (named in the Town's CIP) | proposed | completed | in_progress | rejected
    status           TEXT NOT NULL,
    -- cip (town records) | constituent | model
    source           TEXT NOT NULL DEFAULT 'cip',
    district_id      INTEGER NOT NULL REFERENCES districts(id),
    lat              DOUBLE PRECISION NOT NULL,
    lng              DOUBLE PRECISION NOT NULL,
    budget_usd       NUMERIC(12, 2),            -- NULL when the Town has not published one
    grant_match_pct  REAL NOT NULL DEFAULT 0,
    start_date       DATE,
    end_date         DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON projects (status);

CREATE TABLE predictions (
    project_id             INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    model_version          TEXT NOT NULL,
    approval_prob          REAL NOT NULL,
    delta_ndvi             REAL NOT NULL,
    delta_lst_f            REAL NOT NULL,
    delta_flood_risk       REAL NOT NULL,
    constituents_affected  INTEGER NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, model_version)
);

-- ---------- time series ----------

-- One narrow table for every environmental signal.
-- metric: ndvi | lst_f | gauge_height_ft | discharge_cfs | radiance
CREATE TABLE observations (
    time         TIMESTAMPTZ NOT NULL,
    district_id  INTEGER NOT NULL REFERENCES districts(id),
    metric       TEXT NOT NULL,
    value        DOUBLE PRECISION NOT NULL,
    UNIQUE (time, district_id, metric)
);
SELECT create_hypertable('observations', by_range('time'));

-- Constituent voice: web form + iMessage agent. sender_hash is a salted hash, never the raw number.
CREATE TABLE feedback (
    time         TIMESTAMPTZ NOT NULL DEFAULT now(),
    id           UUID NOT NULL DEFAULT gen_random_uuid(),
    channel      TEXT NOT NULL,          -- web | imessage
    sender_hash  TEXT,
    district_id  INTEGER REFERENCES districts(id),
    project_id   INTEGER REFERENCES projects(id),
    body         TEXT NOT NULL,
    sentiment    REAL NOT NULL,          -- -1 .. 1, from Gemini
    topics       TEXT[] NOT NULL DEFAULT '{}'
);
SELECT create_hypertable('feedback', by_range('time'));

-- ---------- continuous aggregates (what the dashboard charts read) ----------

CREATE MATERIALIZED VIEW observations_daily
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT time_bucket('1 day', time) AS day,
       district_id,
       metric,
       avg(value) AS avg_value,
       max(value) AS max_value
FROM observations
GROUP BY 1, 2, 3
WITH NO DATA;

SELECT add_continuous_aggregate_policy('observations_daily',
    start_offset => INTERVAL '30 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

CREATE MATERIALIZED VIEW sentiment_daily
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT time_bucket('1 day', time) AS day,
       district_id,
       avg(sentiment) AS avg_sentiment,
       count(*) AS messages
FROM feedback
GROUP BY 1, 2
WITH NO DATA;

SELECT add_continuous_aggregate_policy('sentiment_daily',
    start_offset => INTERVAL '30 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- Compression for the "millions of events on a free tier" story.
ALTER TABLE observations SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'district_id, metric'
);
SELECT add_compression_policy('observations', INTERVAL '30 days');
