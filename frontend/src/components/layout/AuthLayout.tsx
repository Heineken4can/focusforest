import { Link, Outlet } from 'react-router-dom';

import { ROUTES } from '@/lib/constants/routes';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-toss-bg text-toss-textMain">
      <a className="skip-link" href="#auth-main">
        인증 본문으로 건너뛰기
      </a>

      <header className="border-b border-toss-divider px-4 py-4 md:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-toss-textSub">
              Focus Forest
            </p>
            <h1 className="mt-1 text-2xl font-bold">Auth</h1>
          </div>

          <Link to={ROUTES.dashboard} className="button-secondary">
            대시보드 미리보기
          </Link>
        </div>
      </header>

      <main
        id="auth-main"
        tabIndex={-1}
        className="mx-auto flex min-h-[calc(100vh-81px)] w-full max-w-6xl items-center px-4 py-10 outline-none md:px-6"
      >
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="surface-panel space-y-4">
              <span className="status-badge border-toss-green/30 text-toss-green">
                LOCAL-FIRST
              </span>
              <h2 className="text-2xl font-bold text-toss-textMain">
                계정 연결 전에도 핵심 집중 루프를 유지합니다.
              </h2>
              <p className="text-sm text-toss-textSub">
                이 레이아웃은 로그인, 회원가입, bootstrap 동기화 overlay의 진입점을 위한 최소 골격입니다.
              </p>
            </div>
          </aside>

          <section aria-label="인증 폼 영역">
            <Outlet />
          </section>
        </div>
      </main>
    </div>
  );
}
