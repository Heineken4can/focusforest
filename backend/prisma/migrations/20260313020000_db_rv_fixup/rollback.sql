-- Reverse WARN-1
ALTER TABLE "UserProgressSnapshot"
  DROP CONSTRAINT IF EXISTS "chk_user_progress_total_sp",
  DROP CONSTRAINT IF EXISTS "chk_user_progress_current_level",
  DROP CONSTRAINT IF EXISTS "chk_user_progress_completed_sessions";

-- Reverse WARN-2
ALTER TABLE "FocusSession"
  DROP CONSTRAINT IF EXISTS "chk_focus_session_planned_sec";

-- Reverse WARN-3: 제거한 일반 인덱스 복원
CREATE INDEX "idx_daily_focus_stat_user_date" ON "DailyFocusStat"("userId", "statDate");
