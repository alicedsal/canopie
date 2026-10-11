"""USGS NWIS stream gauge -> observations hypertable.

    python -m ingest.nwis            # last 7 days
    python -m ingest.nwis P30D       # ISO-8601 period

Site 02097386 is "Booker Creek at SR 1751 near Chapel Hill, NC". (The number in the
team's early notes, 02097000, is the Haw River near Pittsboro and returns nothing.)
"""
import sys

import httpx
import psycopg

from app.config import settings

SITE = "02097386"
DISTRICT = "Booker Creek"
# USGS parameter codes
PARAMS = {"00065": "gauge_height_ft", "00060": "discharge_cfs"}
URL = "https://waterservices.usgs.gov/nwis/iv/"


def main(period: str = "P7D") -> None:
    resp = httpx.get(URL, params={"format": "json", "sites": SITE, "period": period,
                                  "parameterCd": ",".join(PARAMS)}, timeout=60)
    resp.raise_for_status()
    rows = []
    for series in resp.json()["value"]["timeSeries"]:
        metric = PARAMS[series["variable"]["variableCode"][0]["value"]]
        for point in series["values"][0]["value"]:
            rows.append((point["dateTime"], metric, float(point["value"])))

    with psycopg.connect(settings.database_url) as conn:
        district_id = conn.execute("SELECT id FROM districts WHERE name = %s", (DISTRICT,)).fetchone()[0]
        with conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO observations (time, district_id, metric, value) VALUES (%s, %s, %s, %s) "
                "ON CONFLICT DO NOTHING",
                [(t, district_id, m, v) for t, m, v in rows],
            )
    # Backfilled rows only reach the dashboard's daily aggregate after a refresh, and a
    # refresh cannot run inside a transaction.
    with psycopg.connect(settings.database_url, autocommit=True) as conn:
        conn.execute("CALL refresh_continuous_aggregate('observations_daily', now() - INTERVAL '60 days', now())")
    print(f"{len(rows)} gauge readings fetched for site {SITE}")


if __name__ == "__main__":
    main(*sys.argv[1:2])
