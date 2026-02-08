-- Cities table: English-speaking cities 100k+ inhabitants, for campaign targeting
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  population_bucket TEXT NOT NULL CHECK (population_bucket IN ('1M+', '500K-1M', '500K+', '250K-500K', '250K+', '100K-250K', '100K+', '50K-100K', 'all')),
  UNIQUE (name, country, population_bucket)
);

-- Index for filtering by population_bucket (citySize)
CREATE INDEX IF NOT EXISTS cities_population_bucket_idx ON cities(population_bucket);

-- Allow public read (no RLS, or policy for anon/authenticated)
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read cities for all"
  ON cities FOR SELECT
  USING (true);

-- Seed: English-speaking cities 50k+ (same buckets as app/n8n)
-- 1M+
INSERT INTO cities (name, country, population_bucket) VALUES
('New York', 'USA', '1M+'), ('Los Angeles', 'USA', '1M+'), ('Chicago', 'USA', '1M+'), ('Houston', 'USA', '1M+'), ('Phoenix', 'USA', '1M+'),
('Philadelphia', 'USA', '1M+'), ('San Antonio', 'USA', '1M+'), ('San Diego', 'USA', '1M+'), ('Dallas', 'USA', '1M+'), ('San Jose', 'USA', '1M+'),
('Toronto', 'Canada', '1M+'), ('Montreal', 'Canada', '1M+'), ('Vancouver', 'Canada', '1M+'),
('London', 'UK', '1M+'), ('Birmingham', 'UK', '1M+'),
('Sydney', 'Australia', '1M+'), ('Melbourne', 'Australia', '1M+')
ON CONFLICT DO NOTHING;

-- 500K-1M
INSERT INTO cities (name, country, population_bucket) VALUES
('Austin', 'USA', '500K-1M'), ('Jacksonville', 'USA', '500K-1M'), ('Fort Worth', 'USA', '500K-1M'), ('Columbus', 'USA', '500K-1M'), ('San Francisco', 'USA', '500K-1M'),
('Charlotte', 'USA', '500K-1M'), ('Indianapolis', 'USA', '500K-1M'), ('Seattle', 'USA', '500K-1M'), ('Denver', 'USA', '500K-1M'), ('Washington', 'USA', '500K-1M'),
('Boston', 'USA', '500K-1M'), ('Nashville', 'USA', '500K-1M'),
('Calgary', 'Canada', '500K-1M'), ('Edmonton', 'Canada', '500K-1M'),
('Manchester', 'UK', '500K-1M'), ('Glasgow', 'UK', '500K-1M'),
('Brisbane', 'Australia', '500K-1M'), ('Perth', 'Australia', '500K-1M'), ('Adelaide', 'Australia', '500K-1M'),
('Auckland', 'New Zealand', '500K-1M')
ON CONFLICT DO NOTHING;

-- 250K-500K
INSERT INTO cities (name, country, population_bucket) VALUES
('Detroit', 'USA', '250K-500K'), ('Portland', 'USA', '250K-500K'), ('Memphis', 'USA', '250K-500K'), ('Oklahoma City', 'USA', '250K-500K'), ('Las Vegas', 'USA', '250K-500K'),
('Louisville', 'USA', '250K-500K'), ('Baltimore', 'USA', '250K-500K'), ('Milwaukee', 'USA', '250K-500K'), ('Albuquerque', 'USA', '250K-500K'), ('Tucson', 'USA', '250K-500K'),
('Fresno', 'USA', '250K-500K'), ('Sacramento', 'USA', '250K-500K'), ('Kansas City', 'USA', '250K-500K'), ('Mesa', 'USA', '250K-500K'), ('Atlanta', 'USA', '250K-500K'),
('Miami', 'USA', '250K-500K'), ('Cleveland', 'USA', '250K-500K'), ('Virginia Beach', 'USA', '250K-500K'), ('Omaha', 'USA', '250K-500K'), ('Oakland', 'USA', '250K-500K'),
('Ottawa', 'Canada', '250K-500K'), ('Winnipeg', 'Canada', '250K-500K'), ('Quebec City', 'Canada', '250K-500K'), ('Hamilton', 'Canada', '250K-500K'), ('Kitchener', 'Canada', '250K-500K'),
('Leeds', 'UK', '250K-500K'), ('Sheffield', 'UK', '250K-500K'), ('Bradford', 'UK', '250K-500K'), ('Liverpool', 'UK', '250K-500K'), ('Edinburgh', 'UK', '250K-500K'),
('Bristol', 'UK', '250K-500K'), ('Leicester', 'UK', '250K-500K'), ('Coventry', 'UK', '250K-500K'),
('Dublin', 'Ireland', '250K-500K'),
('Gold Coast', 'Australia', '250K-500K'), ('Newcastle', 'Australia', '250K-500K'),
('Wellington', 'New Zealand', '250K-500K'), ('Christchurch', 'New Zealand', '250K-500K')
ON CONFLICT DO NOTHING;

