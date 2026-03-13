-- Roll back the initial Focus Forest schema.
DROP TABLE IF EXISTS "SyncCursor";
DROP TABLE IF EXISTS "ProductMetricEvent";
DROP TABLE IF EXISTS "DailyFocusStat";
DROP TABLE IF EXISTS "UserProgressSnapshot";
DROP TABLE IF EXISTS "RewardLedger";
DROP TABLE IF EXISTS "FocusSession";
DROP TABLE IF EXISTS "Task";
DROP TABLE IF EXISTS "RefreshToken";
DROP TABLE IF EXISTS "UserSetting";
DROP TABLE IF EXISTS "User";

DROP TYPE IF EXISTS "MetricEventName";
DROP TYPE IF EXISTS "ThemeMode";
DROP TYPE IF EXISTS "SessionStatus";
DROP TYPE IF EXISTS "TaskStatus";
