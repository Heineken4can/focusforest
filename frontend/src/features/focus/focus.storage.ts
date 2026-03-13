import type { FocusStateSnapshot } from '@/features/focus/focus.types';

const FOCUS_STATE_STORAGE_KEY = 'focus-forest.focus-state.v1';

export const DEFAULT_FOCUS_STATE: FocusStateSnapshot = {
  hydrated: false,
  isBusy: false,
  errorMessage: null,
  activeSession: null,
  currentTask: null,
  nextTaskCandidates: [],
  sidebarSummary: null,
  policy: null,
  focusEndsAt: null,
  pausedRemainingSec: null,
  lastReward: null,
  terminalStatus: null,
};

export function readStoredFocusState(): FocusStateSnapshot {
  if (typeof window === 'undefined') {
    return DEFAULT_FOCUS_STATE;
  }

  try {
    const rawValue = window.localStorage.getItem(FOCUS_STATE_STORAGE_KEY);

    if (!rawValue) {
      return DEFAULT_FOCUS_STATE;
    }

    return {
      ...DEFAULT_FOCUS_STATE,
      ...(JSON.parse(rawValue) as Partial<FocusStateSnapshot>),
      hydrated: true,
    };
  } catch {
    return DEFAULT_FOCUS_STATE;
  }
}

export function writeStoredFocusState(snapshot: FocusStateSnapshot) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(FOCUS_STATE_STORAGE_KEY, JSON.stringify(snapshot));
}
