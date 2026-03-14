import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { FocusSession, Task } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TaskRepository } from '../tasks/task.repository';
import { FocusSessionRepository } from '../focus-sessions/focus-session.repository';
import { SyncRepository, SyncSnapshot, SyncCursorData } from './sync.repository';
import { BootstrapDto, TaskUpsertInput, SessionFactInput } from './dto/bootstrap.dto';
import { PushDto, SyncEntityType, SyncOperation, SyncEventInput } from './dto/push.dto';
import { PullQueryDto } from './dto/pull.dto';
import {
  createSuccessResponse,
  ApiSuccessResponse,
} from '../../common/http/api-response';

type EntityConflictData = {
  entityType: SyncEntityType;
  entityId: string;
  clientVersion?: number;
  serverVersion: number;
  serverSnapshot: any;
  resolutionStrategy: string;
  retryable: boolean;
};

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncRepository: SyncRepository,
    private readonly taskRepository: TaskRepository,
    private readonly focusSessionRepository: FocusSessionRepository,
  ) {}

  async bootstrap(
    userId: string,
    dto: BootstrapDto,
  ): Promise<
    ApiSuccessResponse<{
      accepted: { tasks: string[]; sessions: string[] };
      serverSnapshot: SyncSnapshot;
      cursor: string;
    }>
  > {
    const acceptedTasks: string[] = [];
    const acceptedSessions: string[] = [];

    await this.prisma.$transaction(
      async (tx) => {
        for (const batch of dto.batches) {
          // Process tasks
          for (const taskInput of batch.tasks) {
            await tx.task.upsert({
              where: {
                clientGeneratedId: taskInput.clientGeneratedId,
              },
              update: {
                title: taskInput.title,
                description: taskInput.description,
                status: taskInput.status,
                isCore: taskInput.isCore,
                version: taskInput.version,
                updatedAt: new Date(taskInput.updatedAt),
                deletedAt: taskInput.deletedAt
                  ? new Date(taskInput.deletedAt)
                  : null,
              },
              create: {
                userId,
                clientGeneratedId: taskInput.clientGeneratedId,
                title: taskInput.title,
                description: taskInput.description,
                status: taskInput.status,
                isCore: taskInput.isCore,
                version: taskInput.version,
                createdAt: new Date(taskInput.createdAt),
                updatedAt: new Date(taskInput.updatedAt),
              },
            });
            acceptedTasks.push(taskInput.clientGeneratedId);
          }

          // Process sessions
          for (const sessionInput of batch.sessions) {
            let taskId = sessionInput.taskId;
            
            const task = await tx.task.findUnique({
              where: { clientGeneratedId: sessionInput.taskId }
            });
            if (task) {
              taskId = task.id;
            }

            await tx.focusSession.upsert({
              where: {
                clientGeneratedId: sessionInput.clientGeneratedId,
              },
              update: {
                status: sessionInput.status,
                plannedFocusSec: sessionInput.plannedFocusSec,
                startedAt: new Date(sessionInput.startedAt),
                pauseCount: sessionInput.pauseCount,
                pauseStartedAt: sessionInput.pauseStartedAt
                  ? new Date(sessionInput.pauseStartedAt)
                  : null,
                pauseDeadlineAt: sessionInput.pauseDeadlineAt
                  ? new Date(sessionInput.pauseDeadlineAt)
                  : null,
                focusEndedAt: sessionInput.focusEndedAt
                  ? new Date(sessionInput.focusEndedAt)
                  : null,
                givenUpAt: sessionInput.givenUpAt
                  ? new Date(sessionInput.givenUpAt)
                  : null,
                breakStartedAt: sessionInput.breakStartedAt
                  ? new Date(sessionInput.breakStartedAt)
                  : null,
                breakEndsAt: sessionInput.breakEndsAt
                  ? new Date(sessionInput.breakEndsAt)
                  : null,
                breakEndedAt: sessionInput.breakEndedAt
                  ? new Date(sessionInput.breakEndedAt)
                  : null,
                version: sessionInput.version,
                updatedAt: new Date(sessionInput.updatedAt),
              },
              create: {
                userId,
                taskId,
                clientGeneratedId: sessionInput.clientGeneratedId,
                status: sessionInput.status,
                plannedFocusSec: sessionInput.plannedFocusSec,
                startedAt: new Date(sessionInput.startedAt),
                pauseCount: sessionInput.pauseCount,
                pauseStartedAt: sessionInput.pauseStartedAt
                  ? new Date(sessionInput.pauseStartedAt)
                  : null,
                pauseDeadlineAt: sessionInput.pauseDeadlineAt
                  ? new Date(sessionInput.pauseDeadlineAt)
                  : null,
                focusEndedAt: sessionInput.focusEndedAt
                  ? new Date(sessionInput.focusEndedAt)
                  : null,
                givenUpAt: sessionInput.givenUpAt
                  ? new Date(sessionInput.givenUpAt)
                  : null,
                breakStartedAt: sessionInput.breakStartedAt
                  ? new Date(sessionInput.breakStartedAt)
                  : null,
                breakEndsAt: sessionInput.breakEndsAt
                  ? new Date(sessionInput.breakEndsAt)
                  : null,
                breakEndedAt: sessionInput.breakEndedAt
                  ? new Date(sessionInput.breakEndedAt)
                  : null,
                version: sessionInput.version,
                createdAt: new Date(sessionInput.createdAt),
                updatedAt: new Date(sessionInput.updatedAt),
              },
            });
            acceptedSessions.push(sessionInput.clientGeneratedId);
          }
        }
      },
      { isolationLevel: 'Serializable' },
    );

    const snapshot = await this.syncRepository.getLatestSnapshot(userId);
    const cursor = this.encodeCursor({
      updatedAt: new Date(),
      id: 'max',
    });
    snapshot.syncState.lastCursor = cursor;

    await this.syncRepository.upsertCursor(userId, dto.deviceId, cursor);

    return createSuccessResponse('Bootstrap successful.', {
      accepted: {
        tasks: acceptedTasks,
        sessions: acceptedSessions,
      },
      serverSnapshot: snapshot,
      cursor,
    });
  }

  async push(
    userId: string,
    dto: PushDto,
  ): Promise<
    ApiSuccessResponse<{
      acceptedEventIds: string[];
      rejected?: any[];
      cursor: string;
    }>
  > {
    const acceptedEventIds: string[] = [];
    const rejected: any[] = [];

    for (const event of dto.events) {
      try {
        await this.processEvent(userId, event);
        acceptedEventIds.push(event.eventId);
      } catch (error) {
        if (error instanceof ConflictException) {
          const response = error.getResponse() as any;
          rejected.push({
            eventId: event.eventId,
            code: response.code,
            ...response.data,
          });
        } else {
          throw error;
        }
      }
    }

    const cursor = this.encodeCursor({
      updatedAt: new Date(),
      id: 'max',
    });
    await this.syncRepository.upsertCursor(userId, dto.deviceId, cursor);

    return createSuccessResponse('Push processed.', {
      acceptedEventIds,
      rejected: rejected.length > 0 ? rejected : undefined,
      cursor,
    });
  }

  async pull(
    userId: string,
    query: PullQueryDto,
  ): Promise<
    ApiSuccessResponse<{
      changes: {
        tasks: Task[];
        sessions: FocusSession[];
      };
    }> & { meta: { cursor: string; hasMore: boolean } }
  > {
    const cursor = this.parseCursor(query.cursor);
    const limit = query.limit ?? 50;

    const [tasks, sessions] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          userId,
          ...(cursor
            ? {
                OR: [
                  { updatedAt: { gt: cursor.updatedAt } },
                  { updatedAt: cursor.updatedAt, id: { gt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
        take: limit,
      }),
      this.prisma.focusSession.findMany({
        where: {
          userId,
          ...(cursor
            ? {
                OR: [
                  { updatedAt: { gt: cursor.updatedAt } },
                  { updatedAt: cursor.updatedAt, id: { gt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
        take: limit,
      }),
    ]);

    const hasMore = tasks.length === limit || sessions.length === limit;
    
    let lastItem: { updatedAt: Date; id: string } | null = null;
    if (tasks.length > 0 || sessions.length > 0) {
        const allItems = [...tasks, ...sessions].sort((a, b) => {
            const timeDiff = a.updatedAt.getTime() - b.updatedAt.getTime();
            if (timeDiff !== 0) return timeDiff;
            return a.id.localeCompare(b.id);
        });
        lastItem = allItems[allItems.length - 1];
    }

    const nextCursor = lastItem 
        ? this.encodeCursor({ updatedAt: lastItem.updatedAt, id: lastItem.id })
        : (query.cursor || this.encodeCursor({ updatedAt: new Date(0), id: '' }));

    return {
      status: 'success',
      message: 'Pull successful.',
      data: {
        changes: {
          tasks,
          sessions,
        },
      },
      meta: {
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  private async processEvent(userId: string, event: SyncEventInput): Promise<void> {
    const { entityType, entityId, operation, payload, version } = event;

    if (entityType === SyncEntityType.TASK) {
      if (operation === SyncOperation.CREATE) {
        await this.prisma.task.upsert({
          where: { clientGeneratedId: entityId },
          update: {}, 
          create: {
            userId,
            clientGeneratedId: entityId,
            title: payload.title,
            description: payload.description,
            status: payload.status,
            isCore: payload.isCore,
            version: 1,
            createdAt: new Date(event.occurredAt),
            updatedAt: new Date(event.occurredAt),
          },
        });
      } else if (operation === SyncOperation.UPDATE) {
        const task = await this.taskRepository.findVisibleById(userId, entityId);

        if (!task) {
          const taskByClientId = await this.taskRepository.findByClientGeneratedId(userId, entityId);
          if (!taskByClientId) {
            throw new BadRequestException('Task not found.');
          }
          return this.updateTask(userId, taskByClientId, payload, version);
        }
        await this.updateTask(userId, task, payload, version);
      }
    } else if (entityType === SyncEntityType.FOCUS_SESSION) {
      if (operation === SyncOperation.CREATE) {
        let taskId = payload.taskId;
        const task = await this.taskRepository.findByClientGeneratedId(userId, payload.taskId);
        if (task) {
          taskId = task.id;
        }

        await this.prisma.focusSession.upsert({
          where: { clientGeneratedId: entityId },
          update: {},
          create: {
            userId,
            taskId,
            clientGeneratedId: entityId,
            status: payload.status,
            plannedFocusSec: payload.plannedFocusSec,
            startedAt: new Date(payload.startedAt),
            version: 1,
            createdAt: new Date(event.occurredAt),
            updatedAt: new Date(event.occurredAt),
          },
        });
      } else if (operation === SyncOperation.UPDATE) {
        const session = await this.focusSessionRepository.findById(this.prisma, userId, entityId);

        if (!session) {
          // Find by clientGeneratedId if id is not found
          const sessionByClientId = await this.prisma.focusSession.findUnique({
            where: { clientGeneratedId: entityId }
          });
          if (!sessionByClientId || sessionByClientId.userId !== userId) {
            throw new BadRequestException('Focus session not found.');
          }
          return this.updateSession(userId, sessionByClientId, payload, version);
        }
        await this.updateSession(userId, session, payload, version);
      }
    }
  }

  private async updateTask(
    userId: string,
    task: Task,
    payload: any,
    clientVersion?: number,
  ): Promise<void> {
    if (clientVersion !== undefined && task.version !== clientVersion) {
      throw new ConflictException({
        message: 'Version conflict.',
        code: 'SYNC_409_CONFLICT',
        data: {
          entityType: SyncEntityType.TASK,
          entityId: task.id,
          clientVersion,
          serverVersion: task.version,
          serverSnapshot: task,
          resolutionStrategy: 'REPLACE_LOCAL_WITH_SERVER',
          retryable: false,
        } satisfies EntityConflictData,
      });
    }

    await this.prisma.task.update({
      where: { id: task.id },
      data: {
        ...payload,
        version: { increment: 1 },
      },
    });
  }

  private async updateSession(
    userId: string,
    session: FocusSession,
    payload: any,
    clientVersion?: number,
  ): Promise<void> {
    if (clientVersion !== undefined && session.version !== clientVersion) {
      throw new ConflictException({
        message: 'Version conflict.',
        code: 'SYNC_409_CONFLICT',
        data: {
          entityType: SyncEntityType.FOCUS_SESSION,
          entityId: session.id,
          clientVersion,
          serverVersion: session.version,
          serverSnapshot: session,
          resolutionStrategy: 'REPLACE_LOCAL_WITH_SERVER',
          retryable: false,
        } satisfies EntityConflictData,
      });
    }

    await this.prisma.focusSession.update({
      where: { id: session.id },
      data: {
        ...payload,
        version: { increment: 1 },
      },
    });
  }

  private parseCursor(cursor?: string): SyncCursorData | undefined {
    if (!cursor) return undefined;
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as { updatedAt: string; id: string };

      return {
        updatedAt: new Date(decoded.updatedAt),
        id: decoded.id,
      };
    } catch {
      throw new BadRequestException('Invalid sync cursor.');
    }
  }

  private encodeCursor(cursor: SyncCursorData): string {
    return Buffer.from(
      JSON.stringify({
        updatedAt: cursor.updatedAt.toISOString(),
        id: cursor.id,
      }),
      'utf8',
    ).toString('base64url');
  }
}
