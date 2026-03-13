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
            <h1 className="mt-1 text-2xl font-bold">계정 연결</h1>
          </div>

          <Link to={ROUTES.dashboard} className="button-secondary">
            먼저 둘러보기
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
                언제든 시작 가능
              </span>
              <h2 className="text-2xl font-bold text-toss-textMain">
                계정을 연결하면 집중 기록을 더 오래 안전하게 이어갈 수 있어요.
              </h2>
              <p className="text-sm text-toss-textSub">
                지금 로그인하거나, 먼저 둘러본 뒤 필요할 때 다시 계정을 연결해도 됩니다.
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