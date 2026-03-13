import { apiFetch, refreshAccessToken } from '@/lib/api/client';

import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  SignupRequest,
  SignupResponse,
} from '@/features/auth/auth.types';

export function logIn(payload: LoginRequest) {
  return apiFetch<LoginResponse>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    {
      auth: 'none',
      retryOn401: false,
    },
  );
}

export function signUp(payload: SignupRequest) {
  return apiFetch<SignupResponse>(
    '/auth/signup',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    {
      auth: 'none',
      retryOn401: false,
    },
  );
}

export function refreshSession(params?: { redirectOnFailure?: boolean }) {
  return refreshAccessToken(params);
}

export function logOut() {
  return apiFetch<LogoutResponse>(
    '/auth/logout',
    {
      method: 'POST',
    },
    {
      auth: 'required',
      includeCsrfToken: true,
    },
  );
}