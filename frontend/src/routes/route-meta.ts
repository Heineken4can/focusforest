import { ROUTES } from '@/lib/constants/routes';

export type RouteMeta = {
  path: string;
  title: string;
  description: string;
  navLabel: string;
  shortLabel: string;
  showInNavigation?: boolean;
  immersive?: boolean;
};

export const routeMetaList: RouteMeta[] = [
  {
    path: ROUTES.dashboard,
    title: '대시보드',
    description: '오늘의 과제와 집중 기록을 확인하세요.',
    navLabel: '대시보드',
    shortLabel: 'DB',
  },
  {
    path: ROUTES.focus,
    title: '집중',
    description: '지금 가장 중요한 한 가지에 몰입하는 시간입니다.',
    navLabel: '집중',
    shortLabel: 'FC',
    immersive: true,
  },
  {
    path: ROUTES.auth,
    title: '계정 연결',
    description: '로그인하거나 회원가입하고 기록을 이어가세요.',
    navLabel: '인증',
    shortLabel: 'AU',
    showInNavigation: false,
  },
  {
    path: ROUTES.settings,
    title: '설정',
    description: '테마와 계정 상태를 확인하고 관리하세요.',
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
      title: '페이지',
      description: '요청한 화면을 찾을 수 없습니다.',
      navLabel: '페이지',
      shortLabel: 'PG',
    }
  );
}