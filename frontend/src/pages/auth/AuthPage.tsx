import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { AccessibleIconButton } from '@/components/AccessibleIconButton';
import { InlineAlert } from '@/components/states/InlineAlert';
import { logIn, signUp } from '@/features/auth/auth.api';
import { authTabs } from '@/features/auth/auth.placeholder';
import type { LoginResponse, SignupResponse } from '@/features/auth/auth.types';
import { ApiRequestError } from '@/lib/api/client';
import { ROUTES } from '@/lib/constants/routes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { appStore } from '@/stores/app-store';

type AuthView = 'login' | 'signup';
type AuthField = 'displayName' | 'email' | 'password';

type AuthFormState = {
  displayName: string;
  email: string;
  password: string;
};

type AuthFormErrors = Partial<Record<AuthField, string>>;

type SubmitFeedback =
  | { kind: 'idle' }
  | { kind: 'submitting'; view: AuthView }
  | { kind: 'bootstrap-loading' };

type InlineAuthAlert = {
  message: string;
};

type PageAlert = {
  title: string;
  description: string;
};

type AuthLocationState = {
  from?: string;
  sessionExpired?: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const MAX_DISPLAY_NAME_LENGTH = 24;

function validateAuthForm(view: AuthView, formState: AuthFormState): AuthFormErrors {
  const nextErrors: AuthFormErrors = {};

  if (view === 'signup') {
    const displayName = formState.displayName.trim();

    if (!displayName) {
      nextErrors.displayName = '표시 이름을 입력해 주세요.';
    } else if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
      nextErrors.displayName = '표시 이름은 24자 이하로 입력해 주세요.';
    }
  }

  if (!EMAIL_PATTERN.test(formState.email.trim())) {
    nextErrors.email = '올바른 이메일 형식을 입력해 주세요.';
  }

  if (formState.password.length < MIN_PASSWORD_LENGTH) {
    nextErrors.password = '비밀번호는 8자 이상이어야 합니다.';
  } else if (formState.password.length > MAX_PASSWORD_LENGTH) {
    nextErrors.password = '비밀번호는 72자 이하여야 합니다.';
  }

  return nextErrors;
}

function getFieldDescriptionId(fieldName: AuthField, hasError: boolean): string | undefined {
  return hasError ? `${fieldName}-error` : undefined;
}

function getInlineAuthErrorMessage(view: AuthView, error: ApiRequestError): string {
  if (error.status === 0) {
    return '지금은 연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.';
  }

  if (error.code === 'AUTH_429_RATE_LIMIT') {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  }

  return view === 'login'
    ? '이메일 또는 비밀번호를 다시 확인해 주세요.'
    : '입력한 정보를 다시 확인해 주세요.';
}

function hasBootstrapRequired(
  response: LoginResponse | SignupResponse,
): response is LoginResponse {
  return 'bootstrapRequired' in response;
}

