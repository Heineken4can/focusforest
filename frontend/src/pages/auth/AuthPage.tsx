import { useState } from 'react';

import { AccessibleIconButton } from '@/components/AccessibleIconButton';
import { ErrorState } from '@/components/states/ErrorState';
import { LoadingState } from '@/components/states/LoadingState';
import { authBootstrapStates, authTabs } from '@/features/auth/auth.placeholder';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type AuthView = 'login' | 'signup';

export function AuthPage() {
  const [view, setView] = useState<AuthView>('login');
  const [showPassword, setShowPassword] = useState(false);

  useDocumentTitle('Auth');

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <section className="surface-panel space-y-6" aria-labelledby="auth-title">
        <div>
          <p className="text-sm text-toss-textSub">SCR-09</p>
          <h2 id="auth-title" className="mt-2 text-2xl font-bold">
            로그인 / 회원가입 placeholder
          </h2>
          <p className="mt-2 text-sm text-toss-textSub">
            로컬 모드 진입과 bootstrap overlay를 나중에 연결할 수 있도록 폼 구조만 고정합니다.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-full bg-toss-bg p-1">
          {authTabs.map((tab) => {
            const selected = view === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={selected}
                className={selected ? 'button-primary' : 'button-ghost'}
                onClick={() => setView(tab.value)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
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
              />
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
            />
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
                aria-describedby="auth-error"
              />
              <AccessibleIconButton
                ariaLabel={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                onClick={() => setShowPassword((current) => !current)}
                title={showPassword ? '숨기기' : '표시'}
              >
                {showPassword ? 'H' : 'S'}
              </AccessibleIconButton>
            </div>
            <p id="auth-error" className="text-sm text-toss-textSub">
              인증 실패 시 인라인 에러가 이 위치에 연결됩니다.
            </p>
          </div>

          <button type="submit" className="button-primary w-full">
            {view === 'login' ? '로그인' : '회원가입'}
          </button>
          <button type="button" className="button-secondary w-full">
            로그인 없이 시작하기
          </button>
        </form>
      </section>

      <div className="grid gap-4">
        <LoadingState
          title={authBootstrapStates.loading.title}
          description={authBootstrapStates.loading.description}
        />
        <ErrorState
          title={authBootstrapStates.conflict.title}
          description={authBootstrapStates.conflict.description}
          actionLabel="최신 상태 반영 후 계속"
        />
      </div>
    </div>
  );
}
