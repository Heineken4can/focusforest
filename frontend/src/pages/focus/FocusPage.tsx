import { AccessibleIconButton } from '@/components/AccessibleIconButton';
import { PageSection } from '@/components/layout/PageSection';
import { ErrorState } from '@/components/states/ErrorState';
import { LoadingState } from '@/components/states/LoadingState';
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
          <span className="status-badge border-toss-blue/40 text-toss-blue">RUNNING</span>
          <AccessibleIconButton
            ariaLabel="집중 세션 정보 placeholder"
            title="세션 정보 placeholder"
          >
            i
          </AccessibleIconButton>
        </div>

        <div>
          <p className="text-sm text-toss-textSub">Current Task</p>
          <h2 id="focus-timer-title" className="mt-2 text-2xl font-bold">
            핵심 과제 placeholder
          </h2>
          <p className="mt-2 text-sm text-toss-textSub">
            타이머 계산, pause 정책, give-up 모달은 후속 로직 단계에서 연결됩니다.
          </p>
        </div>

        <div className="timer-frame">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-toss-textSub">Deep Focus</p>
            <div className="timer-digits mt-3">25:00</div>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          현재 집중 세션 placeholder. 남은 시간 25분 0초, 상태 RUNNING.
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
        eyebrow="Session States"
        title="집중 상태 매핑"
        description="RUNNING, PAUSED, BREAK, COMPLETED 상태를 공통 badge로 먼저 고정합니다."
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

      <div className="grid gap-4 xl:grid-cols-2">
        <LoadingState
          title="세션 복원 로딩"
          description="bootstrap 후 activeSession snapshot을 붙일 자리를 위한 공통 skeleton입니다."
        />
        <ErrorState
          title="Pause 제한 초과"
          description="SESSION_409_PAUSE_LIMIT 또는 SESSION_409_TIMEOUT fallback 영역입니다."
          actionLabel="대시보드로 이동"
        />
      </div>

      <PageSection
        eyebrow="Desktop Aside"
        title="읽기 전용 보조 영역"
        description="집중 모드 데스크톱 우측 패널은 조회 전용으로 유지합니다."
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
