"""Load the Town's named capital projects into the database: python -m ingest.cip_projects

Source: https://www.chapelhillnc.gov/Town-Government/Financials/Capital-Improvements-Program
which lists six "major projects" by name only. It publishes no budget, status, dates or
location for any of them, so:
  - budget is left empty (shown as "not published"), never estimated;
  - status is 'capital_program', meaning "named in the Capital Improvements Program";
  - each location is looked up in the Town's own GIS (address points or street centerlines).

Fire Apparatus Replacement is on the Town's list but is equipment with no location, so it
is not placed on the map.
"""
import httpx
import psycopg

from app.config import settings

TOWN_GIS = "https://gis-portal.townofchapelhill.org/server/rest/services/OpenData"
SOURCE_NOTE = "Named in the Town's Capital Improvements Program. The Town's page gives no budget, status or dates."

# title, category, how to find it in the Town's GIS, and what the location stands for
PROJECTS = [
    ("West Rosemary Streetscape", "streets_sidewalks",
     ("Streets", "UPPER(FullName) = 'W ROSEMARY ST'"),
     "Location: midpoint of West Rosemary St; the project's exact extent is not published."),
    ("Ephesus Road Sidewalk Infill Project", "streets_sidewalks",
     ("Streets", "UPPER(FullName) = 'EPHESUS CHURCH RD'"),
     "Location: midpoint of Ephesus Church Rd, taken to be the road meant; the segment is not published."),
    ("Cedar Falls Park Parking Lot", "parks_recreation",
     ("AddressPoints", "HouseNum = 501 AND UPPER(Name) LIKE '%WEAVER DAIRY%'"),
     "Location: Cedar Falls Park, 501 Weaver Dairy Rd."),
    ("Hargraves Park Renovations", "parks_recreation",
     ("AddressPoints", "UPPER(PlaceName) = 'HARGRAVES PARK'"),
     "Location: Hargraves Park, 216 N Roberson St."),
    ("Public Works Roof Design and Replacement", "public_facilities",
     ("AddressPoints", "HouseNum = 6850 AND UPPER(Name) LIKE '%MILLHOUSE%'"),
     "Location: Public Works administration building, Town Operations Center, 6850 Millhouse Rd, "
     "taken to be the building meant."),
]


def locate(layer: str, where: str) -> tuple[float, float]:
    r = httpx.get(f"{TOWN_GIS}/{layer}/MapServer/0/query", timeout=90,
                  params={"f": "json", "where": where, "outSR": 4326, "returnGeometry": "true", "outFields": "OBJECTID"})
    points = []
    for feature in r.json()["features"]:
        g = feature["geometry"]
        points += [p for path in g["paths"] for p in path] if "paths" in g else [[g["x"], g["y"]]]
    return (round(sum(p[1] for p in points) / len(points), 5), round(sum(p[0] for p in points) / len(points), 5))


def main() -> None:
    rows = [(title, category, *locate(*lookup), f"{SOURCE_NOTE} {where}") for title, category, lookup, where in PROJECTS]
    with psycopg.connect(settings.database_url) as conn:
        # Everything loaded from town records is replaced; proposals added in the app are kept.
        conn.execute("DELETE FROM projects WHERE source = 'cip'")
        for title, category, lat, lng, description in rows:
            conn.execute(
                """
                INSERT INTO projects (title, description, category, status, source, district_id, lat, lng, budget_usd)
                VALUES (%s, %s, %s, 'capital_program', 'cip',
                        (SELECT id FROM districts ORDER BY (lat - %s) ^ 2 + (lng - %s) ^ 2 LIMIT 1), %s, %s, NULL)
                """,
                (title, description, category, lat, lng, lat, lng))
            print(f"{title:<42} {lat}, {lng}")
    print(f"{len(rows)} projects loaded")


if __name__ == "__main__":
    main()
