-- WARN-1: UserProgressSnapshot non-negative CHECK constraints
-- (db_design.md §4.7 명시 제약이 init migration에서 누락됨)
ALTER TABLE "UserProgressSnapshot"
  ADD CONSTRAINT "chk_user_progress_total_sp"             CHECK ("totalSp" >= 0),
  ADD CONSTRAINT "chk_user_progress_current_level"        CHECK ("currentLevel" >= 1),
  ADD CONSTRAINT "chk_user_progress_completed_sessions"   CHECK ("totalCompletedSessions" >= 0);

-- WARN-2: FocusSession.plannedFocusSec positive CHECK constraint
-- (db_design.md §4.5 명시 제약이 init migration에서 누락됨)
ALTER TABLE "FocusSession"
  ADD CONSTRAINT "chk_focus_session_planned_sec" CHECK ("plannedFocusSec" > 0);

-- WARN-3: DailyFocusStat 중복 인덱스 제거
-- uq_daily_focus_stat_user_date UNIQUE INDEX가 일반 인덱스 역할을 이미 수행함
DROP INDEX "idx_daily_focus_stat_user_date";
