-- Migration: Update subscription schema for new plans
-- Created: 2026-04-02

BEGIN;

-- Create cuid extension if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create new enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "PlanType_new" AS ENUM ('FREE', 'STARTER', 'PRO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop the default constraint before converting
ALTER TABLE subscriptions ALTER COLUMN plan DROP DEFAULT;

-- Update the column to use new type
ALTER TABLE subscriptions ALTER COLUMN plan TYPE "PlanType_new" USING (
    CASE 
        WHEN plan::text = 'FREE' THEN 'FREE'::"PlanType_new"
        WHEN plan::text = 'STUDENT' THEN 'STARTER'::"PlanType_new"
        WHEN plan::text = 'ACADEMIC' THEN 'PRO'::"PlanType_new"
        ELSE 'FREE'::"PlanType_new"
    END
);

-- Restore the default with the new type
ALTER TABLE subscriptions ALTER COLUMN plan SET DEFAULT 'FREE';

-- Drop old enum and rename new one
DROP TYPE IF EXISTS "PlanType";

ALTER TYPE "PlanType_new" RENAME TO "PlanType";

-- Drop old creditsPerMonth column
ALTER TABLE subscriptions DROP COLUMN IF EXISTS credits_per_month;

-- Add new columns
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS works_per_month INTEGER NOT NULL DEFAULT 1;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS works_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_usage_reset TIMESTAMP NOT NULL DEFAULT NOW();

-- Create work_purchases table
CREATE TABLE IF NOT EXISTS "work_purchases" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price_paid INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "work_purchases_user_id_idx" ON "work_purchases"("user_id");

COMMIT;