function getInitialPageAlert(
  searchParams: URLSearchParams,
  locationState: AuthLocationState | null,
): PageAlert | null {
  if (searchParams.get('reason') === 'session-expired' || locationState?.sessionExpired) {
    return {
      title: '로그인이 만료되었어요',
      description: '다시 로그인해 주세요. 이 기기의 기록은 그대로 유지됩니다.',
    };
  }

  return null;
}

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = (location.state ?? null) as AuthLocationState | null;
  const [view, setView] = useState<AuthView>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [formState, setFormState] = useState<AuthFormState>({
    displayName: '',
    email: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<AuthFormErrors>({});
  const [pageAlert, setPageAlert] = useState<PageAlert | null>(() =>
    getInitialPageAlert(searchParams, locationState),
  );
  const [inlineAuthAlert, setInlineAuthAlert] = useState<InlineAuthAlert | null>(null);
  const [submitFeedback, setSubmitFeedback] = useState<SubmitFeedback>({ kind: 'idle' });

  useDocumentTitle('회원가입 및 로그인');

  useEffect(() => {
    if (submitFeedback.kind !== 'bootstrap-loading') {
      return;
    }

    const timer = window.setTimeout(() => {
      appStore.setSnapshot({ bootstrapStatus: 'completed' });
      navigate(ROUTES.dashboard, { replace: true });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [navigate, submitFeedback]);

  function handleTabChange(nextView: AuthView) {
    setView(nextView);
    setFormErrors({});
    setPageAlert(null);
    setInlineAuthAlert(null);
    setSubmitFeedback({ kind: 'idle' });
  }

  function handleFieldChange(field: AuthField, value: string) {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
    setPageAlert(null);
    setInlineAuthAlert(null);
    if (submitFeedback.kind !== 'idle') {
      setSubmitFeedback({ kind: 'idle' });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateAuthForm(view, formState);

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setInlineAuthAlert(null);
      setSubmitFeedback({ kind: 'idle' });
      return;
    }

    setFormErrors({});
    setPageAlert(null);
    setInlineAuthAlert(null);
    setSubmitFeedback({ kind: 'submitting', view });

    try {
      const response =
        view === 'login'
          ? await logIn({
              email: formState.email.trim(),
              password: formState.password,
            })
          : await signUp({
              displayName: formState.displayName.trim(),
              email: formState.email.trim(),
              password: formState.password,
            });

      appStore.setAuthenticatedSession({
        accessToken: response.accessToken,
        accessTokenExpiresAt: response.accessTokenExpiresAt,
        currentUser: response.user,
        bootstrapRequired: hasBootstrapRequired(response) ? response.bootstrapRequired : false,
      });

      setShowPassword(false);

      if (hasBootstrapRequired(response) && response.bootstrapRequired) {
        setSubmitFeedback({ kind: 'bootstrap-loading' });
        return;
      }

      navigate(ROUTES.dashboard, { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setInlineAuthAlert({
          message: getInlineAuthErrorMessage(view, error),
        });
        setSubmitFeedback({ kind: 'idle' });
        return;
      }

      setInlineAuthAlert({
        message: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
      setSubmitFeedback({ kind: 'idle' });
    }
  }

  const isSubmitting =
    submitFeedback.kind === 'submitting' || submitFeedback.kind === 'bootstrap-loading';

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <section className="surface-panel space-y-6" aria-labelledby="auth-title">
        <div>
          <h2 id="auth-title" className="text-2xl font-bold">
            로그인하고 숲을 이어가세요
          </h2>
          <p className="mt-2 text-sm text-toss-textSub">
            계정을 연결하면 집중 기록과 보상을 안전하게 보관하고, 다른 기기에서도 이어서 사용할 수 있어요.
          </p>
        </div>

        {pageAlert ? (
          <InlineAlert title={pageAlert.title} description={pageAlert.description} tone="neutral" />
        ) : null}

        <div
          className="grid grid-cols-2 gap-2 rounded-full bg-toss-bg p-1"
          role="tablist"
          aria-label="인증 방식 선택"
        >
          {authTabs.map((tab) => {
            const selected = view === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${tab.value}-panel`}
                id={`${tab.value}-tab`}
                className={selected ? 'button-primary' : 'button-ghost'}
                onClick={() => handleTabChange(tab.value)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <form
          className="space-y-4"
          onSubmit={handleSubmit}
          id={`${view}-panel`}
          role="tabpanel"
          aria-labelledby={`${view}-tab`}
        >
          {view === 'signup' ? (
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium text-toss-textMain">
                표시 이름
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                placeholder="집중의 숲에서 사용할 이름"
                className="field-shell w-full"
                value={formState.displayName}
                onChange={(event) => handleFieldChange('displayName', event.target.value)}
                aria-invalid={Boolean(formErrors.displayName)}
                aria-describedby={getFieldDescriptionId('displayName', Boolean(formErrors.displayName))}
                disabled={isSubmitting}
                autoComplete="nickname"
              />
              {formErrors.displayName ? (
                <p id="displayName-error" className="text-sm text-toss-red" role="alert">
                  {formErrors.displayName}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-toss-textMain">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              className="field-shell w-full"
              value={formState.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              aria-invalid={Boolean(formErrors.email)}
              aria-describedby={getFieldDescriptionId('email', Boolean(formErrors.email))}
              disabled={isSubmitting}
              autoComplete="email"
            />
            {formErrors.email ? (
              <p id="email-error" className="text-sm text-toss-red" role="alert">
                {formErrors.email}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-toss-textMain">
              비밀번호
            </label>
            <div className="flex items-center gap-2">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="8자 이상"
                className="field-shell w-full"
                value={formState.password}
                onChange={(event) => handleFieldChange('password', event.target.value)}
                aria-invalid={Boolean(formErrors.password)}
                aria-describedby={getFieldDescriptionId('password', Boolean(formErrors.password))}
                disabled={isSubmitting}
                autoComplete={view === 'login' ? 'current-password' : 'new-password'}
              />
              <AccessibleIconButton
                ariaLabel={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                onClick={() => setShowPassword((current) => !current)}
                title={showPassword ? '숨기기' : '표시'}
                disabled={isSubmitting}
              >
                {showPassword ? 'H' : 'S'}
              </AccessibleIconButton>
            </div>
            {formErrors.password ? (
              <p id="password-error" className="text-sm text-toss-red" role="alert">
                {formErrors.password}
              </p>
            ) : (
              <p className="text-sm text-toss-textSub">
                {view === 'signup'
                  ? '비밀번호는 8자 이상 72자 이하로 입력해 주세요.'
                  : '비밀번호는 대소문자를 구분합니다.'}
              </p>
            )}
          </div>

          {inlineAuthAlert ? <InlineAlert description={inlineAuthAlert.message} /> : null}

          <div className="space-y-3 pt-2">
            <button type="submit" className="button-primary w-full" disabled={isSubmitting}>
              {isSubmitting
                ? view === 'login'
                  ? '로그인 중...'
                  : '회원가입 중...'
                : view === 'login'
                  ? '로그인'
                  : '회원가입'}
            </button>

            <div className="rounded-2xl border border-toss-divider bg-toss-bg px-4 py-4">
              <p className="text-sm font-medium text-toss-textMain">계정 없이 먼저 둘러보고 싶으신가요?</p>
              <p className="mt-1 text-sm text-toss-textSub">
                지금 바로 시작하고, 필요할 때 계정을 연결해도 됩니다.
              </p>
              <button
                type="button"
                className="button-secondary mt-4 w-full"
                disabled={isSubmitting}
                onClick={() => {
                  appStore.enterLocalMode();
                  navigate(ROUTES.dashboard);
                }}
              >
                로그인 없이 시작하기
              </button>
            </div>
          </div>
        </form>
      </section>

      {submitFeedback.kind === 'bootstrap-loading' ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-toss-overlay/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bootstrap-loading-title"
          aria-describedby="bootstrap-loading-description"
        >
          <section className="surface-panel w-full max-w-md" aria-busy="true" aria-live="polite">
            <h3 id="bootstrap-loading-title" className="text-xl font-semibold text-toss-textMain">
              기록을 불러오고 있어요
            </h3>
            <p id="bootstrap-loading-description" className="mt-3 text-sm text-toss-textSub">
              잠시만 기다려 주세요.
            </p>
            <div className="mt-5 space-y-3">
              <div className="placeholder-line w-3/4" />
              <div className="placeholder-line w-full" />
              <div className="placeholder-line w-5/6" />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
