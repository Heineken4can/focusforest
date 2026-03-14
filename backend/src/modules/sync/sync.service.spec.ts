import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SyncRepository } from './sync.repository';
import { SyncService } from './sync.service';
import { BootstrapDto } from './dto/bootstrap.dto';
import { PushDto, SyncEntityType, SyncOperation } from './dto/push.dto';
import { SessionStatus } from '@prisma/client';
import { TaskRepository } from '../tasks/task.repository';
import { FocusSessionRepository } from '../focus-sessions/focus-session.repository';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: jest.Mocked<PrismaService>;
  let repository: jest.Mocked<SyncRepository>;
  let taskRepository: jest.Mocked<TaskRepository>;
  let focusSessionRepository: jest.Mocked<FocusSessionRepository>;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((cb) => cb(prisma)),
      task: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      focusSession: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      syncCursor: {
        upsert: jest.fn(),
      },
    } as any;
    repository = {
      getLatestSnapshot: jest.fn(),
      upsertCursor: jest.fn(),
    } as any;
    taskRepository = {
      findVisibleById: jest.fn(),
      findByClientGeneratedId: jest.fn(),
    } as any;
    focusSessionRepository = {
      findById: jest.fn(),
    } as any;
    service = new SyncService(prisma, repository, taskRepository, focusSessionRepository);
  });

  describe('bootstrap', () => {
    it('successfully bootstraps tasks and sessions', async () => {
      const dto: BootstrapDto = {
        deviceId: 'device-1',
        batches: [
          {
            batchId: 'batch-1',
            tasks: [
              {
                clientGeneratedId: 'task-c-1',
                title: 'Task 1',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            sessions: [
              {
                clientGeneratedId: 'session-c-1',
                taskId: 'task-c-1',
                status: SessionStatus.COMPLETED,
                plannedFocusSec: 1500,
                startedAt: new Date().toISOString(),
                pauseCount: 0,
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        ],
      };

      repository.getLatestSnapshot.mockResolvedValue({
        tasks: [],
        activeSession: null,
        dashboardSummary: {},
        rewardSnapshot: {},
        profile: {},
        setting: {},
        syncState: { lastCursor: '', updatedAt: '' },
      } as any);

      (prisma.task.findUnique as jest.Mock).mockResolvedValue({ id: 'task-internal-1' });

      const result = await service.bootstrap('user-1', dto);

      expect(prisma.task.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.focusSession.upsert).toHaveBeenCalledTimes(1);
      expect(result.data.accepted.tasks).toContain('task-c-1');
      expect(result.data.accepted.sessions).toContain('session-c-1');
    });
  });

  describe('push', () => {
    it('successfully processes a task update event', async () => {
      const dto: PushDto = {
        deviceId: 'device-1',
        events: [
          {
            eventId: 'event-1',
            deviceSequence: 1,
            entityType: SyncEntityType.TASK,
            entityId: 'task-internal-1',
            operation: SyncOperation.UPDATE,
            version: 1,
            payload: { title: 'Updated Title' },
            occurredAt: new Date().toISOString(),
          },
        ],
      };

      taskRepository.findVisibleById.mockResolvedValue({
        id: 'task-internal-1',
        userId: 'user-1',
        version: 1,
      } as any);

      const result = await service.push('user-1', dto);

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-internal-1' },
          data: expect.objectContaining({ title: 'Updated Title' }),
        }),
      );
      expect(result.data.acceptedEventIds).toContain('event-1');
    });

    it('reports a conflict when versions do not match', async () => {
      const dto: PushDto = {
        deviceId: 'device-1',
        events: [
          {
            eventId: 'event-1',
            deviceSequence: 1,
            entityType: SyncEntityType.TASK,
            entityId: 'task-internal-1',
            operation: SyncOperation.UPDATE,
            version: 1,
            payload: { title: 'Stale Update' },
            occurredAt: new Date().toISOString(),
          },
        ],
      };

      taskRepository.findVisibleById.mockResolvedValue({
        id: 'task-internal-1',
        userId: 'user-1',
        version: 5,
      } as any);

      const result = await service.push('user-1', dto);

      expect(result.data.acceptedEventIds).toHaveLength(0);
      expect(result.data.rejected).toHaveLength(1);
      expect(result.data.rejected![0].code).toBe('SYNC_409_CONFLICT');
      expect(result.data.rejected![0].serverVersion).toBe(5);
    });
  });
});
