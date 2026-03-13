import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import {
  createTask as createTaskRequest,
  deleteTask as deleteTaskRequest,
  getTasks,
  updateTask as updateTaskRequest,
} from '@/features/dashboard/task.api';
import {
  readAuthenticatedTaskCache,
  readLocalModeTasks,
  writeAuthenticatedTaskCache,
  writeLocalModeTasks,
} from '@/features/dashboard/task.storage';
import type {
  Task,
  TaskConflictPayload,
  TaskDraft,
  TaskFilter,
  TaskMutationMode,
  TaskUiNotice,
} from '@/features/dashboard/task.types';
import { ApiRequestError } from '@/lib/api/client';
import { appStore, type SessionStatus } from '@/stores/app-store';

type TaskSummaryCard = {
  label: string;
  value: string;
  description: string;
};

type PendingTaskDialog =
  | { mode: 'create' }
  | { mode: 'edit'; taskId: string }
  | { mode: 'delete'; taskId: string }
  | null;

type UseTaskDashboardResult = {
  tasks: Task[];
  filteredTasks: Array<Task & { isLocked: boolean }>;
  filter: TaskFilter;
  isLoading: boolean;
  loadError: string | null;
  formError: string | null;
  notice: TaskUiNotice | null;
  dialog: PendingTaskDialog;
  draft: TaskDraft;
  isMutating: boolean;
  summaryCards: TaskSummaryCard[];
  setFilter: (nextFilter: TaskFilter) => void;
  openCreateDialog: () => void;
  openEditDialog: (taskId: string) => void;
  openDeleteDialog: (taskId: string) => void;
  closeDialog: () => void;
  updateDraft: (field: keyof TaskDraft, value: string) => void;
  submitDraft: () => Promise<void>;
  confirmDelete: () => Promise<void>;
  retryLoad: () => Promise<void>;
  toggleTaskStatus: (taskId: string) => Promise<void>;
  toggleTaskCore: (taskId: string) => Promise<void>;
  clearNotice: () => void;
};

const ACTIVE_SESSION_STATUSES: SessionStatus[] = ['RUNNING', 'PAUSED', 'BREAK_RUNNING'];
const EMPTY_DRAFT: TaskDraft = {
  title: '',
  description: '',
};

