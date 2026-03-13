import { apiFetch } from '@/lib/api/client';

import type {
  Task,
  TaskDeleteResponse,
} from '@/features/dashboard/task.types';

type GetTasksResponse = {
  items: Task[];
};

type CreateTaskInput = {
  clientGeneratedId: string;
  title: string;
  description?: string;
  isCore?: boolean;
};

type UpdateTaskInput = {
  version: number;
  title?: string;
  description?: string;
  status?: Task['status'];
  isCore?: boolean;
};

type CreateTaskResponse = {
  task: Task;
};

type UpdateTaskResponse = {
  task: Task;
};

export async function getTasks() {
  return apiFetch<GetTasksResponse>('/tasks', {
    method: 'GET',
  });
}

export async function createTask(input: CreateTaskInput) {
  return apiFetch<CreateTaskResponse>(
    '/tasks',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    {
      auth: 'required',
    },
  );
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  return apiFetch<UpdateTaskResponse>(
    `/tasks/${taskId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
    {
      auth: 'required',
    },
  );
}

export async function deleteTask(taskId: string, version: number) {
  return apiFetch<TaskDeleteResponse>(
    `/tasks/${taskId}?version=${encodeURIComponent(String(version))}`,
    {
      method: 'DELETE',
    },
    {
      auth: 'required',
    },
  );
}
