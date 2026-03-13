import { ROUTES } from '@/lib/constants/routes';
import { appStore } from '@/stores/app-store';

type ApiSuccessResponse<TData> = {
  status: 'success';
  message: string;
  data: TData;
  meta?: Record<string, unknown>;
};

type ApiErrorResponse = {
  status: 'error';
  message: string;
  code?: string;
  data?: unknown;
  meta?: Record<string, unknown>;
};

type ApiRequestOptions = {
  auth?: 'required' | 'optional' | 'none';
  includeCsrfToken?: boolean;
  retryOn401?: boolean;
};

type ResolvedApiRequestOptions = Required<ApiRequestOptions>;

type RefreshSessionResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
};

const FALLBACK_API_BASE_URL = 'http://localhost:3000/api/v1';
const DEFAULT_API_REQUEST_OPTIONS: ResolvedApiRequestOptions = {
  auth: 'optional',
  includeCsrfToken: false,
  retryOn401: true,
};

let refreshRequestPromise: Promise<RefreshSessionResponse> | null = null;

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  data?: unknown;

  constructor(params: {
    message: string;
    status: number;
    code?: string;
    data?: unknown;
  }) {
    super(params.message);
    this.name = 'ApiRequestError';
    this.status = params.status;
    this.code = params.code;
    this.data = params.data;
  }
}

function getDefaultApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return FALLBACK_API_BASE_URL;
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${window.location.hostname}:3000/api/v1`;
}

export function getApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const apiBaseUrl = configuredBaseUrl || getDefaultApiBaseUrl();

  return apiBaseUrl.replace(/\/+$/, '');
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

function normalizeApiPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function readCookieValue(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const encodedPrefix = `${encodeURIComponent(name)}=`;
  const cookieEntry = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(encodedPrefix));

  if (!cookieEntry) {
    return null;
  }

  return decodeURIComponent(cookieEntry.slice(encodedPrefix.length));
}

function getCsrfToken(): string | null {
  return readCookieValue('csrfToken');
}

function resolveApiRequestOptions(options: ApiRequestOptions = {}): ResolvedApiRequestOptions {
  return {
    ...DEFAULT_API_REQUEST_OPTIONS,
    ...options,
  };
}

function buildHeaders(init: RequestInit, options: ResolvedApiRequestOptions): Headers {
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const accessToken = appStore.getSnapshot().accessToken;

  if (
    options.auth !== 'none' &&
    accessToken &&
    !headers.has('Authorization')
  ) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (options.includeCsrfToken && !headers.has('X-CSRF-Token')) {
    const csrfToken = getCsrfToken();

    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  return headers;
}

async function parseJsonResponse<TData>(
  response: Response,
): Promise<ApiSuccessResponse<TData> | ApiErrorResponse | null> {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  return (await response.json()) as ApiSuccessResponse<TData> | ApiErrorResponse;
}

function isRefreshEligible(
  path: string,
  options: ResolvedApiRequestOptions,
  hasRetriedAfterRefresh: boolean,
): boolean {
  if (hasRetriedAfterRefresh || !options.retryOn401 || options.auth === 'none') {
    return false;
  }

  const normalizedPath = normalizeApiPath(path);

  return normalizedPath !== '/auth/refresh' && normalizedPath !== '/auth/login' && normalizedPath !== '/auth/signup';
}

function redirectToAuth(reason?: 'session-expired') {
  if (typeof window === 'undefined') {
    return;
  }

  const targetUrl = reason ? `${ROUTES.auth}?reason=${reason}` : ROUTES.auth;

  if (`${window.location.pathname}${window.location.search}` !== targetUrl) {
    window.location.assign(targetUrl);
  }
}

async function requestJson<TData>(
  path: string,
  init: RequestInit,
  options: ResolvedApiRequestOptions,
  hasRetriedAfterRefresh: boolean,
): Promise<TData> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      ...init,
      credentials: 'include',
      headers: buildHeaders(init, options),
    });
  } catch {
    throw new ApiRequestError({
      message: '지금은 연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.',
      status: 0,
    });
  }

  const payload = await parseJsonResponse<TData>(response);

  if (response.status === 401 && isRefreshEligible(path, options, hasRetriedAfterRefresh)) {
    await refreshAccessToken();

    return requestJson(path, init, options, true);
  }

  if (!response.ok || payload?.status === 'error') {
    throw new ApiRequestError({
      message: payload?.message ?? '요청을 처리하지 못했어요.',
      status: response.status,
      code: payload?.status === 'error' ? payload.code : undefined,
      data: payload?.status === 'error' ? payload.data : undefined,
    });
  }

  if (!payload || payload.status !== 'success') {
    throw new ApiRequestError({
      message: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
      status: response.status,
    });
  }

  return payload.data;
}

export async function refreshAccessToken(params?: {
  redirectOnFailure?: boolean;
}): Promise<RefreshSessionResponse> {
  if (refreshRequestPromise) {
    return refreshRequestPromise;
  }

  const redirectOnFailure = params?.redirectOnFailure ?? true;

  refreshRequestPromise = requestJson<RefreshSessionResponse>(
    '/auth/refresh',
    {
      method: 'POST',
    },
    resolveApiRequestOptions({
      auth: 'none',
      includeCsrfToken: true,
      retryOn401: false,
    }),
    true,
  )
    .then((data) => {
      appStore.refreshAccessToken(data);
      return data;
    })
    .catch((error) => {
      appStore.clearAuthenticatedSession();

      if (redirectOnFailure) {
        redirectToAuth('session-expired');
      }

      throw error;
    })
    .finally(() => {
      refreshRequestPromise = null;
    });

  return refreshRequestPromise;
}

export function clearSessionAndRedirectToAuth() {
  appStore.clearAuthenticatedSession();
  redirectToAuth();
}

export async function apiFetch<TData>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<TData> {
  return requestJson(path, init, resolveApiRequestOptions(options), false);
}
