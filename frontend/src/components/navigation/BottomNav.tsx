import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils/cn';
import { routeMetaList } from '@/routes/route-meta';

const mobileRoutes = routeMetaList.filter((route) => route.showInNavigation !== false);

export function BottomNav() {
  return (
    <nav
      className="sticky bottom-0 z-sticky border-t border-toss-divider bg-toss-surface/95 px-4 py-3 backdrop-blur lg:hidden"
      aria-label="모바일 주요 탐색"
    >
      <ul className="m-0 flex list-none items-center justify-between gap-2 p-0">
        {mobileRoutes.map((route) => (
          <li key={route.path} className="flex-1">
            <NavLink
              to={route.path}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center rounded-2xl text-xs font-semibold transition-colors duration-150',
                  isActive
                    ? 'bg-toss-selected text-toss-textMain'
                    : 'text-toss-textSub hover:bg-toss-surfaceHover hover:text-toss-textMain',
                )
              }
            >
              <span className="text-[11px] uppercase tracking-[0.12em]">{route.shortLabel}</span>
              <span className="mt-1">{route.navLabel}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}