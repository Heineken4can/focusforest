import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Task, TaskStatus } from '@prisma/client';
import {
  createSuccessResponse,
  type ApiSuccessResponse,
} from '../../common/http/api-response';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTasksQueryDto } from './dto/get-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskCursor, TaskRepository } from './task.repository';

type TaskPayload = {
  id: string;
  clientGeneratedId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  isCore: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type TaskListResult = ApiSuccessResponse<{
  items: TaskPayload[];
}> & {
  meta: {
    nextCursor?: string;
  };
};

@Injectable()
export class TaskService {
  constructor(private readonly taskRepository: TaskRepository) {}

  async createTask(
    userId: string,
    dto: CreateTaskDto,
  ): Promise<ApiSuccessResponse<{ task: TaskPayload }>> {
    const normalizedInput = this.normalizeCreateInput(dto);

    try {
      const task = await this.taskRepository.createTask({
        userId,
        ...normalizedInput,
      });

      return createSuccessResponse('Task created successfully.', {
        task: this.toTaskPayload(task),
      });
    } catch (error) {
      if (this.isClientGeneratedIdConflict(error)) {
        const existingTask = await this.taskRepository.findByClientGeneratedId(
          userId,
          dto.clientGeneratedId,
        );

        if (!existingTask) {
          throw error;
        }

        if (!this.isSameCreatePayload(existingTask, normalizedInput)) {
          throw this.clientGeneratedIdConflict(existingTask.id);
        }

        return createSuccessResponse('Task created successfully.', {
          task: this.toTaskPayload(existingTask),
        });
      }

      throw error;
    }
  }

  async getTasks(
    userId: string,
    query: GetTasksQueryDto,
  ): Promise<TaskListResult> {
    const limit = query.limit ?? 20;
    const cursor = this.parseCursor(query.cursor);
    const rows = await this.taskRepository.listVisible({
      userId,
      status: query.status,
      isCore: query.isCore,
      limit,
      cursor,
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((task) => this.toTaskPayload(task));
    const response = createSuccessResponse('Tasks fetched successfully.', {
      items,
    }) as TaskListResult;

    if (hasMore) {
      const tail = rows[limit - 1];
      response.meta = {
        nextCursor: this.encodeCursor({
          updatedAt: tail.updatedAt,
          id: tail.id,
        }),
      };
    }

    return response;
  }

  async getTask(
    userId: string,
    taskId: string,
  ): Promise<ApiSuccessResponse<{ task: TaskPayload }>> {
    const task = await this.taskRepository.findVisibleById(userId, taskId);

    if (!task) {
      throw this.taskNotFound();
    }

    return createSuccessResponse('Task fetched successfully.', {
      task: this.toTaskPayload(task),
    });
  }

  async updateTask(
    userId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<ApiSuccessResponse<{ task: TaskPayload }>> {
    const task = await this.taskRepository.findVisibleById(userId, taskId);

    if (!task) {
      throw this.taskNotFound();
    }

    if (task.version !== dto.version) {
      this.throwVersionConflict(
        task,
        dto.version,
        this.collectConflictFields(dto),
      );
    }

    const nextStatus = dto.status ?? task.status;
    const nextIsCore = dto.isCore ?? task.isCore;

    if (nextStatus === TaskStatus.COMPLETED && nextIsCore) {
      throw this.completedTaskCoreGuard();
    }

    if (
      dto.title === undefined &&
      dto.description === undefined &&
      dto.status === undefined &&
      dto.isCore === undefined
    ) {
      return createSuccessResponse('Task updated successfully.', {
        task: this.toTaskPayload(task),
      });
    }

    const writeResult = await this.taskRepository.updateTaskWithVersion({
      userId,
      taskId,
      version: dto.version,
      title: dto.title?.trim(),
      description:
        dto.description !== undefined
          ? dto.description.trim() || null
          : undefined,
      status: dto.status,
      isCore: dto.isCore,
    });

    if (writeResult.status === 'active_lock') {
      throw this.activeLock();
    }

    if (writeResult.status === 'version_conflict') {
      const latestTask = await this.taskRepository.findVisibleById(
        userId,
        taskId,
      );

      if (!latestTask) {
        throw this.taskNotFound();
      }

      this.throwVersionConflict(
        latestTask,
        dto.version,
        this.collectConflictFields(dto),
      );
    }

    return createSuccessResponse('Task updated successfully.', {
      task: this.toTaskPayload(writeResult.task),
    });
  }

  async deleteTask(
    userId: string,
    taskId: string,
    version: number,
  ): Promise<ApiSuccessResponse<{ deletedTaskId: string; deletedAt: string }>> {
    const task = await this.taskRepository.findVisibleById(userId, taskId);

    if (!task) {
      throw this.taskNotFound();
    }

    if (task.version !== version) {
      this.throwVersionConflict(task, version);
    }

    const deletedAt = new Date();
    const writeResult = await this.taskRepository.softDeleteTask({
      userId,
      taskId,
      version,
      deletedAt,
    });

    if (writeResult.status === 'active_lock') {
      throw this.activeLock();
    }

    if (writeResult.status === 'version_conflict') {
      const latestTask = await this.taskRepository.findVisibleById(
        userId,
        taskId,
      );

      if (!latestTask) {
        throw this.taskNotFound();
      }

      this.throwVersionConflict(latestTask, version);
    }

    return createSuccessResponse('Task deleted successfully.', {
      deletedTaskId: writeResult.task.id,
      deletedAt:
        writeResult.task.deletedAt?.toISOString() ?? deletedAt.toISOString(),
    });
  }

  private toTaskPayload(task: Task): TaskPayload {
    return {
      id: task.id,
      clientGeneratedId: task.clientGeneratedId,
      title: task.title,
      description: task.description,
      status: task.status,
      isCore: task.isCore,
      version: task.version,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private normalizeCreateInput(dto: CreateTaskDto): {
    clientGeneratedId: string;
    title: string;
    description?: string;
    isCore: boolean;
  } {
    return {
      clientGeneratedId: dto.clientGeneratedId,
      title: dto.title.trim(),
      description: dto.description?.trim() || undefined,
      isCore: dto.isCore ?? false,
    };
  }

  private isSameCreatePayload(
    task: Task,
    input: ReturnType<TaskService['normalizeCreateInput']>,
  ): boolean {
    return (
      task.title === input.title &&
      (task.description ?? undefined) === input.description &&
      task.isCore === input.isCore &&
      task.deletedAt === null
    );
  }

  private parseCursor(cursor?: string): TaskCursor | undefined {
    if (!cursor) {
      return undefined;
    }

    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as { updatedAt?: string; id?: string };

      if (!decoded.updatedAt || !decoded.id) {
        throw new Error('Invalid cursor.');
      }

      const updatedAt = new Date(decoded.updatedAt);

      if (Number.isNaN(updatedAt.getTime())) {
        throw new Error('Invalid cursor.');
      }

      return {
        updatedAt,
        id: decoded.id,
      };
    } catch {
      throw new BadRequestException({
        message: 'Cursor is invalid.',
        code: 'TASK_400_INVALID_CURSOR',
        data: null,
      });
    }
  }

  private encodeCursor(cursor: TaskCursor): string {
    return Buffer.from(
      JSON.stringify({
        updatedAt: cursor.updatedAt.toISOString(),
        id: cursor.id,
      }),
      'utf8',
    ).toString('base64url');
  }

  private collectConflictFields(dto: UpdateTaskDto): string[] | undefined {
    const fields = (
      ['title', 'description', 'status', 'isCore'] as const
    ).filter((field) => dto[field] !== undefined);

    return fields.length > 0 ? [...fields] : undefined;
  }

  private throwVersionConflict(
    task: Task,
    clientVersion: number,
    conflictFields?: string[],
  ): never {
    throw new ConflictException({
      message: 'Version conflict detected.',
      code: 'SYNC_409_CONFLICT',
      data: {
        entityType: 'TASK',
        entityId: task.id,
        clientVersion,
        serverVersion: task.version,
        serverSnapshot: this.toTaskPayload(task),
        conflictFields,
        resolutionStrategy: 'REPLACE_LOCAL_WITH_SERVER',
        retryable: false,
      },
    });
  }

  private activeLock(): ConflictException {
    return new ConflictException({
      message: 'Task is locked by an active focus session.',
      code: 'TASK_409_ACTIVE_LOCK',
      data: null,
    });
  }

  private completedTaskCoreGuard(): ConflictException {
    return new ConflictException({
      message: 'Completed tasks cannot be designated as core tasks.',
      code: 'TASK_409_COMPLETED',
      data: null,
    });
  }

  private clientGeneratedIdConflict(taskId: string): ConflictException {
    return new ConflictException({
      message: 'clientGeneratedId is already used by another task.',
      code: 'TASK_409_DUPLICATE_CLIENT_ID',
      data: {
        entityType: 'TASK',
        entityId: taskId,
      },
    });
  }

  private taskNotFound(): NotFoundException {
    return new NotFoundException({
      message: 'Task not found.',
      code: 'TASK_404_NOT_FOUND',
      data: null,
    });
  }

  private isClientGeneratedIdConflict(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }

    if (error.code !== 'P2002') {
      return false;
    }

    const meta = 'meta' in error ? error.meta : undefined;
    const target =
      typeof meta === 'object' && meta !== null && 'target' in meta
        ? meta.target
        : undefined;

    if (Array.isArray(target)) {
      return target.includes('clientGeneratedId');
    }

    return typeof target === 'string' && target.includes('clientGeneratedId');
  }
}
