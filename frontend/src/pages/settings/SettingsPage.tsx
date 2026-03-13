import { useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageSection } from '@/components/layout/PageSection';
import { EmptyState } from '@/components/states/EmptyState';
import { InlineAlert } from '@/components/states/InlineAlert';
import { logOut } from '@/features/auth/auth.api';
import { settingsSections, themeOptions } from '@/features/settings/settings.placeholder';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useThemeMode } from '@/hooks/useThemeMode';
import { ApiRequestError } from '@/lib/api/client';
import { ROUTES } from '@/lib/constants/routes';
import { appStore } from '@/stores/app-store';

type LogoutFeedback =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; title?: string; description: string };

function getLogoutErrorFeedback(error: unknown): Extract<LogoutFeedback, { kind: 'error' }> {
  if (error instanceof ApiRequestError) {
    if (error.status === 0) {
      return {
        kind: 'error',
        description: '지금은 로그아웃이 어렵습니다. 잠시 후 다시 시도해 주세요.',
      };
    }

    if (error.code === 'AUTH_403_CSRF_INVALID') {
      return {
        kind: 'error',
        title: '세션 확인이 필요합니다',
        description: '다시 로그인해 주세요.',
      };
    }

    return {
      kind: 'error',
      description: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
    };
  }

  return {
    kind: 'error',
    description: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
  };
}

export function SettingsPage() {
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode();
  const navigate = useNavigate();
  const authSnapshot = useSyncExternalStore(
    appStore.subscribe,
    appStore.getSnapshot,
    appStore.getSnapshot,
  );
  const [logoutFeedback, setLogoutFeedback] = useState<LogoutFeedback>({ kind: 'idle' });

  useDocumentTitle('환경설정');

  const isLoggingOut = logoutFeedback.kind === 'loading';

  async function handleLogout() {
    setLogoutFeedback({ kind: 'loading' });

    try {
      await logOut();
      appStore.clearAuthenticatedSession();
      navigate(ROUTES.auth, { replace: true });
    } catch (error) {
      setLogoutFeedback(getLogoutErrorFeedback(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="Appearance"
        title="화면 환경을 내 취향에 맞게 조정하세요"
        description="테마는 바로 적용되며, 현재 사용 중인 계정 정보도 함께 확인할 수 있습니다."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <article className="surface-panel space-y-4">
            <div>
              <p className="text-sm text-toss-textSub">현재 테마</p>
              <h3 className="mt-2 text-xl font-semibold text-toss-textMain">
                {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
              </h3>
              <p className="mt-2 text-sm text-toss-textSub">
                선택한 테마는 다음 방문에도 그대로 유지됩니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={themeMode === option.value}
                  className={themeMode === option.value ? 'button-primary' : 'button-secondary'}
                  onClick={() => setThemeMode(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </article>

          <article className="surface-panel">
            <p className="text-sm text-toss-textSub">계정 요약</p>
            <dl className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-toss-textSub">연결 상태</dt>
                <dd className="text-sm font-semibold text-toss-textMain">
                  {authSnapshot.connectionState}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-toss-textSub">표시 이름</dt>
                <dd className="text-sm font-semibold text-toss-textMain">
                  {authSnapshot.currentUser?.displayName ?? '로컬 모드'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-toss-textSub">이메일</dt>
                <dd className="text-sm font-semibold text-toss-textMain">
                  {authSnapshot.currentUser?.email ?? '연결된 계정 없음'}
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </PageSection>

      <PageSection
        eyebrow="Preferences"
        title="다음 설정도 이어서 준비하고 있어요"
        description="시간 기준과 동기화 관련 설정은 이 화면에서 순서대로 확장됩니다."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {settingsSections.map((section) => (
            <article key={section.title} className="surface-panel-hover">
              <h3 className="text-lg font-semibold">{section.title}</h3>
              <p className="mt-2 text-sm text-toss-textSub">{section.description}</p>
            </article>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Account"
        title="세션 관리"
        description="현재 계정을 안전하게 종료하고 로그인 화면으로 돌아갈 수 있습니다."
      >
        {!authSnapshot.isAuthenticated ? (
          <EmptyState
            title="현재 로그인된 계정이 없습니다"
            description="계정을 연결하면 이 영역에서 언제든 안전하게 로그아웃할 수 있습니다."
          />
        ) : (
          <article className="surface-panel space-y-4" aria-labelledby="logout-panel-title">
            <div>
              <p className="text-sm text-toss-textSub">로그인 세션</p>
              <h3 id="logout-panel-title" className="mt-2 text-xl font-semibold text-toss-textMain">
                {authSnapshot.currentUser?.displayName ?? '연결된 계정'}
              </h3>
              <p className="mt-2 text-sm text-toss-textSub">
                {authSnapshot.currentUser?.email ?? '이메일 정보 없음'}
              </p>
            </div>
            <button
              type="button"
              className="button-secondary w-full sm:w-auto"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-describedby="logout-help"
            >
              {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
            </button>
            <p id="logout-help" className="text-sm text-toss-textSub">
              요청 중에는 중복 제출을 막기 위해 버튼이 잠시 비활성화됩니다.
            </p>
            {logoutFeedback.kind === 'error' ? (
              <InlineAlert
                title={logoutFeedback.title}
                description={logoutFeedback.description}
              />
            ) : null}
          </article>
        )}
      </PageSection>
    </div>
  );
}
