import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageSection } from '@/components/layout/PageSection';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { InlineAlert } from '@/components/states/InlineAlert';
import { LoadingState } from '@/components/states/LoadingState';
import { focusStore } from '@/features/focus/focus.store';
import type { FocusSession } from '@/features/focus/focus.types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ROUTES } from '@/lib/constants/routes';
import { appStore } from '@/stores/app-store';
import { RewardAnimation } from '@/features/rewards/RewardAnimation';

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, '0');

  return `${minutes}:${seconds}`;
}

function getRemainingSeconds(session: FocusSession | null, focusEndsAt: string | null, pausedRemainingSec: number | null, now: number) {
  if (!session) {
    return 0;
  }

  if (session.status === 'RUNNING') {
    if (!focusEndsAt) {
      return session.plannedFocusSec;
    }

    return Math.max(0, Math.ceil((new Date(focusEndsAt).getTime() - now) / 1000));
  }

  if (session.status === 'PAUSED') {
    return Math.max(0, pausedRemainingSec ?? 0);
  }

  if (session.status === 'BREAK_RUNNING') {
    if (!session.breakEndsAt) {
      return 0;
    }

    return Math.max(0, Math.ceil((new Date(session.breakEndsAt).getTime() - now) / 1000));
  }

  return 0;
}

function getStatusCopy(status: FocusSession['status'] | null) {
  switch (status) {
    case 'RUNNING':
      return {
        badge: '집중 중',
        title: '한 가지에만 집중하고 있어요',
        description: '타이머가 끝나면 휴식 세션으로 자동 전환됩니다.',
      };
    case 'PAUSED':
      return {
        badge: '일시정지',
        title: '잠시 멈췄어요',
        description: 'Pause 제한 시간이 지나기 전에 다시 집중을 이어가야 합니다.',
      };
    case 'COMPLETED':
      return {
        badge: '집중 완료',
        title: '집중은 끝났고 휴식 전이만 남았어요',
        description: '자동 휴식 시작이 실패했다면 다시 시도해 현재 루프를 이어갈 수 있습니다.',
      };
    case 'BREAK_RUNNING':
      return {
        badge: '휴식 중',
        title: '짧은 휴식 시간을 보내고 있어요',
        description: '휴식을 끝내거나 건너뛰면 이번 루프가 마무리됩니다.',
      };
    default:
      return {
        badge: '대기 중',
        title: '집중할 과제를 선택해 주세요',
        description: '대시보드에서 Task를 선택하면 집중 세션을 시작할 수 있어요.',
      };
  }
}

function getTerminalCopy(status: ReturnType<typeof appStore.getSnapshot>['sessionStatus']) {
  switch (status) {
    case 'BREAK_COMPLETED':
      return {
        title: '휴식을 마치고 루프를 끝냈어요',
        description: '보상 결과를 확인하고 다음 Task로 넘어갈 수 있습니다.',
      };
    case 'BREAK_SKIPPED':
      return {
        title: '휴식을 건너뛰고 루프를 마쳤어요',
        description: '바로 다음 작업으로 이동할 준비가 되었습니다.',
      };
    case 'GIVEN_UP_TIMEOUT':
      return {
        title: 'Pause 제한 시간이 지나 세션이 종료되었어요',
        description: '남은 시간은 보존되지 않았습니다. 준비되면 다시 시작해 주세요.',
      };
    case 'GIVEN_UP':
      return {
        title: '집중 세션을 종료했어요',
        description: '중단한 세션은 복구되지 않습니다. 대시보드에서 다시 시작할 수 있어요.',
      };
    default:
      return {
        title: '이번 루프가 종료되었어요',
        description: '대시보드로 돌아가 다음 작업을 선택해 주세요.',
      };
  }
}

const flowSteps = [
  { key: 'RUNNING', label: '집중', description: '타이머 진행' },
  { key: 'PAUSED', label: 'Pause', description: '제한 시간 안에 재개' },
  { key: 'BREAK_RUNNING', label: '휴식', description: '짧은 브레이크' },
  { key: 'BREAK_COMPLETED', label: '완료', description: '루프 종료' },
] as const;

