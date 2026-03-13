import type { SessionStatus } from '@/stores/app-store';

export type FocusSession = {
  focusSessionId: string;
  taskId: string;
  status: SessionStatus;
  startedAt: string;
  plannedFocusSec: number;
  pauseCount: number;
  pauseStartedAt: string | null;
  pauseDeadlineAt: string | null;
  focusEndedAt: string | null;
  givenUpAt: string | null;
  breakStartedAt: string | null;
  breakEndsAt: string | null;
  breakEndedAt: string | null;
  version: number;
};

export type CurrentTaskSummary = {
  taskId: string;
  title: string;
  status: 'PENDING' | 'COMPLETED';
  isCore: boolean;
  isLocked: boolean;
};

export type NextTaskCandidate = {
  taskId: string;
  title: string;
  status: 'PENDING' | 'COMPLETED';
};

export type SidebarSummary = {
  completedFocusSessionCount: number;
};

export type FocusPolicy = {
  focusDurationSec: number;
  breakDurationSec: number;
  pauseLimitSec: number;
  maxPauseCount: number;
};

export type FocusReward = {
  awardedSp: number;
  awardedTrees: number;
  totalSp?: number;
  level?: number;
};

export type FocusCompletionPayload = {
  reward: FocusReward;
  dailyStat?: Record<string, unknown>;
  progressSnapshot?: Record<string, unknown>;
};

export type FocusStateSnapshot = {
  hydrated: boolean;
  isBusy: boolean;
  errorMessage: string | null;
  activeSession: FocusSession | null;
  currentTask: CurrentTaskSummary | null;
  nextTaskCandidates: NextTaskCandidate[];
  sidebarSummary: SidebarSummary | null;
  policy: FocusPolicy | null;
  focusEndsAt: string | null;
  pausedRemainingSec: number | null;
  lastReward: FocusReward | null;
  terminalStatus: SessionStatus | null;
};

export type StartFocusResponse = {
  activeSession: FocusSession;
  currentTask: CurrentTaskSummary;
  sidebarSummary: SidebarSummary;
  nextTaskCandidates: NextTaskCandidate[];
  policy: FocusPolicy;
};
