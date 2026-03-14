import { useEffect, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageSection } from '@/components/layout/PageSection';
import { InlineAlert } from '@/components/states/InlineAlert';
import { logOut, updateProfile } from '@/features/auth/auth.api';
import { themeOptions } from '@/features/settings/settings.placeholder';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useThemeMode } from '@/hooks/useThemeMode';
import { ROUTES } from '@/lib/constants/routes';
import { appStore } from '@/stores/app-store';

function useIsAuthenticated() {
  return useSyncExternalStore(
    appStore.subscribe,
    () => appStore.getSnapshot().isAuthenticated,
    () => appStore.getSnapshot().isAuthenticated,
  );
}

function useConnectionState() {
  return useSyncExternalStore(
    appStore.subscribe,
    () => appStore.getSnapshot().connectionState,
    () => appStore.getSnapshot().connectionState,
  );
}

function useCurrentUser() {
  return useSyncExternalStore(
    appStore.subscribe,
    () => appStore.getSnapshot().currentUser,
    () => appStore.getSnapshot().currentUser,
  );
}

type FeedbackState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; title?: string; description: string };

export function SettingsPage() {
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode();
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const connectionState = useConnectionState();
  const currentUser = useCurrentUser();
  
  const [logoutFeedback, setLogoutFeedback] = useState<FeedbackState>({ kind: 'idle' });
  const [profileFeedback, setProfileFeedback] = useState<FeedbackState>({ kind: 'idle' });
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? '');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  useDocumentTitle('환경설정');

  useEffect(() => {
    if (currentUser?.displayName) {
      setDisplayName(currentUser.displayName);
    }
  }, [currentUser]);

  useEffect(() => {
    if (profileFeedback.kind === 'success') {
      const timer = setTimeout(() => setProfileFeedback({ kind: 'idle' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [profileFeedback.kind]);

  const isLoggingOut = logoutFeedback.kind === 'loading';
  const isUpdatingProfile = profileFeedback.kind === 'loading';

  async function handleLogout() {
    setLogoutFeedback({ kind: 'loading' });

    try {
      await logOut();
      appStore.clearAuthenticatedSession();
      navigate(ROUTES.auth, { replace: true });
    } catch (error) {
      setLogoutFeedback({
        kind: 'error',
        description: '로그아웃에 실패했습니다. 다시 시도해 주세요.',
      });
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) return;
    
    setProfileFeedback({ kind: 'loading' });
    try {
      const response = await updateProfile({ displayName });
      appStore.updateCurrentUser(response.user);
      setProfileFeedback({ kind: 'success', message: '프로필이 업데이트되었습니다.' });
    } catch (error) {
      setProfileFeedback({
        kind: 'error',
        description: '프로필 업데이트에 실패했습니다.',
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="Appearance"
        title="화면 환경 설정"
        description="테마는 바로 적용되며, 초기 로딩 시 깜빡임을 방지하도록 최적화되어 있습니다."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <article className="surface-panel space-y-4">
            <div>
              <p className="text-sm text-toss-textSub">현재 테마</p>
              <h3 className="mt-2 text-xl font-semibold text-toss-textMain">
                {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
              </h3>
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
                <dd className="text-sm font-semibold text-toss-blue">
                  {connectionState === 'ONLINE' ? '● 온라인' : '○ 로컬 모드'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-toss-textSub">이메일</dt>
                <dd className="text-sm font-semibold text-toss-textMain truncate max-w-[12rem]">
                  {currentUser?.email ?? '연결된 계정 없음'}
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </PageSection>

      <PageSection
        eyebrow="Profile"
        title="프로필 및 개인화"
        description="닉네임과 시간대를 설정하여 나만의 집중 환경을 만드세요."
      >
        <article className="surface-panel">
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="display-name" className="text-sm font-medium text-toss-textSub">닉네임</label>
                <input
                  id="display-name"
                  type="text"
                  className="input-base w-full"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!isAuthenticated || isUpdatingProfile}
                  placeholder="표시될 이름을 입력하세요"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="timezone" className="text-sm font-medium text-toss-textSub">타임존</label>
                <select
                  id="timezone"
                  className="input-base w-full bg-transparent"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={isUpdatingProfile}
                >
                  <option value="Asia/Seoul">Asia/Seoul (GMT+09:00)</option>
                  <option value="UTC">UTC (GMT+00:00)</option>
                  <option value="America/New_York">America/New_York (GMT-05:00)</option>
                </select>
              </div>
            </div>
            
            {isAuthenticated && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  className="button-primary"
                  disabled={isUpdatingProfile || displayName === currentUser?.displayName}
                >
                  {isUpdatingProfile ? '저장 중...' : '변경 사항 저장'}
                </button>
                {profileFeedback.kind === 'success' && (
                  <span className="text-sm text-toss-blue font-medium animate-in fade-in slide-in-from-left-2">
                    {profileFeedback.message}
                  </span>
                )}
              </div>
            )}
            
            {!isAuthenticated && (
              <p className="text-sm text-toss-textSub">로컬 모드에서는 닉네임을 변경할 수 없습니다. 로그인 후 이용해 주세요.</p>
            )}
            
            {profileFeedback.kind === 'error' && (
              <InlineAlert tone="error" description={profileFeedback.description} />
            )}
          </form>
        </article>
      </PageSection>

      {isAuthenticated && (
        <PageSection
          eyebrow="Account"
          title="세션 관리"
          description="현재 계정을 안전하게 종료하고 로그인 화면으로 돌아갈 수 있습니다."
        >
          <article className="surface-panel space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-toss-textMain">로그아웃</h3>
                <p className="text-sm text-toss-textSub">이 기기에서의 세션을 종료합니다.</p>
              </div>
              <button
                type="button"
                className="button-secondary border-toss-red/30 text-toss-red hover:bg-toss-red/10 px-8"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
              </button>
            </div>
            {logoutFeedback.kind === 'error' && (
              <InlineAlert tone="error" description={logoutFeedback.description} />
            )}
          </article>
        </PageSection>
      )}
    </div>
  );
}
