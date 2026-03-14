-- Migration: 20260314050000_db_sync_fixup
-- Goal: Ensure partial unique indexes and nullable FKs for sync support.

-- 1. DROP old index (if any standard one exists)
-- This matches the removal of @@unique from schema.prisma
DROP INDEX IF EXISTS "uq_metric_event_name_dedupe_key";

-- 2. CREATE partial unique indexes (as per db_plan.md / be_design.md)
-- (Note: Re-verifying/creating IF NOT EXISTS in case they were already in init)

-- uq_focus_session_user_active (only for RUNNING/PAUSED/BREAK_RUNNING)
CREATE UNIQUE INDEX IF NOT EXISTS "uq_focus_session_user_active"
ON "FocusSession" ("userId")
WHERE "status" IN ('RUNNING', 'PAUSED', 'BREAK_RUNNING');

-- uq_metric_event_name_dedupe_key (partial UNIQUE index)
CREATE UNIQUE INDEX IF NOT EXISTS "uq_metric_event_name_dedupe_key"
ON "ProductMetricEvent" ("eventName", "dedupeKey")
WHERE "dedupeKey" IS NOT NULL;

-- uq_task_user_core_active (only for 1 core task per user, excluding deleted)
CREATE UNIQUE INDEX IF NOT EXISTS "uq_task_user_core_active"
ON "Task" ("userId")
WHERE "isCore" = true AND "deletedAt" IS NULL;
