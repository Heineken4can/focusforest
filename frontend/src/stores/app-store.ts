import type { AuthUser } from '@/features/auth/auth.types';
import { readStoredThemeMode, type ThemeMode } from '@/lib/theme/theme';

type ConnectionState = 'LOCAL' | 'ONLINE';
export type SessionStatus =
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'BREAK_RUNNING'
  | 'BREAK_SKIPPED'
  | 'BREAK_COMPLETED'
  | 'GIVEN_UP'
  | 'GIVEN_UP_TIMEOUT';

export type BootstrapStatus = 'idle' | 'required' | 'completed';

export type AppStoreSnapshot = {
  themeMode: ThemeMode;
  isAuthenticated: boolean;
  localModeFlag: boolean;
  connectionState: ConnectionState;
  sessionStatus: SessionStatus | null;
  selectedTaskId: string | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  currentUser: AuthUser | null;
  bootstrapStatus: BootstrapStatus;
};

const ACTIVE_SESSION_STORAGE_KEY = 'focus-forest.active-session.v1';

function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }

  return readStoredThemeMode();
}

function readStoredActiveSession(): Pick<AppStoreSnapshot, 'sessionStatus' | 'selectedTaskId'> {
  if (typeof window === 'undefined') {
    return {
      sessionStatus: null,
      selectedTaskId: null,
    };
  }

  try {
    const rawValue = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);

    if (!rawValue) {
      return {
        sessionStatus: null,
        selectedTaskId: null,
      };
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!parsedValue || typeof parsedValue !== 'object') {
      return {
        sessionStatus: null,
        selectedTaskId: null,
      };
    }

    const candidate = parsedValue as Partial<Pick<AppStoreSnapshot, 'sessionStatus' | 'selectedTaskId'>>;
    const allowedStatuses: SessionStatus[] = [
      'RUNNING',
      'PAUSED',
      'COMPLETED',
      'BREAK_RUNNING',
      'BREAK_SKIPPED',
      'BREAK_COMPLETED',
      'GIVEN_UP',
      'GIVEN_UP_TIMEOUT',
    ];

    return {
      sessionStatus:
        candidate.sessionStatus && allowedStatuses.includes(candidate.sessionStatus)
          ? candidate.sessionStatus
          : null,
      selectedTaskId: typeof candidate.selectedTaskId === 'string' ? candidate.selectedTaskId : null,
    };
  } catch {
    return {
      sessionStatus: null,
      selectedTaskId: null,
    };
  }
}

function persistActiveSession(snapshotValue: AppStoreSnapshot) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!snapshotValue.sessionStatus || !snapshotValue.selectedTaskId) {
    window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    ACTIVE_SESSION_STORAGE_KEY,
    JSON.stringify({
      sessionStatus: snapshotValue.sessionStatus,
      selectedTaskId: snapshotValue.selectedTaskId,
    }),
  );
}

function createInitialSnapshot(): AppStoreSnapshot {
  const activeSession = readStoredActiveSession();

  return {
    themeMode: getInitialThemeMode(),
    isAuthenticated: false,
    localModeFlag: false,
    connectionState: 'LOCAL',
    sessionStatus: activeSession.sessionStatus,
    selectedTaskId: activeSession.selectedTaskId,
    accessToken: null,
    accessTokenExpiresAt: null,
    currentUser: null,
    bootstrapStatus: 'idle',
  };
}

let snapshot = createInitialSnapshot();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function commitSnapshot(nextSnapshot: AppStoreSnapshot) {
  snapshot = nextSnapshot;
  persistActiveSession(snapshot);
  notifyListeners();
}

function getClearedSessionSnapshot(params: { localModeFlag: boolean }): AppStoreSnapshot {
  return {
    ...snapshot,
    isAuthenticated: false,
    localModeFlag: params.localModeFlag,
    connectionState: 'LOCAL',
    sessionStatus: null,
    selectedTaskId: null,
    accessToken: null,
    accessTokenExpiresAt: null,
    currentUser: null,
    bootstrapStatus: 'idle',
  };
}

export const appStore = {
  getSnapshot(): AppStoreSnapshot {
    return snapshot;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setSnapshot(nextSnapshot: Partial<AppStoreSnapshot>) {
    commitSnapshot({ ...snapshot, ...nextSnapshot });
  },
  setAuthenticatedSession(nextSession: {
    accessToken: string;
    accessTokenExpiresAt: string;
    currentUser: AuthUser;
    bootstrapRequired?: boolean;
  }) {
    commitSnapshot({
      ...snapshot,
      isAuthenticated: true,
      localModeFlag: false,
      connectionState: 'ONLINE',
      accessToken: nextSession.accessToken,
      accessTokenExpiresAt: nextSession.accessTokenExpiresAt,
      currentUser: nextSession.currentUser,
      bootstrapStatus: nextSession.bootstrapRequired ? 'required' : 'completed',
    });
  },
  refreshAccessToken(nextToken: {
    accessToken: string;
    accessTokenExpiresAt: string;
  }) {
    commitSnapshot({
      ...snapshot,
      isAuthenticated: true,
      localModeFlag: false,
      connectionState: 'ONLINE',
      accessToken: nextToken.accessToken,
      accessTokenExpiresAt: nextToken.accessTokenExpiresAt,
    });
  },
  setActiveTaskSession(nextSession: {
    sessionStatus: SessionStatus | null;
    selectedTaskId: string | null;
  }) {
    commitSnapshot({
      ...snapshot,
      sessionStatus: nextSession.sessionStatus,
      selectedTaskId: nextSession.selectedTaskId,
    });
  },
  hydrateActiveTaskSession() {
    const activeSession = readStoredActiveSession();

    commitSnapshot({
      ...snapshot,
      sessionStatus: activeSession.sessionStatus,
      selectedTaskId: activeSession.selectedTaskId,
    });
  },
  enterLocalMode() {
    commitSnapshot(getClearedSessionSnapshot({ localModeFlag: true }));
  },
  clearAuthenticatedSession() {
    commitSnapshot(getClearedSessionSnapshot({ localModeFlag: false }));
  },
  reset() {
    commitSnapshot(createInitialSnapshot());
  },
};