export function FocusPage() {
  useDocumentTitle('Focus');

  const navigate = useNavigate();
  const focusSnapshot = useSyncExternalStore(focusStore.subscribe, focusStore.getSnapshot, focusStore.getSnapshot);
  const appSnapshot = useSyncExternalStore(appStore.subscribe, appStore.getSnapshot, appStore.getSnapshot);
  const [now, setNow] = useState(() => Date.now());
  const [showReward, setShowReward] = useState(false);
  const autoActionRef = useRef<string | null>(null);
  const lastTerminalStatusRef = useRef<string | null>(null);

  const isAuthenticated = appSnapshot.isAuthenticated;
  const currentSession = focusSnapshot.activeSession;
  const remainingSeconds = useMemo(
    () => getRemainingSeconds(currentSession, focusSnapshot.focusEndsAt, focusSnapshot.pausedRemainingSec, now),
    [currentSession, focusSnapshot.focusEndsAt, focusSnapshot.pausedRemainingSec, now],
  );
  const pauseDeadlineSeconds = useMemo(() => {
    if (!currentSession || currentSession.status !== 'PAUSED' || !currentSession.pauseDeadlineAt) {
      return 0;
    }

    return Math.max(0, Math.ceil((new Date(currentSession.pauseDeadlineAt).getTime() - now) / 1000));
  }, [currentSession, now]);
  const pauseLimitReached =
    currentSession?.status === 'RUNNING' &&
    currentSession.pauseCount >= (focusSnapshot.policy?.maxPauseCount ?? 1);
  const statusCopy = getStatusCopy(currentSession?.status ?? null);
  const terminalCopy = getTerminalCopy(focusSnapshot.terminalStatus);
  const isLoading = !focusSnapshot.hydrated;
  const hasEmptyState = !isLoading && !currentSession && !focusSnapshot.terminalStatus && !focusSnapshot.errorMessage;

  useEffect(() => {
    focusStore.hydrate();
    appStore.hydrateActiveTaskSession();
  }, []);

  useEffect(() => {
    if (focusSnapshot.terminalStatus && focusSnapshot.lastReward) {
      if (lastTerminalStatusRef.current !== focusSnapshot.terminalStatus) {
        setShowReward(true);
        lastTerminalStatusRef.current = focusSnapshot.terminalStatus;
      }
    } else {
      lastTerminalStatusRef.current = null;
    }
  }, [focusSnapshot.terminalStatus, focusSnapshot.lastReward]);

  useEffect(() => {
    if (!currentSession) {
      return;
    }

    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [currentSession]);

  useEffect(() => {
    if (!currentSession || focusSnapshot.isBusy) {
      autoActionRef.current = null;
      return;
    }

    if (currentSession.status === 'RUNNING' && remainingSeconds === 0) {
      const actionKey = `${currentSession.focusSessionId}:complete:${currentSession.version}`;

      if (autoActionRef.current === actionKey) {
        return;
      }

      autoActionRef.current = actionKey;
      void focusStore.complete(isAuthenticated);
      return;
    }

    if (currentSession.status === 'PAUSED' && pauseDeadlineSeconds === 0) {
      const actionKey = `${currentSession.focusSessionId}:timeout:${currentSession.version}`;

      if (autoActionRef.current === actionKey) {
        return;
      }

      autoActionRef.current = actionKey;
      void focusStore.giveUp(isAuthenticated, 'PAUSE_TIMEOUT');
      return;
    }

    if (currentSession.status === 'BREAK_RUNNING' && remainingSeconds === 0) {
      const actionKey = `${currentSession.focusSessionId}:break-complete:${currentSession.version}`;

      if (autoActionRef.current === actionKey) {
        return;
      }

      autoActionRef.current = actionKey;
      void focusStore.completeBreak(isAuthenticated);
      return;
    }

    autoActionRef.current = null;
  }, [currentSession, focusSnapshot.isBusy, isAuthenticated, pauseDeadlineSeconds, remainingSeconds]);

  if (isLoading) {
    return (
      <LoadingState
        title="집중 세션을 준비하고 있어요"
        description="저장된 진행 상태와 타이머를 확인 중입니다."
      />
    );
  }

  if (hasEmptyState) {
    return (
      <EmptyState
        title="진행 중인 집중 세션이 없어요"
        description="대시보드에서 완료되지 않은 Task를 선택하면 바로 집중을 시작할 수 있어요."
        actionLabel={
          <button type="button" className="button-primary" onClick={() => navigate(ROUTES.dashboard)}>
            대시보드로 이동
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {showReward && focusSnapshot.lastReward && (
        <RewardAnimation
          awardedSp={focusSnapshot.lastReward.awardedSp}
          awardedTrees={focusSnapshot.lastReward.awardedTrees}
          onComplete={() => setShowReward(false)}
        />
      )}

      {focusSnapshot.errorMessage ? (
        <section className="space-y-4">
          <ErrorState title="집중 세션 요청을 처리하지 못했어요" description={focusSnapshot.errorMessage} />
          <div className="flex gap-3">
            <button type="button" className="button-secondary" onClick={() => focusStore.clearError()}>
              오류 닫기
            </button>
            <button type="button" className="button-primary" onClick={() => navigate(ROUTES.dashboard)}>
              대시보드로 이동
            </button>
          </div>
        </section>
      ) : null}

      {currentSession ? (
        <>
          <section aria-labelledby="focus-session-title" className="surface-panel space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <span className="status-badge">{statusCopy.badge}</span>
                <div>
                  <p className="text-sm text-toss-textSub">현재 Task</p>
                  <h1 id="focus-session-title" className="mt-2 text-2xl font-bold text-toss-textMain">
                    {focusSnapshot.currentTask?.title ?? '선택된 Task가 없습니다'}
                  </h1>
                </div>
              </div>
              <button type="button" className="button-secondary" onClick={() => navigate(ROUTES.dashboard)}>
                대시보드 보기
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,1fr)]">
              <div className="surface-panel-hover text-center">
                <p className="text-sm text-toss-textSub">{statusCopy.description}</p>
                <div className="timer-frame mt-5">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-toss-textSub">
                      {currentSession.status === 'BREAK_RUNNING' ? 'Short Break' : 'Deep Focus'}
                    </p>
                    <div className="timer-digits mt-3">{formatDuration(remainingSeconds)}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-toss-textSub" aria-live="polite">
                  {currentSession.status === 'PAUSED'
                    ? `재개 후 사용할 수 있는 집중 시간은 ${formatDuration(remainingSeconds)}입니다.`
                    : currentSession.status === 'COMPLETED'
                      ? '집중은 완료되었고 휴식 전이를 기다리고 있습니다.'
                      : `남은 시간은 ${formatDuration(remainingSeconds)}입니다.`}
                </p>
                {currentSession.status === 'PAUSED' ? (
                  <InlineAlert
                    tone="neutral"
                    title="Pause 제한 시간"
                    description={`재개 가능 시간은 ${formatDuration(pauseDeadlineSeconds)} 남았습니다.`}
                  />
                ) : null}
                {pauseLimitReached ? (
                  <InlineAlert
                    tone="neutral"
                    title="Pause 사용 완료"
                    description="이 세션에서는 이미 일시정지를 사용했습니다. 집중 완료 또는 포기만 가능합니다."
                  />
                ) : null}
              </div>

              <div className="space-y-4">
                <article className="surface-panel-hover">
                  <p className="text-sm text-toss-textSub">세션 상태</p>
                  <h2 className="mt-2 text-lg font-semibold text-toss-textMain">{statusCopy.title}</h2>
                  <p className="mt-2 text-sm text-toss-textSub">{statusCopy.description}</p>
                </article>

                <article className="surface-panel-hover">
                  <p className="text-sm text-toss-textSub">오늘 완료한 집중 세션</p>
                  <strong className="mt-3 block text-2xl font-bold text-toss-textMain">
                    {focusSnapshot.sidebarSummary?.completedFocusSessionCount ?? 0}회
                  </strong>
                  <p className="mt-2 text-sm text-toss-textSub">휴식까지 마친 루프 수를 기준으로 표시합니다.</p>
                </article>

                <article className="surface-panel-hover">
                  <p className="text-sm text-toss-textSub">보상 결과</p>
                  <strong className="mt-3 block text-2xl font-bold text-toss-textMain">
                    +{focusSnapshot.lastReward?.awardedSp ?? 0} SP
                  </strong>
                  <p className="mt-2 text-sm text-toss-textSub">
                    {focusSnapshot.lastReward?.awardedTrees ?? 0}그루의 나무가 이번 루프에 반영됩니다.
                  </p>
                </article>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {currentSession.status === 'RUNNING' ? (
                <>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => void focusStore.pause(isAuthenticated)}
                    disabled={focusSnapshot.isBusy || pauseLimitReached}
                  >
                    {focusSnapshot.isBusy ? '처리 중...' : 'Pause'}
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => void focusStore.complete(isAuthenticated)}
                    disabled={focusSnapshot.isBusy}
                  >
                    {focusSnapshot.isBusy ? '처리 중...' : '집중 완료'}
                  </button>
                  <button
                    type="button"
                    className="button-secondary border-toss-red/30 text-toss-red hover:bg-toss-red/10"
                    onClick={() => void focusStore.giveUp(isAuthenticated, 'USER_CANCEL')}
                    disabled={focusSnapshot.isBusy}
                  >
                    포기하기
                  </button>
                </>
              ) : null}

              {currentSession.status === 'PAUSED' ? (
                <>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => void focusStore.resume(isAuthenticated)}
                    disabled={focusSnapshot.isBusy}
                  >
                    {focusSnapshot.isBusy ? '처리 중...' : '집중 재개'}
                  </button>
                  <button
                    type="button"
                    className="button-secondary border-toss-red/30 text-toss-red hover:bg-toss-red/10"
                    onClick={() => void focusStore.giveUp(isAuthenticated, 'USER_CANCEL')}
                    disabled={focusSnapshot.isBusy}
                  >
                    세션 종료
                  </button>
                </>
              ) : null}

              {currentSession.status === 'COMPLETED' ? (
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => void focusStore.startBreak(isAuthenticated)}
                  disabled={focusSnapshot.isBusy}
                >
                  {focusSnapshot.isBusy ? '처리 중...' : '휴식 시작 다시 시도'}
                </button>
              ) : null}

              {currentSession.status === 'BREAK_RUNNING' ? (
                <>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => void focusStore.completeBreak(isAuthenticated)}
                    disabled={focusSnapshot.isBusy}
                  >
                    {focusSnapshot.isBusy ? '처리 중...' : '휴식 완료'}
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => void focusStore.skipBreak(isAuthenticated)}
                    disabled={focusSnapshot.isBusy}
                  >
                    휴식 건너뛰기
                  </button>
                </>
              ) : null}
            </div>
          </section>

          <PageSection eyebrow="Flow" title="상태 전이 흐름" description="집중, Pause, 휴식 상태가 현재 어느 단계인지 한눈에 확인할 수 있어요.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {flowSteps.map((step) => {
                const isCurrent = currentSession.status === step.key;

                return (
                  <article key={step.key} className={`surface-panel-hover ${isCurrent ? 'border-toss-blue/40' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="status-badge">{step.label}</span>
                      <span className="text-sm text-toss-textSub">{isCurrent ? '현재 단계' : '대기'}</span>
                    </div>
                    <p className="mt-4 text-sm text-toss-textSub">{step.description}</p>
                  </article>
                );
              })}
            </div>
          </PageSection>

          <PageSection eyebrow="Next" title="다음에 이어갈 수 있는 Task" description="현재 루프가 끝난 뒤 바로 이어서 진행할 후보입니다.">
            {focusSnapshot.nextTaskCandidates.length === 0 ? (
              <EmptyState title="다음 후보 Task가 없어요" description="대시보드에서 새 Task를 추가하면 이 영역에 표시됩니다." />
            ) : (
              <div className="grid gap-4">
                {focusSnapshot.nextTaskCandidates.map((task) => (
                  <article key={task.taskId} className="surface-panel-hover">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-toss-textMain">{task.title}</h3>
                        <p className="mt-2 text-sm text-toss-textSub">현재 상태: {task.status === 'PENDING' ? '진행 대기' : '완료'}</p>
                      </div>
                      <span className="status-badge">후보</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </PageSection>
        </>
      ) : null}

      {!currentSession && focusSnapshot.terminalStatus ? (
        <PageSection eyebrow="Result" title={terminalCopy.title} description={terminalCopy.description}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,1fr)]">
            <article className="surface-panel space-y-4">
              <InlineAlert
                tone={focusSnapshot.terminalStatus === 'GIVEN_UP' || focusSnapshot.terminalStatus === 'GIVEN_UP_TIMEOUT' ? 'error' : 'neutral'}
                title={terminalCopy.title}
                description={terminalCopy.description}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" className="button-primary" onClick={() => navigate(ROUTES.dashboard)}>
                  대시보드로 이동
                </button>
                <button type="button" className="button-secondary" onClick={() => focusStore.clearTerminalStatus()}>
                  결과 닫기
                </button>
              </div>
            </article>

            <article className="surface-panel-hover">
              <p className="text-sm text-toss-textSub">반영된 보상</p>
              <strong className="mt-3 block text-2xl font-bold text-toss-textMain">
                +{focusSnapshot.lastReward?.awardedSp ?? 0} SP
              </strong>
              <p className="mt-2 text-sm text-toss-textSub">
                {focusSnapshot.lastReward?.awardedTrees ?? 0}그루의 나무가 반영되었습니다.
              </p>
            </article>
          </div>
        </PageSection>
      ) : null}
    </div>
  );
}
