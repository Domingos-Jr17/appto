CREATE TABLE IF NOT EXISTS product_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  user_id TEXT,
  project_id TEXT,
  payment_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_events_name_created_at
  ON product_events (name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_category_created_at
  ON product_events (category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_user_created_at
  ON product_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_project_created_at
  ON product_events (project_id, created_at DESC);
