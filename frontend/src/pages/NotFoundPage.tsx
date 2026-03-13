import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/states/EmptyState';
import { ROUTES } from '@/lib/constants/routes';

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12">
      <EmptyState
        title="페이지를 찾을 수 없습니다"
        description="입력한 주소가 올바른지 확인하거나, 아래 버튼으로 메인 화면으로 돌아가세요."
        actionLabel={
          <Link to={ROUTES.dashboard} className="button-primary">
            대시보드로 이동
          </Link>
        }
      />
    </main>
  );
}