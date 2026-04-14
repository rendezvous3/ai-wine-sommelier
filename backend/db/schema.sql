-- Wine catalog table for POC
CREATE TABLE IF NOT EXISTS wines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  wine_type TEXT NOT NULL,
  varietal TEXT,
  region TEXT,
  vintage INTEGER,
  body TEXT,
  sweetness TEXT,
  acidity TEXT,
  tannin TEXT,
  alcohol_pct REAL,
  price REAL,
  description TEXT,
  tasting_notes TEXT,
  flavor_profile TEXT,
  style_tags TEXT,
  food_pairings TEXT,
  occasions TEXT,
  image_url TEXT,
  shop_link TEXT,
  source_name TEXT,
  source_kind TEXT,
  source_url TEXT,
  last_scraped_at TEXT,
  in_stock INTEGER DEFAULT 1,
  staff_pick INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_wine_type ON wines(wine_type);
CREATE INDEX IF NOT EXISTS idx_varietal ON wines(varietal);
CREATE INDEX IF NOT EXISTS idx_region ON wines(region);
CREATE INDEX IF NOT EXISTS idx_body ON wines(body);
CREATE INDEX IF NOT EXISTS idx_sweetness ON wines(sweetness);
CREATE INDEX IF NOT EXISTS idx_price ON wines(price);
CREATE INDEX IF NOT EXISTS idx_brand ON wines(brand);
CREATE INDEX IF NOT EXISTS idx_in_stock ON wines(in_stock);
