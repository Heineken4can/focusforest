export type TaskStatus = 'PENDING' | 'COMPLETED';

export type Task = {
  id: string;
  clientGeneratedId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  isCore: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskFilter = 'ALL' | 'IN_PROGRESS' | 'COMPLETED';

export type TaskDraft = {
  title: string;
  description: string;
};

export type TaskConflictPayload = {
  entityType: 'TASK';
  entityId: string;
  clientVersion?: number;
  serverVersion: number;
  serverSnapshot: Task;
  conflictFields?: string[];
  resolutionStrategy: 'REPLACE_LOCAL_WITH_SERVER';
  retryable: false;
};

export type TaskDeleteResponse = {
  deletedTaskId: string;
  deletedAt: string;
};

export type TaskMutationMode =
  | 'create'
  | 'update'
  | 'delete'
  | 'toggle-status'
  | 'toggle-core';

export type TaskUiNoticeTone = 'neutral' | 'error';

export type TaskUiNotice = {
  tone: TaskUiNoticeTone;
  title?: string;
  description: string;
};
