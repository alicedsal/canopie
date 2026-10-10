-- DEMO SEED DATA. Everything below is illustrative so the app runs before ingest exists.
-- Coordinates are approximate, populations and projects are invented.
-- Replace with backend/ingest/* output (see docs/PLAN.md phase 2).

INSERT INTO districts (name, lat, lng, population) VALUES
    ('Franklin St',   35.9132, -79.0558, 6200),
    ('Booker Creek',  35.9420, -79.0270, 4800),
    ('Blue Hill',     35.9290, -79.0260, 3900),
    ('Bolin Creek',   35.9230, -79.0650, 5100),
    ('Northside',     35.9170, -79.0640, 2700),
    ('Homestead Rd',  35.9500, -79.0700, 4300);

INSERT INTO projects (title, description, category, status, source, district_id, lat, lng, budget_usd, grant_match_pct, start_date, end_date) VALUES
    ('Franklin St shade tree corridor', 'Street trees along the downtown sidewalk.', 'tree_canopy', 'completed', 'cip', 1, 35.9135, -79.0545, 180000, 0, '2023-03-01', '2023-09-30'),
    ('Booker Creek stormwater wetland', 'Nature-based retention basin upstream of Eastgate.', 'stormwater', 'completed', 'cip', 2, 35.9410, -79.0285, 950000, 75, '2022-06-01', '2024-01-15'),
    ('Northside pedestrian lighting', 'Warm LED fixtures on residential blocks.', 'lighting', 'completed', 'cip', 5, 35.9175, -79.0632, 210000, 0, '2024-02-01', '2024-06-30'),
    ('Blue Hill cool pavement pilot', 'Reflective seal coat on parking and service lanes.', 'cool_pavement', 'in_progress', 'cip', 3, 35.9295, -79.0252, 420000, 0, '2026-04-01', '2026-12-15'),
    ('Bolin Creek greenway extension', 'Paved multi-use path to Umstead Park.', 'bike_ped', 'proposed', 'cip', 4, 35.9238, -79.0661, 1400000, 20, NULL, NULL),
    ('Homestead Rd sidewalk gaps', 'Close sidewalk gaps near the aquatic center.', 'bike_ped', 'proposed', 'constituent', 6, 35.9495, -79.0712, 520000, 20, NULL, NULL),
    ('Franklin St plaza revitalization', 'Rebuild the 100 block plaza.', 'revitalization', 'rejected', 'cip', 1, 35.9130, -79.0570, 2600000, 0, NULL, NULL);

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
