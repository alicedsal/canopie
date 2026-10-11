-- DEMO SEED DATA. Everything below is illustrative so the app runs before ingest exists.
-- District centres match backend/ml/impact_engine.py; populations and projects are invented.
-- Replace with backend/ingest/* output (see docs/PLAN.md phase 2).

INSERT INTO districts (name, lat, lng, population) VALUES
    ('Franklin St',   35.9132, -79.0558, 6200),
    ('Booker Creek',  35.9392, -79.0285, 4800),
    ('Blue Hill',     35.9324, -79.0182, 3900),
    ('Bolin Creek',   35.9270, -79.0435, 5100),
    ('Northside',     35.9185, -79.0620, 2700),
    ('Homestead Rd',  35.9525, -79.0560, 4300);

-- The Town's named capital projects. Names from the Capital Improvements Program page; the
-- page publishes no budget, status or dates. Locations from the Town's GIS.
-- Rebuild with: python -m ingest.cip_projects
INSERT INTO projects (title, description, category, status, source, district_id, lat, lng, budget_usd) VALUES
    ('West Rosemary Streetscape', 'Named in the Town''s Capital Improvements Program. The Town''s page gives no budget, status or dates. Location: midpoint of West Rosemary St; the project''s exact extent is not published.', 'streets_sidewalks', 'capital_program', 'cip', 1, 35.91204, -79.06211, NULL),
    ('Ephesus Road Sidewalk Infill Project', 'Named in the Town''s Capital Improvements Program. The Town''s page gives no budget, status or dates. Location: midpoint of Ephesus Church Rd, taken to be the road meant; the segment is not published.', 'streets_sidewalks', 'capital_program', 'cip', 3, 35.93236, -79.01060, NULL),
    ('Cedar Falls Park Parking Lot', 'Named in the Town''s Capital Improvements Program. The Town''s page gives no budget, status or dates. Location: Cedar Falls Park, 501 Weaver Dairy Rd.', 'parks_recreation', 'capital_program', 'cip', 2, 35.95996, -79.03351, NULL),
    ('Hargraves Park Renovations', 'Named in the Town''s Capital Improvements Program. The Town''s page gives no budget, status or dates. Location: Hargraves Park, 216 N Roberson St.', 'parks_recreation', 'capital_program', 'cip', 5, 35.91290, -79.06389, NULL),
    ('Public Works Roof Design and Replacement', 'Named in the Town''s Capital Improvements Program. The Town''s page gives no budget, status or dates. Location: Public Works administration building, Town Operations Center, 6850 Millhouse Rd, taken to be the building meant.', 'public_facilities', 'capital_program', 'cip', 6, 35.97774, -79.07335, NULL);

-- Two years of weekly NDVI + land surface temperature per district.
INSERT INTO observations (time, district_id, metric, value)
SELECT t, d.id, 'ndvi',
       0.45 + 0.03 * d.id + 0.12 * sin(extract(doy FROM t) / 58.1 - 1.2) + (random() - 0.5) * 0.02
FROM generate_series(now() - INTERVAL '2 years', now(), INTERVAL '7 days') AS t, districts d;

INSERT INTO observations (time, district_id, metric, value)
SELECT t, d.id, 'lst_f',
       78 - 1.5 * d.id + 16 * sin(extract(doy FROM t) / 58.1 - 1.2) + (random() - 0.5) * 2
FROM generate_series(now() - INTERVAL '2 years', now(), INTERVAL '7 days') AS t, districts d;

INSERT INTO feedback (time, channel, district_id, body, sentiment, topics) VALUES
    (now() - INTERVAL '6 days', 'web', 2, 'Our street floods every time it rains hard.', -0.7, '{stormwater}'),
    (now() - INTERVAL '4 days', 'imessage', 5, 'Love the new lights, feels much safer walking home.', 0.8, '{lighting}'),
    (now() - INTERVAL '3 days', 'imessage', 1, 'Downtown is brutal in July, there is no shade at the bus stops.', -0.5, '{tree_canopy}'),
    (now() - INTERVAL '1 day', 'web', 6, 'Kids have to walk in the road to get to the pool.', -0.6, '{bike_ped}');