function useAppSnapshot() {
  return useSyncExternalStore(appStore.subscribe, appStore.getSnapshot, appStore.getSnapshot);
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === 'PENDING' ? -1 : 1;
    }

    if (left.isCore !== right.isCore) {
      return left.isCore ? -1 : 1;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function upsertTask(tasks: Task[], task: Task) {
  const remainingTasks = tasks.filter((item) => item.id !== task.id);
  const mergedTasks = task.isCore
    ? remainingTasks.map((item) => ({ ...item, isCore: false }))
    : remainingTasks;

  return sortTasks([...mergedTasks, task]);
}

function removeTask(tasks: Task[], taskId: string) {
  return tasks.filter((task) => task.id !== taskId);
}

function makeUuidV7() {
  const timestamp = BigInt(Date.now());
  const randomBytes = crypto.getRandomValues(new Uint8Array(10));
  const hexTimestamp = timestamp.toString(16).padStart(12, '0');
  const hexRandom = Array.from(randomBytes, (value) => value.toString(16).padStart(2, '0')).join('');
  const randomPartA = hexRandom.slice(0, 4);
  const randomPartB = hexRandom.slice(4, 8);
  const randomPartC = hexRandom.slice(8, 12);
  const randomPartD = hexRandom.slice(12, 24);

  return [
    hexTimestamp.slice(0, 8),
    hexTimestamp.slice(8, 12),
    `7${randomPartA.slice(1)}`,
    `${(8 + Number.parseInt(randomPartB[0] ?? '0', 16) % 4).toString(16)}${randomPartB.slice(1)}`,
    `${randomPartC}${randomPartD}`,
  ].join('-');
}

function getInitialDraft(dialog: PendingTaskDialog, tasks: Task[]): TaskDraft {
  if (dialog?.mode !== 'edit') {
    return EMPTY_DRAFT;
  }

  const currentTask = tasks.find((task) => task.id === dialog.taskId);

  if (!currentTask) {
    return EMPTY_DRAFT;
  }

  return {
    title: currentTask.title,
    description: currentTask.description ?? '',
  };
}

function getMutationErrorMessage(error: ApiRequestError, mode: TaskMutationMode) {
  if (error.status === 0) {
    return '지금은 연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.';
  }

  if (error.code === 'TASK_409_ACTIVE_LOCK') {
    return '진행 중 세션이 연결된 과제는 수정하거나 삭제할 수 없어요.';
  }

  if (error.code === 'TASK_409_COMPLETED') {
    return '완료된 과제는 핵심 과제로 지정할 수 없어요.';
  }

  if (mode === 'delete') {
    return '과제를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }

  return '과제 변경을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

function validateDraft(draft: TaskDraft) {
  const title = draft.title.trim();
  const description = draft.description.trim();

  if (!title) {
    return '과제 제목을 입력해 주세요.';
  }

  if (title.length > 120) {
    return '과제 제목은 120자 이하로 입력해 주세요.';
  }

  if (description.length > 1000) {
    return '과제 설명은 1000자 이하로 입력해 주세요.';
  }

  return null;
}

function buildSummaryCards(tasks: Array<Task & { isLocked: boolean }>): TaskSummaryCard[] {
  const pendingTasks = tasks.filter((task) => task.status === 'PENDING');
  const completedTasks = tasks.filter((task) => task.status === 'COMPLETED');
  const lockedTasks = tasks.filter((task) => task.isLocked);
  const coreTask = tasks.find((task) => task.isCore);

  return [
    {
      label: '진행 대기',
      value: `${pendingTasks.length}개`,
      description: '아직 완료하지 않은 과제 수',
    },
    {
      label: '완료',
      value: `${completedTasks.length}개`,
      description: '오늘 목록에서 완료로 표시된 과제 수',
    },
    {
      label: '핵심 과제',
      value: coreTask ? '지정됨' : '없음',
      description: coreTask ? coreTask.title : '가장 중요한 과제를 하나 지정해 보세요.',
    },
    {
      label: '잠금',
      value: `${lockedTasks.length}개`,
      description: '진행 중 세션으로 수정이 차단된 과제 수',
    },
  ];
}

export function useTaskDashboard(): UseTaskDashboardResult {
  const appSnapshot = useAppSnapshot();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<TaskUiNotice | null>(null);
  const [dialog, setDialog] = useState<PendingTaskDialog>(null);
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_DRAFT);
  const [isMutating, setIsMutating] = useState(false);
  const previousDialogModeRef = useRef<'create' | 'edit' | 'delete' | null>(null);

  const currentUserId = appSnapshot.currentUser?.id ?? null;
  const activeTaskId = ACTIVE_SESSION_STATUSES.includes(appSnapshot.sessionStatus ?? 'COMPLETED')
    ? appSnapshot.selectedTaskId
    : null;

  useEffect(() => {
    appStore.hydrateActiveTaskSession();
  }, []);

  useEffect(() => {
    const currentDialogMode = dialog?.mode ?? null;

    if (previousDialogModeRef.current !== currentDialogMode) {
      setDraft(getInitialDraft(dialog, tasks));
      setFormError(null);
      previousDialogModeRef.current = currentDialogMode;
    }
  }, [dialog, tasks]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setLoadError(null);

      if (appSnapshot.localModeFlag) {
        if (!isMounted) {
          return;
        }

        setTasks(sortTasks(readLocalModeTasks()));
        setIsLoading(false);
        return;
      }

      if (!currentUserId) {
        if (!isMounted) {
          return;
        }

        setTasks([]);
        setIsLoading(false);
        return;
      }

      const cachedTasks = sortTasks(readAuthenticatedTaskCache(currentUserId));

      if (cachedTasks.length > 0 && isMounted) {
        setTasks(cachedTasks);
      }

      try {
        const response = await getTasks();

        if (!isMounted) {
          return;
        }

        const nextTasks = sortTasks(response.items);
        setTasks(nextTasks);
        writeAuthenticatedTaskCache(currentUserId, nextTasks);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (cachedTasks.length > 0) {
          setNotice({
            tone: 'neutral',
            title: '저장된 목록을 먼저 보여드리고 있어요',
            description: '서버와 다시 연결되면 최신 상태로 갱신됩니다.',
          });
        } else {
          setLoadError(
            error instanceof ApiRequestError
              ? getMutationErrorMessage(error, 'update')
              : '과제 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [appSnapshot.localModeFlag, currentUserId]);

  const tasksWithLock = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        isLocked: Boolean(activeTaskId && task.id === activeTaskId),
      })),
    [activeTaskId, tasks],
  );

  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'COMPLETED':
        return tasksWithLock.filter((task) => task.status === 'COMPLETED');
      case 'IN_PROGRESS':
        return tasksWithLock.filter((task) => task.isLocked);
      case 'ALL':
      default:
        return tasksWithLock;
    }
  }, [filter, tasksWithLock]);

  const summaryCards = useMemo(() => buildSummaryCards(tasksWithLock), [tasksWithLock]);

  function persistLocalTasks(nextTasks: Task[]) {
    setTasks(nextTasks);

    if (appSnapshot.localModeFlag) {
      writeLocalModeTasks(nextTasks);
      return;
    }

    if (currentUserId) {
      writeAuthenticatedTaskCache(currentUserId, nextTasks);
    }
  }

  function openCreateDialog() {
    setDialog({ mode: 'create' });
  }

  function openEditDialog(taskId: string) {
    setDialog({ mode: 'edit', taskId });
  }

  function openDeleteDialog(taskId: string) {
    setDialog({ mode: 'delete', taskId });
  }

  function closeDialog() {
    setDialog(null);
    setFormError(null);
  }

  function updateDraft(field: keyof TaskDraft, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
    setFormError(null);
  }

  function clearNotice() {
    setNotice(null);
  }

  async function submitDraft() {
    if (!dialog || dialog.mode === 'delete') {
      return;
    }

    const validationError = validateDraft(draft);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsMutating(true);
    setFormError(null);
    setNotice(null);

    const title = draft.title.trim();
    const description = draft.description.trim();

    try {
      if (appSnapshot.localModeFlag) {
        const now = new Date().toISOString();

        if (dialog.mode === 'create') {
          const nextTask: Task = {
            id: makeUuidV7(),
            clientGeneratedId: makeUuidV7(),
            title,
            description: description || undefined,
            status: 'PENDING',
            isCore: false,
            version: 1,
            createdAt: now,
            updatedAt: now,
          };
          persistLocalTasks(upsertTask(tasks, nextTask));
          closeDialog();
          return;
        }

        const currentTask = tasks.find((task) => task.id === dialog.taskId);

        if (!currentTask) {
          setFormError('수정할 과제를 찾지 못했어요. 목록을 새로고침해 주세요.');
          return;
        }

        persistLocalTasks(
          upsertTask(tasks, {
            ...currentTask,
            title,
            description: description || undefined,
            version: currentTask.version + 1,
            updatedAt: now,
          }),
        );
        closeDialog();
        return;
      }

      if (dialog.mode === 'create') {
        const response = await createTaskRequest({
          clientGeneratedId: makeUuidV7(),
          title,
          description: description || undefined,
        });
        persistLocalTasks(upsertTask(tasks, response.task));
        closeDialog();
        return;
      }

      const currentTask = tasks.find((task) => task.id === dialog.taskId);

      if (!currentTask) {
        setFormError('수정할 과제를 찾지 못했어요. 목록을 새로고침해 주세요.');
        return;
      }

      const response = await updateTaskRequest(currentTask.id, {
        version: currentTask.version,
        title,
        description: description || undefined,
      });
      persistLocalTasks(upsertTask(tasks, response.task));
      closeDialog();
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'SYNC_409_CONFLICT') {
        const conflictPayload = error.data as TaskConflictPayload;
        const replacedTasks = upsertTask(tasks, conflictPayload.serverSnapshot);
        persistLocalTasks(replacedTasks);
        closeDialog();
        setNotice({
          tone: 'error',
          title: '다른 기기 변경 사항이 반영되었어요',
          description: '최신 서버 상태로 교체했습니다. 내용을 확인한 뒤 다시 수정해 주세요.',
        });
        return;
      }

      setFormError(
        error instanceof ApiRequestError
          ? getMutationErrorMessage(error, dialog.mode === 'create' ? 'create' : 'update')
          : '과제 변경을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function confirmDelete() {
    if (!dialog || dialog.mode !== 'delete') {
      return;
    }

    const currentTask = tasks.find((task) => task.id === dialog.taskId);

    if (!currentTask) {
      setFormError('삭제할 과제를 찾지 못했어요. 목록을 새로고침해 주세요.');
      return;
    }

    if (activeTaskId === currentTask.id) {
      setFormError('진행 중 세션이 연결된 과제는 삭제할 수 없어요.');
      return;
    }

    setIsMutating(true);
    setFormError(null);
    setNotice(null);

    try {
      if (appSnapshot.localModeFlag) {
        persistLocalTasks(removeTask(tasks, currentTask.id));
        closeDialog();
        return;
      }

      const response = await deleteTaskRequest(currentTask.id, currentTask.version);
      persistLocalTasks(removeTask(tasks, response.deletedTaskId));
      closeDialog();
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'SYNC_409_CONFLICT') {
        const conflictPayload = error.data as TaskConflictPayload;
        persistLocalTasks(upsertTask(tasks, conflictPayload.serverSnapshot));
        closeDialog();
        setNotice({
          tone: 'error',
          title: '다른 기기 변경 사항이 반영되었어요',
          description: '삭제 요청 대신 최신 서버 상태를 반영했습니다.',
        });
        return;
      }

      setFormError(
        error instanceof ApiRequestError
          ? getMutationErrorMessage(error, 'delete')
          : '과제를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function retryLoad() {
    setLoadError(null);
    setNotice(null);
    setIsLoading(true);

    if (appSnapshot.localModeFlag) {
      setTasks(sortTasks(readLocalModeTasks()));
      setIsLoading(false);
      return;
    }

    if (!currentUserId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await getTasks();
      const nextTasks = sortTasks(response.items);
      persistLocalTasks(nextTasks);
    } catch (error) {
      setLoadError(
        error instanceof ApiRequestError
          ? getMutationErrorMessage(error, 'update')
          : '과제 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleTaskStatus(taskId: string) {
    const currentTask = tasks.find((task) => task.id === taskId);

    if (!currentTask) {
      return;
    }

    if (activeTaskId === currentTask.id) {
      setNotice({
        tone: 'error',
        description: '진행 중 세션이 연결된 과제는 상태를 변경할 수 없어요.',
      });
      return;
    }

    setIsMutating(true);
    setNotice(null);

    const nextStatus = currentTask.status === 'PENDING' ? 'COMPLETED' : 'PENDING';

    try {
      if (appSnapshot.localModeFlag) {
        persistLocalTasks(
          upsertTask(tasks, {
            ...currentTask,
            status: nextStatus,
            isCore: nextStatus === 'COMPLETED' ? false : currentTask.isCore,
            version: currentTask.version + 1,
            updatedAt: new Date().toISOString(),
          }),
        );
        return;
      }

      const response = await updateTaskRequest(currentTask.id, {
        version: currentTask.version,
        status: nextStatus,
        ...(nextStatus === 'COMPLETED' ? { isCore: false } : {}),
      });
      persistLocalTasks(upsertTask(tasks, response.task));
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'SYNC_409_CONFLICT') {
        const conflictPayload = error.data as TaskConflictPayload;
        persistLocalTasks(upsertTask(tasks, conflictPayload.serverSnapshot));
        setNotice({
          tone: 'error',
          title: '다른 기기 변경 사항이 반영되었어요',
          description: '최신 서버 상태로 교체했습니다. 다시 확인해 주세요.',
        });
        return;
      }

      setNotice({
        tone: 'error',
        description:
          error instanceof ApiRequestError
            ? getMutationErrorMessage(error, 'toggle-status')
            : '과제 상태를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setIsMutating(false);
    }
  }

  async function toggleTaskCore(taskId: string) {
    const currentTask = tasks.find((task) => task.id === taskId);

    if (!currentTask) {
      return;
    }

    if (currentTask.status === 'COMPLETED') {
      setNotice({
        tone: 'error',
        description: '완료된 과제는 핵심 과제로 지정할 수 없어요.',
      });
      return;
    }

    if (activeTaskId === currentTask.id) {
      setNotice({
        tone: 'error',
        description: '진행 중 세션이 연결된 과제는 핵심 과제 상태를 바꿀 수 없어요.',
      });
      return;
    }

    setIsMutating(true);
    setNotice(null);

    try {
      if (appSnapshot.localModeFlag) {
        persistLocalTasks(
          upsertTask(tasks, {
            ...currentTask,
            isCore: !currentTask.isCore,
            version: currentTask.version + 1,
            updatedAt: new Date().toISOString(),
          }),
        );
        return;
      }

      const response = await updateTaskRequest(currentTask.id, {
        version: currentTask.version,
        isCore: !currentTask.isCore,
      });
      persistLocalTasks(upsertTask(tasks, response.task));
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'SYNC_409_CONFLICT') {
        const conflictPayload = error.data as TaskConflictPayload;
        persistLocalTasks(upsertTask(tasks, conflictPayload.serverSnapshot));
        setNotice({
          tone: 'error',
          title: '다른 기기 변경 사항이 반영되었어요',
          description: '최신 서버 상태로 교체했습니다. 다시 확인해 주세요.',
        });
        return;
      }

      setNotice({
        tone: 'error',
        description:
          error instanceof ApiRequestError
            ? getMutationErrorMessage(error, 'toggle-core')
            : '핵심 과제 상태를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setIsMutating(false);
    }
  }

  return {
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
  };
}

