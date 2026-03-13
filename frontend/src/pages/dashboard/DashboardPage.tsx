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
        eyebrow="Today"
        title="오늘의 흐름을 한눈에 확인하세요"
        description="핵심 과제를 정리하고, 지금 바로 집중을 시작할 수 있는 공간입니다."
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
        eyebrow="Overview"
        title="오늘의 요약"
        description="집중 시간, 완료한 세션, 보상 현황을 빠르게 확인할 수 있어요."
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
        eyebrow="Tasks"
        title="할 일을 추가해 보세요"
        description="과제를 등록하면 집중 시작과 핵심 과제 지정이 더 쉬워집니다."
      >
        <EmptyState
          title="아직 등록한 과제가 없어요"
          description="가장 먼저 끝내고 싶은 일을 하나 추가해 보세요. 오늘의 집중이 훨씬 선명해집니다."
          actionLabel={<button type="button" className="button-primary">첫 과제 추가</button>}
        />
      </PageSection>
    </div>
  );
}