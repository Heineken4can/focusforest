import { PageSection } from '@/components/layout/PageSection';
import { EmptyState } from '@/components/states/EmptyState';
import {
  dashboardFilters,
  dashboardSummaryCards,
} from '@/features/dashboard/dashboard.placeholder';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function DashboardPage() {
  useDocumentTitle('Dashboard');

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="SCR-01 ~ SCR-03"
        title="대시보드 앱 셸 골격"
        description="히어로, 할 일 목록, 통계 영역만 우선 배치한 placeholder 화면입니다. 실제 Task CRUD와 선택 상태는 후속 구현에서 연결합니다."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {dashboardFilters.map((filter, index) => (
            <button
              key={filter}
              type="button"
              aria-pressed={index === 0}
              className={index === 0 ? 'button-primary' : 'button-secondary'}
            >
              {filter}
            </button>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Summary"
        title="오늘의 요약 카드"
        description="DailySummary, Reward Snapshot, 핵심 과제 요약이 들어갈 자리를 먼저 고정합니다."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardSummaryCards.map((card) => (
            <article key={card.label} className="surface-panel-hover">
              <p className="text-sm text-toss-textSub">{card.label}</p>
              <strong className="mt-3 block text-2xl font-bold text-toss-textMain">
                {card.value}
              </strong>
              <p className="mt-2 text-sm text-toss-textSub">{card.description}</p>
            </article>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Empty / CRUD"
        title="과제 없음 상태 placeholder"
        description="문서 기준으로 empty, disabled, CTA 우선순위를 먼저 반영합니다."
      >
        <EmptyState
          title="오늘 할 일이 아직 없습니다"
          description="첫 과제를 만들면 핵심 과제 지정과 집중 시작 흐름이 활성화됩니다."
          actionLabel={<button type="button" className="button-primary">첫 과제 추가</button>}
        />
      </PageSection>
    </div>
  );
}
