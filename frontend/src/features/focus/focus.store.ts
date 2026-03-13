import { ApiRequestError } from '@/lib/api/client';
import type { Task } from '@/features/dashboard/task.types';
import {
  completeBreakSession,
  completeFocusSession,
  giveUpFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  skipBreakSession,
  startBreakSession,
  startFocusSession,
} from '@/features/focus/focus.api';
import { readStoredFocusState, writeStoredFocusState } from '@/features/focus/focus.storage';
import type {
  CurrentTaskSummary,
  FocusPolicy,
  FocusReward,
  FocusSession,
  FocusStateSnapshot,
  NextTaskCandidate,
  StartFocusResponse,
} from '@/features/focus/focus.types';
import { appStore, type SessionStatus } from '@/stores/app-store';

const DEFAULT_POLICY: FocusPolicy = {
  focusDurationSec: 1500,
  breakDurationSec: 300,
  pauseLimitSec: 300,
  maxPauseCount: 1,
};

type FocusConflictPayload = {
  entityType: string;
  entityId: string;
  clientVersion?: number;
  serverVersion: number;
  serverSnapshot: unknown;
  conflictFields?: string[];
  resolutionStrategy: string;
  retryable: boolean;
};

function makeUuidV7() {
  const timestamp = BigInt(Date.now());
  const randomBytes = crypto.getRandomValues(new Uint8Array(10));
  const hexTimestamp = timestamp.toString(16).padStart(12, '0');
  const hexRandom = Array.from(randomBytes, (value) => value.toString(16).padStart(2, '0')).join('');
  const randomPartA = hexRandom.slice(0, 4);
  const randomPartB = hexRandom.slice(4, 8);
  const randomPartC = hexRandom.slice(8, 12);
  const randomPartD = hexRandom.slice(12, 24);

  return [
    hexTimestamp.slice(0, 8),
    hexTimestamp.slice(8, 12),
    `7${randomPartA.slice(1)}`,
    `${(8 + Number.parseInt(randomPartB[0] ?? '0', 16) % 4).toString(16)}${randomPartB.slice(1)}`,
    `${randomPartC}${randomPartD}`,
  ].join('-');
}

function computeFocusEndsAt(startedAt: string, plannedFocusSec: number) {
  return new Date(new Date(startedAt).getTime() + plannedFocusSec * 1000).toISOString();
}

