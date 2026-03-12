import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils/cn';
import { routeMetaList } from '@/routes/route-meta';

const shellRoutes = routeMetaList.filter((route) => route.path !== '/auth' && !route.immersive);

export function AppSidebar() {
  return (
    <aside
      className="hidden w-64 shrink-0 border-r border-toss-divider bg-toss-surface lg:block"
      aria-label="주요 탐색"
    >
      <div className="sticky top-0 flex min-h-screen flex-col gap-6 px-5 py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-toss-textSub">
            Navigation
          </p>
          <h2 className="mt-2 text-xl font-bold text-toss-textMain">App Shell</h2>
        </div>

        <nav aria-label="데스크톱 탐색">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {shellRoutes.map((route) => (
              <li key={route.path}>
                <NavLink
                  to={route.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold transition-colors duration-150',
                      isActive
                        ? 'bg-toss-selected text-toss-textMain'
                        : 'text-toss-textSub hover:bg-toss-surfaceHover hover:text-toss-textMain',
                    )
                  }
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-toss-divider bg-toss-bg text-xs">
                    {route.shortLabel}
                  </span>
                  <span>{route.navLabel}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
