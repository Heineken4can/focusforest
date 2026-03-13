import { Injectable } from '@nestjs/common';
import {
  Prisma,
  SessionStatus,
  Task,
  TaskStatus,
  type PrismaPromise,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export type TaskCursor = {
  updatedAt: Date;
  id: string;
};

type TransactionClient = Prisma.TransactionClient;

const ACTIVE_SESSION_STATUSES: SessionStatus[] = [
  SessionStatus.RUNNING,
  SessionStatus.PAUSED,
  SessionStatus.BREAK_RUNNING,
];

export type TaskWriteResult =
  | {
      status: 'updated';
      task: Task;
    }
  | {
      status: 'active_lock';
    }
  | {
      status: 'version_conflict';
    };

@Injectable()
export class TaskRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findVisibleById(userId: string, taskId: string): Promise<Task | null> {
    return this.prismaService.task.findFirst({
      where: {
        id: taskId,
        userId,
        deletedAt: null,
      },
    });
  }

  findByClientGeneratedId(
    userId: string,
    clientGeneratedId: string,
  ): Promise<Task | null> {
    return this.prismaService.task.findFirst({
      where: {
        userId,
        clientGeneratedId,
        deletedAt: null,
      },
    });
  }

  listVisible(input: {
    userId: string;
    status?: TaskStatus;
    isCore?: boolean;
    limit: number;
    cursor?: TaskCursor;
  }): Promise<Task[]> {
    const { userId, status, isCore, limit, cursor } = input;

    return this.prismaService.task.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(typeof isCore === 'boolean' ? { isCore } : {}),
        ...(cursor
          ? {
              OR: [
                {
                  updatedAt: {
                    lt: cursor.updatedAt,
                  },
                },
                {
                  updatedAt: cursor.updatedAt,
                  id: {
                    lt: cursor.id,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [
        {
          updatedAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: limit + 1,
    });
  }

  hasActiveSession(userId: string, taskId: string): Promise<boolean> {
    return this.prismaService.focusSession
      .findFirst({
        where: {
          userId,
          taskId,
          status: {
            in: ACTIVE_SESSION_STATUSES,
          },
        },
        select: {
          id: true,
        },
      })
      .then((session) => session !== null);
  }

  createTask(input: {
    userId: string;
    clientGeneratedId: string;
    title: string;
    description?: string;
    isCore: boolean;
  }): Promise<Task> {
    return this.prismaService.$transaction(
      (tx) => this.createTaskInTransaction(tx, input),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  updateTaskWithVersion(input: {
    userId: string;
    taskId: string;
    version: number;
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    isCore?: boolean;
  }): Promise<TaskWriteResult> {
    return this.prismaService.$transaction(
      async (tx) => {
        if (
          await this.hasActiveSessionInTransaction(
            tx,
            input.userId,
            input.taskId,
          )
        ) {
          return {
            status: 'active_lock',
          } satisfies TaskWriteResult;
        }

        if (input.isCore === true) {
          await this.unsetCoreTasks(tx, input.userId, input.taskId);
        }

        const updatedCount = await tx.task.updateMany({
          where: {
            id: input.taskId,
            userId: input.userId,
            version: input.version,
            deletedAt: null,
          },
          data: {
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.isCore !== undefined ? { isCore: input.isCore } : {}),
            version: {
              increment: 1,
            },
          },
        });

        if (updatedCount.count !== 1) {
          return {
            status: 'version_conflict',
          } satisfies TaskWriteResult;
        }

        const task = await tx.task.findFirstOrThrow({
          where: {
            id: input.taskId,
            userId: input.userId,
            deletedAt: null,
          },
        });

        return {
          status: 'updated',
          task,
        } satisfies TaskWriteResult;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  softDeleteTask(input: {
    userId: string;
    taskId: string;
    version: number;
    deletedAt: Date;
  }): Promise<TaskWriteResult> {
    return this.prismaService.$transaction(
      async (tx) => {
        if (
          await this.hasActiveSessionInTransaction(
            tx,
            input.userId,
            input.taskId,
          )
        ) {
          return {
            status: 'active_lock',
          } satisfies TaskWriteResult;
        }

        const updatedCount = await tx.task.updateMany({
          where: {
            id: input.taskId,
            userId: input.userId,
            version: input.version,
            deletedAt: null,
          },
          data: {
            deletedAt: input.deletedAt,
            isCore: false,
            version: {
              increment: 1,
            },
          },
        });

        if (updatedCount.count !== 1) {
          return {
            status: 'version_conflict',
          } satisfies TaskWriteResult;
        }

        const task = await tx.task.findFirstOrThrow({
          where: {
            id: input.taskId,
            userId: input.userId,
          },
        });

        return {
          status: 'updated',
          task,
        } satisfies TaskWriteResult;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  private createTaskInTransaction(
    tx: TransactionClient,
    input: {
      userId: string;
      clientGeneratedId: string;
      title: string;
      description?: string;
      isCore: boolean;
    },
  ): Promise<Task> {
    return (async () => {
      if (input.isCore) {
        await this.unsetCoreTasks(tx, input.userId);
      }

      return tx.task.create({
        data: {
          userId: input.userId,
          clientGeneratedId: input.clientGeneratedId,
          title: input.title,
          description: input.description,
          isCore: input.isCore,
        },
      });
    })();
  }

  private hasActiveSessionInTransaction(
    tx: TransactionClient,
    userId: string,
    taskId: string,
  ): PrismaPromise<{ id: string } | null> {
    return tx.focusSession.findFirst({
      where: {
        userId,
        taskId,
        status: {
          in: ACTIVE_SESSION_STATUSES,
        },
      },
      select: {
        id: true,
      },
    });
  }

  private unsetCoreTasks(
    tx: TransactionClient,
    userId: string,
    excludeTaskId?: string,
  ): Promise<Prisma.BatchPayload> {
    return tx.task.updateMany({
      where: {
        userId,
        isCore: true,
        deletedAt: null,
        ...(excludeTaskId
          ? {
              id: {
                not: excludeTaskId,
              },
            }
          : {}),
      },
      data: {
        isCore: false,
        version: {
          increment: 1,
        },
      },
    });
  }
}
