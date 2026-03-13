import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageSection } from '@/components/layout/PageSection';
import { ApiRequestError } from '@/lib/api/client';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { InlineAlert } from '@/components/states/InlineAlert';
import { LoadingState } from '@/components/states/LoadingState';
import { focusStore } from '@/features/focus/focus.store';
import type { Task, TaskFilter } from '@/features/dashboard/task.types';
import { useTaskDashboard } from '@/features/dashboard/useTaskDashboard';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ROUTES } from '@/lib/constants/routes';
import { appStore } from '@/stores/app-store';

const dashboardFilters: Array<{ label: string; value: TaskFilter }> = [
  { label: '전체', value: 'ALL' },
  { label: '진행중', value: 'IN_PROGRESS' },
  { label: '완료', value: 'COMPLETED' },
];

function TaskDialog({
  mode,
  title,
  description,
  draft,
  formError,
  isSubmitting,
  submitLabel,
  onChange,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit' | 'delete';
  title: string;
  description: string;
  draft: { title: string; description: string };
  formError: string | null;
  isSubmitting: boolean;
  submitLabel: string;
  onChange: (field: 'title' | 'description', value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const dialogTitleId = `${mode}-task-title`;
  const dialogDescriptionId = `${mode}-task-description`;
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const composingFieldRef = useRef<'title' | 'description' | null>(null);
  const [localDraft, setLocalDraft] = useState(draft);
  const draftTitle = draft.title;
  const draftDescription = draft.description;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setLocalDraft({
      title: draftTitle,
      description: draftDescription,
    });
    composingFieldRef.current = null;
  }, [draftDescription, draftTitle]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const initialFocusTarget = dialogRef.current?.querySelector<HTMLElement>('input, textarea, button');
    initialFocusTarget?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, []);

  function syncDraft(field: 'title' | 'description', value: string) {
    onChange(field, value);
  }

  function handleFieldChange(field: 'title' | 'description', value: string) {
    setLocalDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));

    if (composingFieldRef.current !== field) {
      syncDraft(field, value);
    }
  }

  function handleCompositionStart(field: 'title' | 'description') {
    composingFieldRef.current = field;
  }

  function handleCompositionEnd(field: 'title' | 'description', value: string) {
    composingFieldRef.current = null;
    syncDraft(field, value);
  }

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-toss-overlay/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
    >
      <section ref={dialogRef} className="surface-panel w-full max-w-lg space-y-5">
        <div>
          <h2 id={dialogTitleId} className="text-xl font-semibold text-toss-textMain">
            {title}
          </h2>
          <p id={dialogDescriptionId} className="mt-2 text-sm text-toss-textSub">
            {description}
          </p>
        </div>

        {mode === 'delete' ? null : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="task-title" className="text-sm font-medium text-toss-textMain">
                과제 제목
              </label>
              <input
                id="task-title"
                className="field-shell w-full"
                value={localDraft.title}
                maxLength={120}
                onChange={(event) => handleFieldChange('title', event.target.value)}
                onBlur={(event) => syncDraft('title', event.target.value)}
                onCompositionStart={() => handleCompositionStart('title')}
                onCompositionEnd={(event) => handleCompositionEnd('title', event.currentTarget.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="task-description" className="text-sm font-medium text-toss-textMain">
                설명
              </label>
              <textarea
                id="task-description"
                className="min-h-28 w-full rounded-xl border border-toss-divider bg-toss-surface px-4 py-3 text-sm text-toss-textMain placeholder:text-toss-textSub"
                value={localDraft.description}
                maxLength={1000}
                onChange={(event) => handleFieldChange('description', event.target.value)}
                onBlur={(event) => syncDraft('description', event.target.value)}
                onCompositionStart={() => handleCompositionStart('description')}
                onCompositionEnd={(event) => handleCompositionEnd('description', event.currentTarget.value)}
                disabled={isSubmitting}
                placeholder="무엇을 끝내야 하는지 간단히 남겨 두세요."
              />
            </div>
          </div>
        )}

        {formError ? <InlineAlert description={formError} /> : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="button-secondary" onClick={onClose} disabled={isSubmitting}>
            취소
          </button>
          <button type="button" className="button-primary" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? '처리 중...' : submitLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function DashboardPage() {
  useDocumentTitle('Dashboard');

  const navigate = useNavigate();
  const appSnapshot = useSyncExternalStore(appStore.subscribe, appStore.getSnapshot, appStore.getSnapshot);
  const focusSnapshot = useSyncExternalStore(focusStore.subscribe, focusStore.getSnapshot, focusStore.getSnapshot);
  const [focusError, setFocusError] = useState<string | null>(null);
  const {
    tasks,
    filteredTasks,
    filter,
    isLoading,
    loadError,
    formError,
    notice,
    dialog,
    draft,
    isMutating,
    summaryCards,
    setFilter,
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    closeDialog,
    updateDraft,
    submitDraft,
    confirmDelete,
    retryLoad,
    toggleTaskStatus,
    toggleTaskCore,
    clearNotice,
  } = useTaskDashboard();

  useEffect(() => {
    focusStore.hydrate();
  }, []);

  const hasActiveFocusSession = Boolean(focusSnapshot.activeSession);

  const emptyState = useMemo(() => {
    if (tasks.length === 0) {
      return {
        title: '아직 등록한 과제가 없어요',
        description:
          '가장 먼저 끝내고 싶은 일을 하나 추가해 보세요. 오늘의 집중이 훨씬 선명해집니다.',
      };
    }

    if (filter === 'IN_PROGRESS') {
      return {
        title: '진행 중으로 잠긴 과제가 없어요',
        description: '집중 세션이 시작되면 해당 과제가 이 필터에 표시됩니다.',
      };
    }

    return {
      title: '이 필터에 맞는 과제가 없어요',
      description: '필터를 바꾸거나 새로운 과제를 추가해 보세요.',
    };
  }, [filter, tasks.length]);

  async function handleStartFocus(task: Task) {
    setFocusError(null);

    try {
      await focusStore.startFromTask(task, tasks, appSnapshot.isAuthenticated);
      navigate(ROUTES.focus);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'SESSION_409_ALREADY_RUNNING' && focusStore.getSnapshot().activeSession) {
        navigate(ROUTES.focus);
        return;
      }

      if (error instanceof ApiRequestError && (error.code === 'SESSION_409_INVALID_STATE' || error.code === 'SYNC_409_CONFLICT') && focusStore.getSnapshot().activeSession) {
        navigate(ROUTES.focus);
        return;
      }

      setFocusError(focusStore.getSnapshot().errorMessage ?? '집중 세션을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  return (
    <>
      <div className="space-y-6">
        <PageSection
          eyebrow="Today"
          title="오늘의 흐름을 한눈에 확인하세요"
          description="핵심 과제를 정리하고, 지금 바로 집중을 시작할 수 있는 공간입니다."
        >
          <div className="space-y-4">
            {hasActiveFocusSession ? (
              <div className="surface-panel-hover space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-toss-textSub">진행 중 세션</p>
                    <h2 className="mt-2 text-lg font-semibold text-toss-textMain">
                      {focusSnapshot.currentTask?.title ?? '현재 집중 세션'}
                    </h2>
                    <p className="mt-2 text-sm text-toss-textSub">
                      {focusSnapshot.activeSession?.status === 'BREAK_RUNNING'
                        ? '휴식 세션이 진행 중입니다.'
                        : focusSnapshot.activeSession?.status === 'PAUSED'
                          ? 'Pause 상태입니다. 제한 시간 안에 재개해 주세요.'
                          : '집중 세션이 진행 중입니다.'}
                    </p>
                  </div>
                  <button type="button" className="button-primary" onClick={() => navigate(ROUTES.focus)}>
                    집중 화면으로 이동
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {dashboardFilters.map((currentFilter) => {
                const selected = filter === currentFilter.value;
                return (
                  <button
                    key={currentFilter.value}
                    type="button"
                    aria-pressed={selected}
                    className={selected ? 'button-primary' : 'button-secondary'}
                    onClick={() => setFilter(currentFilter.value)}
                  >
                    {currentFilter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </PageSection>

        <PageSection
          eyebrow="Overview"
          title="오늘의 요약"
          description="핵심 과제, 완료 상태, 잠금 상태를 한 번에 확인할 수 있어요."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
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
          title="할 일 목록"
          description="생성, 수정, 삭제, 완료 토글, 핵심 과제 지정, 집중 시작까지 이 화면에서 관리합니다."
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-toss-textSub">
                전체 {tasks.length}개, 현재 필터 {filteredTasks.length}개
              </div>
              <button type="button" className="button-primary" onClick={openCreateDialog}>
                새 과제 추가
              </button>
            </div>

            {notice ? (
              <div className="space-y-2">
                <InlineAlert title={notice.title} description={notice.description} tone={notice.tone} />
                <div className="flex justify-end">
                  <button type="button" className="button-ghost min-h-0 px-0 py-0" onClick={clearNotice}>
                    안내 닫기
                  </button>
                </div>
              </div>
            ) : null}

            {focusError ? (
              <div className="space-y-2">
                <InlineAlert title="집중 세션을 시작하지 못했어요" description={focusError} />
                <div className="flex justify-end">
                  <button type="button" className="button-ghost min-h-0 px-0 py-0" onClick={() => setFocusError(null)}>
                    안내 닫기
                  </button>
                </div>
              </div>
            ) : null}

            {isLoading ? (
              <LoadingState title="과제 목록을 불러오고 있어요" description="잠시만 기다려 주세요." />
            ) : loadError ? (
              <div className="space-y-4">
                <ErrorState title="과제 목록을 불러오지 못했어요" description={loadError} />
                <button type="button" className="button-secondary" onClick={() => void retryLoad()}>
                  다시 시도
                </button>
              </div>
            ) : filteredTasks.length === 0 ? (
              <EmptyState
                title={emptyState.title}
                description={emptyState.description}
                actionLabel={
                  tasks.length === 0 ? (
                    <button type="button" className="button-primary" onClick={openCreateDialog}>
                      첫 과제 추가
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid gap-4">
                {filteredTasks.map((task) => {
                  const isCompleted = task.status === 'COMPLETED';
                  const coreBlocked = isCompleted;
                  const mutationBlocked = task.isLocked || isMutating;
                  const focusStartBlocked = isCompleted || task.isLocked || isMutating || hasActiveFocusSession;

                  return (
                    <article key={task.id} className="surface-panel space-y-4" aria-label={`${task.title} 과제`}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="status-badge">
                              {isCompleted ? '완료' : task.isLocked ? '진행중 잠금' : '진행 대기'}
                            </span>
                            {task.isCore ? <span className="status-badge">핵심 과제</span> : null}
                            <span className="text-xs text-toss-textSub">v{task.version}</span>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold text-toss-textMain">{task.title}</h3>
                            <p className="mt-2 text-sm text-toss-textSub">
                              {task.description?.trim() || '설명이 없는 과제입니다.'}
                            </p>
                          </div>

                          {task.isLocked ? (
                            <InlineAlert
                              tone="neutral"
                              description="이 과제는 진행 중 세션과 연결되어 있어 수정과 삭제가 차단됩니다."
                            />
                          ) : null}

                          {coreBlocked ? (
                            <InlineAlert tone="neutral" description="완료된 과제는 핵심 과제로 지정할 수 없습니다." />
                          ) : null}

                          {hasActiveFocusSession && !task.isLocked ? (
                            <InlineAlert
                              tone="neutral"
                              description="이미 진행 중인 집중 세션이 있어 새 세션을 시작할 수 없습니다."
                            />
                          ) : null}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:w-[19rem]">
                          <button
                            type="button"
                            className="button-primary"
                            onClick={() => void handleStartFocus(task)}
                            disabled={focusStartBlocked}
                            title={
                              isCompleted
                                ? '완료된 과제로는 집중을 시작할 수 없습니다.'
                                : hasActiveFocusSession
                                  ? '이미 진행 중인 집중 세션이 있습니다.'
                                  : undefined
                            }
                          >
                            {task.isLocked ? '집중 진행 중' : '집중 시작'}
                          </button>
                          <button
                            type="button"
                            className={task.isCore ? 'button-primary' : 'button-secondary'}
                            onClick={() => void toggleTaskCore(task.id)}
                            disabled={mutationBlocked || coreBlocked}
                            title={coreBlocked ? '완료된 과제는 핵심 과제로 지정할 수 없습니다.' : undefined}
                          >
                            {task.isCore ? '핵심 해제' : '핵심 지정'}
                          </button>
                          <button
                            type="button"
                            className={isCompleted ? 'button-secondary' : 'button-primary'}
                            onClick={() => void toggleTaskStatus(task.id)}
                            disabled={mutationBlocked}
                          >
                            {isCompleted ? '복원' : '완료'}
                          </button>
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => openEditDialog(task.id)}
                            disabled={mutationBlocked}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="button-secondary border-toss-red/30 text-toss-red hover:bg-toss-red/10 sm:col-span-2"
                            onClick={() => openDeleteDialog(task.id)}
                            disabled={mutationBlocked}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </PageSection>
      </div>

      {dialog?.mode === 'create' ? (
        <TaskDialog
          mode="create"
          title="새 과제 추가"
          description="제목과 설명을 입력하면 바로 목록에 반영됩니다."
          draft={draft}
          formError={formError}
          isSubmitting={isMutating}
          submitLabel="추가하기"
          onChange={updateDraft}
          onClose={closeDialog}
          onSubmit={() => void submitDraft()}
        />
      ) : null}

      {dialog?.mode === 'edit' ? (
        <TaskDialog
          mode="edit"
          title="과제 수정"
          description="서버의 최신 버전을 기준으로 제목과 설명을 업데이트합니다."
          draft={draft}
          formError={formError}
          isSubmitting={isMutating}
          submitLabel="저장하기"
          onChange={updateDraft}
          onClose={closeDialog}
          onSubmit={() => void submitDraft()}
        />
      ) : null}

      {dialog?.mode === 'delete' ? (
        <TaskDialog
          mode="delete"
          title="과제를 삭제할까요?"
          description="삭제 후에는 목록에서 제거됩니다. 진행 중 세션에 연결된 과제는 삭제할 수 없습니다."
          draft={draft}
          formError={formError}
          isSubmitting={isMutating}
          submitLabel="삭제하기"
          onChange={updateDraft}
          onClose={closeDialog}
          onSubmit={() => void confirmDelete()}
        />
      ) : null}
    </>
  );
}