-- 100K-250K (subset for seed; add more as needed)
INSERT INTO cities (name, country, population_bucket) VALUES
('Raleigh', 'USA', '100K-250K'), ('Long Beach', 'USA', '100K-250K'), ('Colorado Springs', 'USA', '100K-250K'), ('Arlington', 'USA', '100K-250K'), ('Tampa', 'USA', '100K-250K'),
('Anaheim', 'USA', '100K-250K'), ('Bakersfield', 'USA', '100K-250K'), ('Aurora', 'USA', '100K-250K'), ('Honolulu', 'USA', '100K-250K'), ('Santa Ana', 'USA', '100K-250K'),
('Riverside', 'USA', '100K-250K'), ('Corpus Christi', 'USA', '100K-250K'), ('Lexington', 'USA', '100K-250K'), ('Stockton', 'USA', '100K-250K'), ('St. Paul', 'USA', '100K-250K'),
('Cincinnati', 'USA', '100K-250K'), ('Pittsburgh', 'USA', '100K-250K'), ('Anchorage', 'USA', '100K-250K'), ('Henderson', 'USA', '100K-250K'), ('Greensboro', 'USA', '100K-250K'),
('London', 'Canada', '100K-250K'), ('Victoria', 'Canada', '100K-250K'), ('Windsor', 'Canada', '100K-250K'), ('Saskatoon', 'Canada', '100K-250K'), ('Regina', 'Canada', '100K-250K'),
('Nottingham', 'UK', '100K-250K'), ('Newcastle', 'UK', '100K-250K'), ('Belfast', 'UK', '100K-250K'), ('Brighton', 'UK', '100K-250K'), ('Hull', 'UK', '100K-250K'),
('Cork', 'Ireland', '100K-250K'), ('Limerick', 'Ireland', '100K-250K'),
('Canberra', 'Australia', '100K-250K'), ('Wollongong', 'Australia', '100K-250K'), ('Geelong', 'Australia', '100K-250K'), ('Hobart', 'Australia', '100K-250K'),
('Hamilton', 'New Zealand', '100K-250K'), ('Tauranga', 'New Zealand', '100K-250K'), ('Dunedin', 'New Zealand', '100K-250K')
ON CONFLICT DO NOTHING;

-- 50K-100K (subset)
INSERT INTO cities (name, country, population_bucket) VALUES
('Des Moines', 'USA', '50K-100K'), ('Grand Rapids', 'USA', '50K-100K'), ('Salt Lake City', 'USA', '50K-100K'), ('Tallahassee', 'USA', '50K-100K'), ('Worcester', 'USA', '50K-100K'),
('Knoxville', 'USA', '50K-100K'), ('Providence', 'USA', '50K-100K'), ('Chattanooga', 'USA', '50K-100K'), ('Fort Lauderdale', 'USA', '50K-100K'), ('Salem', 'USA', '50K-100K'),
('Guelph', 'Canada', '50K-100K'), ('Sudbury', 'Canada', '50K-100K'), ('Thunder Bay', 'Canada', '50K-100K'), ('Moncton', 'Canada', '50K-100K'),
('Oxford', 'UK', '50K-100K'), ('Reading', 'UK', '50K-100K'), ('Bolton', 'UK', '50K-100K'), ('Sunderland', 'UK', '50K-100K'), ('Norwich', 'UK', '50K-100K'),
('Galway', 'Ireland', '50K-100K'), ('Waterford', 'Ireland', '50K-100K')
ON CONFLICT DO NOTHING;
