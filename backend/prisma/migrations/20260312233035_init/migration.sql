-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('RUNNING', 'PAUSED', 'COMPLETED', 'BREAK_RUNNING', 'BREAK_COMPLETED', 'BREAK_SKIPPED', 'GIVEN_UP', 'GIVEN_UP_TIMEOUT');

-- CreateEnum
CREATE TYPE "ThemeMode" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MetricEventName" AS ENUM ('APP_FIRST_OPEN', 'AUTH_SIGNUP_SUCCESS', 'AUTH_LOGIN_SUCCESS', 'DASHBOARD_TASK_SET', 'FOCUS_SESSION_COMPLETED', 'REWARD_GRANTED_FIRST_TIME');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" VARCHAR(24) NOT NULL,
    "avatarUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSetting" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "theme" "ThemeMode" NOT NULL DEFAULT 'SYSTEM',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Seoul',
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "deviceInfo" VARCHAR(255),
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(6),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "clientGeneratedId" UUID,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_task_core_not_completed" CHECK (NOT ("isCore" = true AND "status" = 'COMPLETED'))
);

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "clientGeneratedId" UUID,
    "status" "SessionStatus" NOT NULL DEFAULT 'RUNNING',
    "plannedFocusSec" INTEGER NOT NULL DEFAULT 1500,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pauseStartedAt" TIMESTAMPTZ(6),
    "pauseDeadlineAt" TIMESTAMPTZ(6),
    "pauseCount" INTEGER NOT NULL DEFAULT 0,
    "focusEndedAt" TIMESTAMPTZ(6),
    "givenUpAt" TIMESTAMPTZ(6),
    "breakStartedAt" TIMESTAMPTZ(6),
    "breakEndsAt" TIMESTAMPTZ(6),
    "breakEndedAt" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_focus_session_pause_count" CHECK ("pauseCount" BETWEEN 0 AND 1)
);

-- CreateTable
CREATE TABLE "RewardLedger" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sourceSessionId" UUID NOT NULL,
    "spAmount" INTEGER NOT NULL,
    "treeCount" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardLedger_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_reward_ledger_positive" CHECK ("spAmount" > 0 AND "treeCount" > 0)
);

-- CreateTable
CREATE TABLE "UserProgressSnapshot" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "totalSp" INTEGER NOT NULL DEFAULT 0,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "totalCompletedSessions" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserProgressSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyFocusStat" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "statDate" DATE NOT NULL,
    "focusedSeconds" INTEGER NOT NULL DEFAULT 0,
    "completedSessions" INTEGER NOT NULL DEFAULT 0,
    "plantedTrees" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DailyFocusStat_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_daily_focus_stat_non_negative" CHECK ("focusedSeconds" >= 0 AND "completedSessions" >= 0 AND "plantedTrees" >= 0)
);

-- CreateTable
CREATE TABLE "ProductMetricEvent" (
    "eventId" UUID NOT NULL,
    "userId" UUID,
    "focusSessionId" UUID,
    "rewardLedgerId" UUID,
    "deviceId" VARCHAR(255) NOT NULL,
    "eventName" "MetricEventName" NOT NULL,
    "dedupeKey" VARCHAR(255),
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMetricEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "SyncCursor" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deviceId" VARCHAR(255) NOT NULL,
    "lastCursor" VARCHAR(255) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SyncCursor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSetting_userId_key" ON "UserSetting"("userId");

-- CreateIndex
CREATE INDEX "idx_refresh_token_user" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "idx_refresh_token_expires_active" ON "RefreshToken"("expiresAt") WHERE "revokedAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "uq_task_client_generated_id" ON "Task"("clientGeneratedId") WHERE "clientGeneratedId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "idx_task_user_visible_updated" ON "Task"("userId", "status", "updatedAt" DESC) WHERE "deletedAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "uq_task_user_core_active" ON "Task"("userId") WHERE "isCore" = true AND "deletedAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "uq_focus_session_client_generated_id" ON "FocusSession"("clientGeneratedId") WHERE "clientGeneratedId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "idx_focus_session_user_status_pause" ON "FocusSession"("userId", "status", "pauseDeadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_focus_session_user_active" ON "FocusSession"("userId") WHERE "status" IN ('RUNNING', 'PAUSED', 'BREAK_RUNNING');

-- CreateIndex
CREATE UNIQUE INDEX "RewardLedger_sourceSessionId_key" ON "RewardLedger"("sourceSessionId");

-- CreateIndex
CREATE INDEX "idx_reward_ledger_user_created" ON "RewardLedger"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "UserProgressSnapshot_userId_key" ON "UserProgressSnapshot"("userId");

-- CreateIndex
CREATE INDEX "idx_daily_focus_stat_user_date" ON "DailyFocusStat"("userId", "statDate");

-- CreateIndex
CREATE UNIQUE INDEX "uq_daily_focus_stat_user_date" ON "DailyFocusStat"("userId", "statDate");

-- CreateIndex
CREATE INDEX "idx_metric_event_name_occurred" ON "ProductMetricEvent"("eventName", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "idx_metric_event_user_occurred" ON "ProductMetricEvent"("userId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "idx_metric_event_device_occurred" ON "ProductMetricEvent"("deviceId", "occurredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_metric_event_name_dedupe_key" ON "ProductMetricEvent"("eventName", "dedupeKey") WHERE "dedupeKey" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "uq_sync_cursor_user_device" ON "SyncCursor"("userId", "deviceId");

-- AddForeignKey
ALTER TABLE "UserSetting" ADD CONSTRAINT "UserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardLedger" ADD CONSTRAINT "RewardLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardLedger" ADD CONSTRAINT "RewardLedger_sourceSessionId_fkey" FOREIGN KEY ("sourceSessionId") REFERENCES "FocusSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProgressSnapshot" ADD CONSTRAINT "UserProgressSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyFocusStat" ADD CONSTRAINT "DailyFocusStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMetricEvent" ADD CONSTRAINT "ProductMetricEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMetricEvent" ADD CONSTRAINT "ProductMetricEvent_focusSessionId_fkey" FOREIGN KEY ("focusSessionId") REFERENCES "FocusSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMetricEvent" ADD CONSTRAINT "ProductMetricEvent_rewardLedgerId_fkey" FOREIGN KEY ("rewardLedgerId") REFERENCES "RewardLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncCursor" ADD CONSTRAINT "SyncCursor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

