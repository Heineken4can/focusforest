import { apiFetch } from '@/lib/api/client';

import type {
  FocusCompletionPayload,
  FocusSession,
  StartFocusResponse,
} from '@/features/focus/focus.types';

type PauseResponse = { session: FocusSession };
type ResumeResponse = { session: FocusSession };
type SessionTransitionResponse = { session: FocusSession; reward?: FocusCompletionPayload['reward'] };
type StartBreakResponse = { session: FocusSession };
type BreakResponse = { session: FocusSession };

export async function startFocusSession(input: {
  taskId: string;
  taskVersion: number;
  clientGeneratedId: string;
  startedAt: string;
}) {
  return apiFetch<StartFocusResponse>(
    '/focus-sessions',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    { auth: 'required' },
  );
}

export async function pauseFocusSession(sessionId: string, input: { version: number; pausedAt: string }) {
  return apiFetch<PauseResponse>(
    `/focus-sessions/${sessionId}/pause`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
    { auth: 'required' },
  );
}

export async function resumeFocusSession(sessionId: string, input: { version: number; resumedAt: string }) {
  return apiFetch<ResumeResponse>(
    `/focus-sessions/${sessionId}/resume`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
    { auth: 'required' },
  );
}

export async function giveUpFocusSession(sessionId: string, input: { version: number; eventId: string; occurredAt: string; reason?: 'USER_CANCEL' | 'PAUSE_TIMEOUT' }) {
  return apiFetch<SessionTransitionResponse>(
    `/focus-sessions/${sessionId}/give-up`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    { auth: 'required' },
  );
}

export async function completeFocusSession(sessionId: string, input: { version: number; eventId: string; occurredAt: string }) {
  return apiFetch<FocusCompletionPayload & { session: FocusSession }>(
    `/focus-sessions/${sessionId}/complete`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    { auth: 'required' },
  );
}

export async function startBreakSession(sessionId: string, input: { version: number; eventId: string; occurredAt: string }) {
  return apiFetch<StartBreakResponse>(
    `/focus-sessions/${sessionId}/start-break`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    { auth: 'required' },
  );
}

export async function completeBreakSession(sessionId: string, input: { version: number; eventId: string; occurredAt: string }) {
  return apiFetch<BreakResponse>(
    `/focus-sessions/${sessionId}/complete-break`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    { auth: 'required' },
  );
}

export async function skipBreakSession(sessionId: string, input: { version: number; eventId: string; occurredAt: string }) {
  return apiFetch<BreakResponse>(
    `/focus-sessions/${sessionId}/skip-break`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    { auth: 'required' },
  );
}
