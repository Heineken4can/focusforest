import { ConflictException, NotFoundException } from '@nestjs/common';
import { TaskStatus, type Task } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTasksQueryDto } from './dto/get-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskRepository, type TaskWriteResult } from './task.repository';
import { TaskService } from './task.service';

const createTaskRecord = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  userId: 'user-1',
  clientGeneratedId: '0195d7fe-1111-7111-8111-111111111111',
  title: 'Write backend task module',
  description: 'Task service implementation',
  status: TaskStatus.PENDING,
  isCore: false,
  version: 3,
  createdAt: new Date('2026-03-13T00:00:00.000Z'),
  updatedAt: new Date('2026-03-13T00:10:00.000Z'),
  deletedAt: null,
  ...overrides,
});

type ConflictResponse = {
  code: string;
  data: {
    entityId?: string;
    clientVersion?: number;
    serverVersion?: number;
    serverSnapshot?: {
      id: string;
      version: number;
    };
  };
};

describe('TaskService', () => {
  let service: TaskService;
  let repository: jest.Mocked<TaskRepository>;

  beforeEach(() => {
    repository = {
      findVisibleById: jest.fn(),
      findByClientGeneratedId: jest.fn(),
      listVisible: jest.fn(),
      hasActiveSession: jest.fn(),
      createTask: jest.fn(),
      updateTaskWithVersion: jest.fn(),
      softDeleteTask: jest.fn(),
    } as unknown as jest.Mocked<TaskRepository>;
    service = new TaskService(repository);
  });

  it('creates a task successfully', async () => {
    const createdTask = createTaskRecord({ version: 1, isCore: true });
    repository.createTask.mockResolvedValue(createdTask);

    const dto: CreateTaskDto = {
      clientGeneratedId: '0195d7fe-1111-7111-8111-111111111111',
      title: '  Write backend task module  ',
      description: '  Task service implementation  ',
      isCore: true,
    };

    const result = await service.createTask('user-1', dto);

    expect(repository.createTask.mock.calls[0][0]).toEqual({
      userId: 'user-1',
      clientGeneratedId: dto.clientGeneratedId,
      title: 'Write backend task module',
      description: 'Task service implementation',
      isCore: true,
    });
    expect(result.data.task.version).toBe(1);
    expect(result.data.task.isCore).toBe(true);
  });

  it('rejects duplicate clientGeneratedId when payload differs', async () => {
    repository.createTask.mockRejectedValue({
      code: 'P2002',
      meta: {
        target: ['clientGeneratedId'],
      },
    });
    repository.findByClientGeneratedId.mockResolvedValue(createTaskRecord());

    await expect(
      service.createTask('user-1', {
        clientGeneratedId: '0195d7fe-1111-7111-8111-111111111111',
        title: 'Different title',
        isCore: false,
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'TASK_409_DUPLICATE_CLIENT_ID',
      },
    });
  });

  it('returns a paginated task list', async () => {
    const first = createTaskRecord({
      id: 'task-2',
      updatedAt: new Date('2026-03-13T00:11:00.000Z'),
    });
    const second = createTaskRecord({
      id: 'task-1',
      updatedAt: new Date('2026-03-13T00:10:00.000Z'),
    });
    const third = createTaskRecord({
      id: 'task-0',
      updatedAt: new Date('2026-03-13T00:09:00.000Z'),
    });
    repository.listVisible.mockResolvedValue([first, second, third]);

    const query: GetTasksQueryDto = {
      limit: 2,
    };
    const result = await service.getTasks('user-1', query);

    expect(result.data.items).toHaveLength(2);
    expect(result.meta.nextCursor).toBeDefined();
  });

  it('rejects stale version updates with serverSnapshot', async () => {
    const task = createTaskRecord({ version: 7 });
    repository.findVisibleById.mockResolvedValue(task);

    const dto: UpdateTaskDto = {
      version: 3,
      title: 'New title',
    };

    try {
      await service.updateTask('user-1', task.id, dto);
      fail('Expected updateTask to throw a conflict error.');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      const response = (
        error as ConflictException
      ).getResponse() as ConflictResponse;

      expect(response.code).toBe('SYNC_409_CONFLICT');
      expect(response.data.entityId).toBe(task.id);
      expect(response.data.clientVersion).toBe(3);
      expect(response.data.serverVersion).toBe(7);
      expect(response.data.serverSnapshot).toEqual(
        expect.objectContaining({
          id: task.id,
          version: 7,
        }),
      );
    }
  });

  it('blocks updates when the repository reports an active session lock', async () => {
    const task = createTaskRecord();
    repository.findVisibleById.mockResolvedValue(task);
    repository.updateTaskWithVersion.mockResolvedValue({
      status: 'active_lock',
    } satisfies TaskWriteResult);

    await expect(
      service.updateTask('user-1', task.id, {
        version: 3,
        title: 'Blocked title',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'TASK_409_ACTIVE_LOCK',
      },
    });
  });

  it('blocks core designation on completed tasks', async () => {
    const task = createTaskRecord({
      status: TaskStatus.COMPLETED,
      isCore: false,
    });
    repository.findVisibleById.mockResolvedValue(task);

    await expect(
      service.updateTask('user-1', task.id, {
        version: 3,
        isCore: true,
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'TASK_409_COMPLETED',
      },
    });
  });

  it('soft-deletes a task', async () => {
    const task = createTaskRecord();
    const deleted = createTaskRecord({
      deletedAt: new Date('2026-03-13T00:20:00.000Z'),
      isCore: false,
      version: 4,
    });
    repository.findVisibleById.mockResolvedValue(task);
    repository.softDeleteTask.mockResolvedValue({
      status: 'updated',
      task: deleted,
    });

    const result = await service.deleteTask('user-1', task.id, 3);

    expect(repository.softDeleteTask.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        taskId: task.id,
        version: 3,
      }),
    );
    expect(result.data.deletedTaskId).toBe(task.id);
    expect(result.data.deletedAt).toBe(deleted.deletedAt?.toISOString());
  });

  it('blocks deletes when the repository reports an active session lock', async () => {
    const task = createTaskRecord();
    repository.findVisibleById.mockResolvedValue(task);
    repository.softDeleteTask.mockResolvedValue({
      status: 'active_lock',
    } satisfies TaskWriteResult);

    await expect(
      service.deleteTask('user-1', task.id, 3),
    ).rejects.toMatchObject({
      response: {
        code: 'TASK_409_ACTIVE_LOCK',
      },
    });
  });

  it('returns 404 for a missing task lookup', async () => {
    repository.findVisibleById.mockResolvedValue(null);

    await expect(service.getTask('user-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
