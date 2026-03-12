import { Link, Outlet, useLocation } from 'react-router-dom';

import { AccessibleIconButton } from '@/components/AccessibleIconButton';
import { AppSidebar } from '@/components/navigation/AppSidebar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ROUTES } from '@/lib/constants/routes';
import { cn } from '@/lib/utils/cn';
import { getRouteMeta } from '@/routes/route-meta';

export function AppShell() {
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname);
  const isFocusRoute = Boolean(routeMeta.immersive);

  return (
    <div className={cn('min-h-screen bg-toss-bg text-toss-textMain', isFocusRoute && 'bg-toss-bg')}>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>

      <div className="flex min-h-screen flex-col lg:flex-row">
        {isFocusRoute ? null : <AppSidebar />}

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-sticky border-b border-toss-divider bg-toss-bg/90 px-4 py-4 backdrop-blur md:px-6">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-toss-textSub">
                  Focus Forest
                </p>
                <h1 className="mt-1 truncate text-2xl font-bold text-toss-textMain">
                  {routeMeta.title}
                </h1>
                <p className="mt-1 text-sm text-toss-textSub">{routeMeta.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <AccessibleIconButton
                  ariaLabel="알림 영역 placeholder"
                  disabled
                  title="알림 영역 placeholder"
                  className="disabled:pointer-events-none disabled:cursor-not-allowed disabled:text-toss-textSub"
                >
                  NL
                </AccessibleIconButton>
                <Link
                  to={ROUTES.settings}
                  aria-label="프로필 및 설정으로 이동"
                  className="icon-button"
                >
                  <span aria-hidden="true">PF</span>
                </Link>
              </div>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 md:px-6">
            <main
              id="main-content"
              tabIndex={-1}
              className="min-w-0 flex-1 outline-none"
              aria-label={`${routeMeta.title} 메인 콘텐츠`}
            >
              <Outlet />
            </main>

            {isFocusRoute ? (
              <aside
                className="hidden w-80 shrink-0 xl:block"
                aria-label="집중 보조 요약"
              >
                <div className="surface-panel sticky top-28 space-y-4">
                  <p className="text-sm text-toss-textSub">Read only summary</p>
                  <h2 className="text-lg font-semibold text-toss-textMain">
                    다음 작업 후보 / 오늘 요약
                  </h2>
                  <p className="text-sm text-toss-textSub">
                    집중 모드에서는 이 패널이 조회 전용으로 유지됩니다.
                  </p>
                </div>
              </aside>
            ) : null}
          </div>

          {isFocusRoute ? null : <BottomNav />}
        </div>
      </div>
    </div>
  );
}