function setActiveTaskSession(status: SessionStatus | null, taskId: string | null) {
  appStore.setActiveTaskSession({
    sessionStatus: status,
    selectedTaskId: taskId,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isFocusSession(value: unknown): value is FocusSession {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.focusSessionId === 'string' && typeof value.taskId === 'string' && typeof value.status === 'string';
}

function isStartFocusResponse(value: unknown): value is StartFocusResponse {
  if (!isRecord(value)) {
    return false;
  }

  return isFocusSession(value.activeSession) && Array.isArray(value.nextTaskCandidates) && isRecord(value.currentTask) && isRecord(value.policy);
}

function getConflictPayload(error: unknown): FocusConflictPayload | null {
  if (!(error instanceof ApiRequestError) || !isRecord(error.data)) {
    return null;
  }

  const data = error.data as Record<string, unknown>;

  if (!('serverSnapshot' in data) || !('serverVersion' in data)) {
    return null;
  }

  return data as unknown as FocusConflictPayload;
}

function getFocusErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 0) {
      return '지금은 연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.';
    }

    if (error.code === 'SESSION_409_ALREADY_RUNNING') {
      return '이미 진행 중인 집중 또는 휴식 세션이 있어요.';
    }

    if (error.code === 'SESSION_409_PAUSE_LIMIT') {
      return '이 세션에서는 이미 일시정지를 모두 사용했어요.';
    }

    if (error.code === 'SESSION_409_TIMEOUT') {
      return 'Pause 제한 시간이 지나 세션이 이미 종료되었어요.';
    }

    if (error.code === 'SESSION_409_INVALID_STATE') {
      return '지금 상태에서는 이 동작을 수행할 수 없어요.';
    }

    if (error.code === 'TASK_409_COMPLETED') {
      return '완료된 Task로는 집중 세션을 시작할 수 없어요.';
    }

    if (error.code === 'SYNC_409_CONFLICT') {
      return '세션 정보가 다른 기기에서 변경되어 최신 상태를 다시 확인해 주세요.';
    }

    return error.message;
  }

  return '세션 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

let snapshot: FocusStateSnapshot = readStoredFocusState();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function commitSnapshot(nextSnapshot: FocusStateSnapshot) {
  snapshot = {
    ...nextSnapshot,
    hydrated: true,
  };
  writeStoredFocusState(snapshot);
  notifyListeners();
}

function patchSnapshot(partial: Partial<FocusStateSnapshot>) {
  commitSnapshot({
    ...snapshot,
    ...partial,
  });
}

function getNextTaskCandidates(tasks: Task[], currentTaskId: string): NextTaskCandidate[] {
  return tasks
    .filter((task) => task.id !== currentTaskId && task.status === 'PENDING')
    .slice(0, 2)
    .map((task) => ({
      taskId: task.id,
      title: task.title,
      status: task.status,
    }));
}

function getCurrentTaskSummary(task: Task): CurrentTaskSummary {
  return {
    taskId: task.id,
    title: task.title,
    status: task.status,
    isCore: task.isCore,
    isLocked: true,
  };
}

function buildLocalStartResponse(task: Task, tasks: Task[]): StartFocusResponse {
  const startedAt = new Date().toISOString();
  const activeSession: FocusSession = {
    focusSessionId: makeUuidV7(),
    taskId: task.id,
    status: 'RUNNING',
    startedAt,
    plannedFocusSec: DEFAULT_POLICY.focusDurationSec,
    pauseCount: 0,
    pauseStartedAt: null,
    pauseDeadlineAt: null,
    focusEndedAt: null,
    givenUpAt: null,
    breakStartedAt: null,
    breakEndsAt: null,
    breakEndedAt: null,
    version: 1,
  };

  return {
    activeSession,
    currentTask: getCurrentTaskSummary(task),
    sidebarSummary: {
      completedFocusSessionCount: snapshot.sidebarSummary?.completedFocusSessionCount ?? 0,
    },
    nextTaskCandidates: getNextTaskCandidates(tasks, task.id),
    policy: DEFAULT_POLICY,
  };
}

function setRunningSession(
  session: FocusSession,
  extras: {
    currentTask: CurrentTaskSummary;
    nextTaskCandidates: NextTaskCandidate[];
    sidebarSummary: StartFocusResponse['sidebarSummary'];
    policy: FocusPolicy;
    lastReward?: FocusReward | null;
    errorMessage?: string | null;
  },
) {
  commitSnapshot({
    ...snapshot,
    isBusy: false,
    errorMessage: extras.errorMessage ?? null,
    activeSession: session,
    currentTask: extras.currentTask,
    nextTaskCandidates: extras.nextTaskCandidates,
    sidebarSummary: extras.sidebarSummary,
    policy: extras.policy,
    focusEndsAt: session.status === 'RUNNING' ? computeFocusEndsAt(session.startedAt, session.plannedFocusSec) : null,
    pausedRemainingSec: null,
    lastReward: extras.lastReward ?? snapshot.lastReward,
    terminalStatus: null,
  });
  setActiveTaskSession(session.status, session.taskId);
}

function setCompletedSession(session: FocusSession, reward: FocusReward | null, errorMessage: string | null = null) {
  commitSnapshot({
    ...snapshot,
    isBusy: false,
    errorMessage,
    activeSession: session,
    currentTask: snapshot.currentTask,
    nextTaskCandidates: snapshot.nextTaskCandidates,
    sidebarSummary: snapshot.sidebarSummary,
    policy: snapshot.policy,
    focusEndsAt: null,
    pausedRemainingSec: null,
    lastReward: reward ?? snapshot.lastReward,
    terminalStatus: null,
  });
  setActiveTaskSession(session.status, session.taskId);
}

function clearActiveSession(terminalStatus: SessionStatus | null, reward?: FocusReward | null, incrementCompletedCount = false, errorMessage: string | null = null) {
  const completedFocusSessionCount = snapshot.sidebarSummary?.completedFocusSessionCount ?? 0;

  commitSnapshot({
    ...snapshot,
    isBusy: false,
    errorMessage,
    activeSession: null,
    focusEndsAt: null,
    pausedRemainingSec: null,
    lastReward: reward ?? snapshot.lastReward,
    terminalStatus,
    sidebarSummary: snapshot.sidebarSummary
      ? {
          completedFocusSessionCount: incrementCompletedCount ? completedFocusSessionCount + 1 : completedFocusSessionCount,
        }
      : snapshot.sidebarSummary,
  });
  setActiveTaskSession(null, null);
}

function replaceSessionWithServerSnapshot(serverSnapshot: FocusSession, message: string) {
  if (serverSnapshot.status === 'GIVEN_UP' || serverSnapshot.status === 'GIVEN_UP_TIMEOUT' || serverSnapshot.status === 'BREAK_COMPLETED' || serverSnapshot.status === 'BREAK_SKIPPED') {
    clearActiveSession(serverSnapshot.status, snapshot.lastReward, serverSnapshot.status === 'BREAK_COMPLETED' || serverSnapshot.status === 'BREAK_SKIPPED', message);
    return;
  }

  if (serverSnapshot.status === 'COMPLETED') {
    setCompletedSession(serverSnapshot, snapshot.lastReward, message);
    return;
  }

  commitSnapshot({
    ...snapshot,
    isBusy: false,
    errorMessage: message,
    activeSession: serverSnapshot,
    focusEndsAt: serverSnapshot.status === 'RUNNING' ? computeFocusEndsAt(serverSnapshot.startedAt, serverSnapshot.plannedFocusSec) : null,
    pausedRemainingSec: serverSnapshot.status === 'PAUSED' ? snapshot.pausedRemainingSec : null,
    terminalStatus: null,
  });
  setActiveTaskSession(serverSnapshot.status, serverSnapshot.taskId);
}

function recoverFromRequestError(error: unknown) {
  if (!(error instanceof ApiRequestError)) {
    return;
  }

  if (error.code === 'SESSION_409_TIMEOUT') {
    clearActiveSession('GIVEN_UP_TIMEOUT', snapshot.lastReward, false, getFocusErrorMessage(error));
    return;
  }

  if (error.code === 'SESSION_409_ALREADY_RUNNING' && isStartFocusResponse(error.data)) {
    setRunningSession(error.data.activeSession, {
      currentTask: error.data.currentTask,
      nextTaskCandidates: error.data.nextTaskCandidates,
      sidebarSummary: error.data.sidebarSummary,
      policy: error.data.policy,
      lastReward: snapshot.lastReward,
      errorMessage: getFocusErrorMessage(error),
    });
    return;
  }

  const conflictPayload = getConflictPayload(error);
  const serverSnapshot = conflictPayload?.serverSnapshot;

  if (isFocusSession(serverSnapshot)) {
    replaceSessionWithServerSnapshot(serverSnapshot, getFocusErrorMessage(error));
    return;
  }
}

function getPauseLimitReached(snapshotValue: FocusStateSnapshot) {
  if (!snapshotValue.activeSession || snapshotValue.activeSession.status !== 'RUNNING') {
    return false;
  }

  return snapshotValue.activeSession.pauseCount >= (snapshotValue.policy?.maxPauseCount ?? DEFAULT_POLICY.maxPauseCount);
}

export const focusStore = {
  getSnapshot() {
    return snapshot;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  hydrate() {
    const storedSnapshot = readStoredFocusState();
    commitSnapshot(storedSnapshot);
    setActiveTaskSession(storedSnapshot.activeSession?.status ?? null, storedSnapshot.activeSession?.taskId ?? null);
  },
  clearError() {
    patchSnapshot({ errorMessage: null });
  },
  clearTerminalStatus() {
    patchSnapshot({ terminalStatus: null, lastReward: null, errorMessage: null });
  },
  async startFromTask(task: Task, tasks: Task[], isAuthenticated: boolean) {
    patchSnapshot({ isBusy: true, errorMessage: null, terminalStatus: null });

    try {
      const response = isAuthenticated
        ? await startFocusSession({
            taskId: task.id,
            taskVersion: task.version,
            clientGeneratedId: makeUuidV7(),
            startedAt: new Date().toISOString(),
          })
        : buildLocalStartResponse(task, tasks);

      setRunningSession(response.activeSession, {
        currentTask: response.currentTask,
        nextTaskCandidates: response.nextTaskCandidates,
        sidebarSummary: response.sidebarSummary,
        policy: response.policy,
        lastReward: null,
      });
    } catch (error) {
      recoverFromRequestError(error);
      patchSnapshot({ isBusy: false, errorMessage: getFocusErrorMessage(error) });
      throw error;
    }
  },
  async pause(isAuthenticated: boolean) {
    if (!snapshot.activeSession || snapshot.activeSession.status !== 'RUNNING') {
      return;
    }

    if (getPauseLimitReached(snapshot)) {
      patchSnapshot({ errorMessage: '이 세션에서는 이미 일시정지를 모두 사용했어요.' });
      return;
    }

    const remainingSec = Math.max(
      0,
      Math.ceil((new Date(snapshot.focusEndsAt ?? new Date().toISOString()).getTime() - Date.now()) / 1000),
    );

    patchSnapshot({ isBusy: true, errorMessage: null });

    try {
      const pausedAt = new Date().toISOString();
      const nextSession = isAuthenticated
        ? (await pauseFocusSession(snapshot.activeSession.focusSessionId, {
            version: snapshot.activeSession.version,
            pausedAt,
          })).session
        : {
            ...snapshot.activeSession,
            status: 'PAUSED' as const,
            pauseCount: snapshot.activeSession.pauseCount + 1,
            pauseStartedAt: pausedAt,
            pauseDeadlineAt: new Date(Date.now() + (snapshot.policy?.pauseLimitSec ?? DEFAULT_POLICY.pauseLimitSec) * 1000).toISOString(),
            version: snapshot.activeSession.version + 1,
          };

      commitSnapshot({
        ...snapshot,
        isBusy: false,
        activeSession: nextSession,
        pausedRemainingSec: remainingSec,
        focusEndsAt: null,
        errorMessage: null,
      });
      setActiveTaskSession(nextSession.status, nextSession.taskId);
    } catch (error) {
      recoverFromRequestError(error);
      patchSnapshot({ isBusy: false, errorMessage: getFocusErrorMessage(error) });
    }
  },
  async resume(isAuthenticated: boolean) {
    if (!snapshot.activeSession || snapshot.activeSession.status !== 'PAUSED') {
      return;
    }

    patchSnapshot({ isBusy: true, errorMessage: null });

    try {
      const resumedAt = new Date().toISOString();
      const nextSession = isAuthenticated
        ? (await resumeFocusSession(snapshot.activeSession.focusSessionId, {
            version: snapshot.activeSession.version,
            resumedAt,
          })).session
        : {
            ...snapshot.activeSession,
            status: 'RUNNING' as const,
            pauseStartedAt: null,
            pauseDeadlineAt: null,
            version: snapshot.activeSession.version + 1,
          };

      const remainingSec = snapshot.pausedRemainingSec ?? snapshot.policy?.focusDurationSec ?? DEFAULT_POLICY.focusDurationSec;

      commitSnapshot({
        ...snapshot,
        isBusy: false,
        activeSession: nextSession,
        focusEndsAt: new Date(Date.now() + remainingSec * 1000).toISOString(),
        pausedRemainingSec: null,
        errorMessage: null,
      });
      setActiveTaskSession(nextSession.status, nextSession.taskId);
    } catch (error) {
      recoverFromRequestError(error);
      patchSnapshot({ isBusy: false, errorMessage: getFocusErrorMessage(error) });
    }
  },
  async giveUp(isAuthenticated: boolean, reason: 'USER_CANCEL' | 'PAUSE_TIMEOUT') {
    if (!snapshot.activeSession) {
      return;
    }

    patchSnapshot({ isBusy: true, errorMessage: null });

    try {
      const occurredAt = new Date().toISOString();
      const response = isAuthenticated
        ? await giveUpFocusSession(snapshot.activeSession.focusSessionId, {
            version: snapshot.activeSession.version,
            eventId: makeUuidV7(),
            occurredAt,
            reason,
          })
        : {
            session: {
              ...snapshot.activeSession,
              status: reason === 'PAUSE_TIMEOUT' ? 'GIVEN_UP_TIMEOUT' : 'GIVEN_UP',
              givenUpAt: occurredAt,
              version: snapshot.activeSession.version + 1,
            },
            reward: {
              awardedSp: 0,
              awardedTrees: 0,
            },
          };

      clearActiveSession(response.session.status as SessionStatus, response.reward ?? { awardedSp: 0, awardedTrees: 0 }, false);
    } catch (error) {
      recoverFromRequestError(error);
      patchSnapshot({ isBusy: false, errorMessage: getFocusErrorMessage(error) });
    }
  },
  async startBreak(isAuthenticated: boolean) {
    if (!snapshot.activeSession || snapshot.activeSession.status !== 'COMPLETED') {
      return;
    }

    patchSnapshot({ isBusy: true, errorMessage: null });

    try {
      const occurredAt = new Date().toISOString();
      const response = isAuthenticated
        ? await startBreakSession(snapshot.activeSession.focusSessionId, {
            version: snapshot.activeSession.version,
            eventId: makeUuidV7(),
            occurredAt,
          })
        : {
            session: {
              ...snapshot.activeSession,
              status: 'BREAK_RUNNING' as const,
              breakStartedAt: occurredAt,
              breakEndsAt: new Date(Date.now() + (snapshot.policy?.breakDurationSec ?? DEFAULT_POLICY.breakDurationSec) * 1000).toISOString(),
              version: snapshot.activeSession.version + 1,
            },
          };

      commitSnapshot({
        ...snapshot,
        isBusy: false,
        activeSession: response.session,
        focusEndsAt: null,
        pausedRemainingSec: null,
        terminalStatus: null,
        errorMessage: null,
      });
      setActiveTaskSession(response.session.status, response.session.taskId);
    } catch (error) {
      recoverFromRequestError(error);
      patchSnapshot({ isBusy: false, errorMessage: getFocusErrorMessage(error) });
    }
  },
  async complete(isAuthenticated: boolean) {
    if (!snapshot.activeSession || snapshot.activeSession.status !== 'RUNNING' || !snapshot.currentTask) {
      return;
    }

    patchSnapshot({ isBusy: true, errorMessage: null });

    try {
      const occurredAt = new Date().toISOString();
      const completionResponse = isAuthenticated
        ? await completeFocusSession(snapshot.activeSession.focusSessionId, {
            version: snapshot.activeSession.version,
            eventId: makeUuidV7(),
            occurredAt,
          })
        : {
            session: {
              ...snapshot.activeSession,
              status: 'COMPLETED' as const,
              focusEndedAt: occurredAt,
              version: snapshot.activeSession.version + 1,
            },
            reward: {
              awardedSp: 100,
              awardedTrees: 1,
            },
          };

      setCompletedSession(completionResponse.session, completionResponse.reward ?? null);
      await focusStore.startBreak(isAuthenticated);
    } catch (error) {
      recoverFromRequestError(error);
      patchSnapshot({ isBusy: false, errorMessage: getFocusErrorMessage(error) });
    }
  },
  async completeBreak(isAuthenticated: boolean) {
    if (!snapshot.activeSession || snapshot.activeSession.status !== 'BREAK_RUNNING') {
      return;
    }

    patchSnapshot({ isBusy: true, errorMessage: null });

    try {
      const occurredAt = new Date().toISOString();
      const response = isAuthenticated
        ? await completeBreakSession(snapshot.activeSession.focusSessionId, {
            version: snapshot.activeSession.version,
            eventId: makeUuidV7(),
            occurredAt,
          })
        : {
            session: {
              ...snapshot.activeSession,
              status: 'BREAK_COMPLETED' as const,
              breakEndedAt: occurredAt,
              version: snapshot.activeSession.version + 1,
            },
          };

      clearActiveSession(response.session.status, snapshot.lastReward, true);
    } catch (error) {
      recoverFromRequestError(error);
      patchSnapshot({ isBusy: false, errorMessage: getFocusErrorMessage(error) });
    }
  },
  async skipBreak(isAuthenticated: boolean) {
    if (!snapshot.activeSession || snapshot.activeSession.status !== 'BREAK_RUNNING') {
      return;
    }

    patchSnapshot({ isBusy: true, errorMessage: null });

    try {
      const occurredAt = new Date().toISOString();
      const response = isAuthenticated
        ? await skipBreakSession(snapshot.activeSession.focusSessionId, {
            version: snapshot.activeSession.version,
            eventId: makeUuidV7(),
            occurredAt,
          })
        : {
            session: {
              ...snapshot.activeSession,
              status: 'BREAK_SKIPPED' as const,
              breakEndedAt: occurredAt,
              version: snapshot.activeSession.version + 1,
            },
          };

      clearActiveSession(response.session.status, snapshot.lastReward, true);
    } catch (error) {
      recoverFromRequestError(error);
      patchSnapshot({ isBusy: false, errorMessage: getFocusErrorMessage(error) });
    }
  },
};
