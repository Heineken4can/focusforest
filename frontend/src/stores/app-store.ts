import type { ThemeMode } from '@/lib/theme/theme';

type ConnectionState = 'LOCAL' | 'ONLINE' | 'OFFLINE';
type SessionStatus =
  | 'IDLE'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'BREAK_RUNNING'
  | 'GIVEN_UP';

export type AppStoreSnapshot = {
  themeMode: ThemeMode;
  isAuthenticated: boolean;
  connectionState: ConnectionState;
  sessionStatus: SessionStatus;
  selectedTaskId: string | null;
};

const initialSnapshot: AppStoreSnapshot = {
  themeMode: 'system',
  isAuthenticated: false,
  connectionState: 'LOCAL',
  sessionStatus: 'IDLE',
  selectedTaskId: null,
};

let snapshot = initialSnapshot;
const listeners = new Set<() => void>();

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
    listeners.forEach((listener) => listener());
  },
  reset() {
    snapshot = initialSnapshot;
    listeners.forEach((listener) => listener());
  },
};
