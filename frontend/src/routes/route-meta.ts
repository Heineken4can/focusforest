import { ROUTES } from '@/lib/constants/routes';

export type RouteMeta = {
  path: string;
  title: string;
  description: string;
  navLabel: string;
  shortLabel: string;
  immersive?: boolean;
};

export const routeMetaList: RouteMeta[] = [
  {
    path: ROUTES.dashboard,
    title: 'Dashboard',
    description: '오늘의 과제와 통계를 정리하는 준비 화면',
    navLabel: '대시보드',
    shortLabel: 'DB',
  },
  {
    path: ROUTES.focus,
    title: 'Focus',
    description: '타이머와 세션 제어만 남긴 몰입 모드',
    navLabel: '집중',
    shortLabel: 'FC',
    immersive: true,
  },
  {
    path: ROUTES.auth,
    title: 'Auth',
    description: '로그인, 회원가입, 로컬 모드 진입',
    navLabel: '인증',
    shortLabel: 'AU',
  },
  {
    path: ROUTES.settings,
    title: 'Settings',
    description: '테마, 타임존, 동기화 설정',
    navLabel: '설정',
    shortLabel: 'ST',
  },
];

export function getRouteMeta(pathname: string): RouteMeta {
  return (
    routeMetaList.find(
      (route) => pathname === route.path || pathname.startsWith(`${route.path}/`),
    ) ?? {
      path: pathname,
      title: 'Page',
      description: '정의되지 않은 경로',
      navLabel: '페이지',
      shortLabel: 'PG',
    }
  );
}
