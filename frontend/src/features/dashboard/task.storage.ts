import type { Task } from '@/features/dashboard/task.types';

const LOCAL_MODE_STORAGE_KEY = 'focus-forest.local.tasks.v1';

function getAuthenticatedStorageKey(userId: string) {
  return `focus-forest.server-task-cache.${userId}.v1`;
}

function parseTasks(rawValue: string | null): Task[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((task): task is Task => {
      if (!task || typeof task !== 'object') {
        return false;
      }

      const candidate = task as Partial<Task>;

      return (
        typeof candidate.id === 'string' &&
        typeof candidate.clientGeneratedId === 'string' &&
        typeof candidate.title === 'string' &&
        (candidate.description === undefined || typeof candidate.description === 'string') &&
        (candidate.status === 'PENDING' || candidate.status === 'COMPLETED') &&
        typeof candidate.isCore === 'boolean' &&
        typeof candidate.version === 'number' &&
        typeof candidate.createdAt === 'string' &&
        typeof candidate.updatedAt === 'string'
      );
    });
  } catch {
    return [];
  }
}

function readTasks(key: string): Task[] {
  if (typeof window === 'undefined') {
    return [];
  }

  return parseTasks(window.localStorage.getItem(key));
}

function writeTasks(key: string, tasks: Task[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(tasks));
}

export function readLocalModeTasks() {
  return readTasks(LOCAL_MODE_STORAGE_KEY);
}

export function writeLocalModeTasks(tasks: Task[]) {
  writeTasks(LOCAL_MODE_STORAGE_KEY, tasks);
}

export function readAuthenticatedTaskCache(userId: string) {
  return readTasks(getAuthenticatedStorageKey(userId));
}

export function writeAuthenticatedTaskCache(userId: string, tasks: Task[]) {
  writeTasks(getAuthenticatedStorageKey(userId), tasks);
}
