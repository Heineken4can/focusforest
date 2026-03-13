import type { AuthUser } from '@/features/auth/auth.types';
import { readStoredThemeMode, type ThemeMode } from '@/lib/theme/theme';

type ConnectionState = 'LOCAL' | 'ONLINE' | 'OFFLINE';
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

function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }

  return readStoredThemeMode();
}

function createInitialSnapshot(): AppStoreSnapshot {
  return {
    themeMode: getInitialThemeMode(),
    isAuthenticated: false,
    localModeFlag: false,
    connectionState: 'LOCAL',
    sessionStatus: null,
    selectedTaskId: null,
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

function getClearedSessionSnapshot(params: { localModeFlag: boolean }): AppStoreSnapshot {
  return {
    ...snapshot,
    isAuthenticated: false,
    localModeFlag: params.localModeFlag,
    connectionState: params.localModeFlag ? 'LOCAL' : 'LOCAL',
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
    snapshot = { ...snapshot, ...nextSnapshot };
    notifyListeners();
  },
  setAuthenticatedSession(nextSession: {
    accessToken: string;
    accessTokenExpiresAt: string;
    currentUser: AuthUser;
    bootstrapRequired?: boolean;
  }) {
    snapshot = {
      ...snapshot,
      isAuthenticated: true,
      localModeFlag: false,
      connectionState: 'ONLINE',
      accessToken: nextSession.accessToken,
      accessTokenExpiresAt: nextSession.accessTokenExpiresAt,
      currentUser: nextSession.currentUser,
      bootstrapStatus: nextSession.bootstrapRequired ? 'required' : 'completed',
    };
    notifyListeners();
  },
  refreshAccessToken(nextToken: {
    accessToken: string;
    accessTokenExpiresAt: string;
  }) {
    snapshot = {
      ...snapshot,
      isAuthenticated: true,
      localModeFlag: false,
      connectionState: 'ONLINE',
      accessToken: nextToken.accessToken,
      accessTokenExpiresAt: nextToken.accessTokenExpiresAt,
    };
    notifyListeners();
  },
  enterLocalMode() {
    snapshot = getClearedSessionSnapshot({ localModeFlag: true });
    notifyListeners();
  },
  clearAuthenticatedSession() {
    snapshot = getClearedSessionSnapshot({ localModeFlag: false });
    notifyListeners();
  },
  reset() {
    snapshot = createInitialSnapshot();
    notifyListeners();
  },
};