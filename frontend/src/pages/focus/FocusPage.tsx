import { AccessibleIconButton } from '@/components/AccessibleIconButton';
import { PageSection } from '@/components/layout/PageSection';
import {
  focusControls,
  focusStatuses,
  readOnlySidebarCards,
} from '@/features/focus/focus.placeholder';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function FocusPage() {
  useDocumentTitle('Focus');

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="focus-timer-title"
        className="surface-panel space-y-6 text-center"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="status-badge border-toss-blue/40 text-toss-blue">집중 중</span>
          <AccessibleIconButton
            ariaLabel="집중 세션 안내"
            title="집중 세션 안내"
          >
            i
          </AccessibleIconButton>
        </div>

        <div>
          <p className="text-sm text-toss-textSub">현재 과제</p>
          <h2 id="focus-timer-title" className="mt-2 text-2xl font-bold">
            가장 중요한 한 가지에 집중해 보세요
          </h2>
          <p className="mt-2 text-sm text-toss-textSub">
            타이머가 흐르는 동안 지금 할 일 하나에만 몰입해 보세요.
          </p>
        </div>

        <div className="timer-frame">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-toss-textSub">Deep Focus</p>
            <div className="timer-digits mt-3">25:00</div>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          현재 집중 세션이 진행 중입니다. 남은 시간은 25분입니다.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {focusControls.map((control) => (
            <button
              key={control.label}
              type="button"
              className={control.variant === 'primary' ? 'button-primary' : 'button-secondary'}
            >
              {control.label}
            </button>
          ))}
        </div>
      </section>

      <PageSection
        eyebrow="Flow"
        title="집중 흐름"
        description="세션이 어떻게 이어지는지 미리 확인하고 리듬을 유지해 보세요."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {focusStatuses.map((status) => (
            <article key={status.code} className="surface-panel-hover">
              <div className="flex items-center justify-between gap-3">
                <span className="status-badge">{status.code}</span>
                <span className="text-sm text-toss-textSub">{status.tone}</span>
              </div>
              <p className="mt-4 text-sm text-toss-textSub">{status.description}</p>
            </article>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Guide"
        title="집중을 이어가기 위한 안내"
        description="다음 작업과 오늘의 흐름을 보며 세션 사이의 전환을 더 부드럽게 만들 수 있어요."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {readOnlySidebarCards.map((card) => (
            <article key={card.title} className="surface-panel">
              <h3 className="text-lg font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm text-toss-textSub">{card.description}</p>
            </article>
          ))}
        </div>
      </PageSection>
    </div>
  );
}