-- Fix subscriptions before schema push
-- This script updates old PlanType values to new ones

-- Update plan values to FREE first
UPDATE subscriptions SET plan = 'FREE'::text WHERE plan::text IN ('STUDENT', 'ACADEMIC');

-- Update credits_per_month if it exists
ALTER TABLE subscriptions DROP COLUMN IF EXISTS credits_per_month;

-- Add new columns if they don't exist
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS works_per_month INTEGER NOT NULL DEFAULT 1;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS works_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_usage_reset TIMESTAMP NOT NULL DEFAULT NOW();

-- Create work_purchases table if it doesn't exist
CREATE TABLE IF NOT EXISTS "work_purchases" (
    id TEXT PRIMARY KEY DEFAULT cuid(),
    user_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price_paid INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "work_purchases_user_id_idx" ON "work_purchases"("user_id");
