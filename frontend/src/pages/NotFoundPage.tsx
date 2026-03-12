import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/states/EmptyState';
import { ROUTES } from '@/lib/constants/routes';

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12">
      <EmptyState
        title="페이지를 찾을 수 없습니다"
        description="라우팅 골격에는 Dashboard, Focus, Auth, Settings 네 개의 기본 경로만 포함했습니다."
        actionLabel={
          <Link to={ROUTES.dashboard} className="button-primary">
            대시보드로 이동
          </Link>
        }
      />
    </main>
  );
}
