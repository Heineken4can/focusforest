import { Injectable } from '@nestjs/common';
import {
  Prisma,
  SessionStatus,
  TaskStatus,
  type FocusSession,
  type Task,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

const ACTIVE_SESSION_STATUSES: SessionStatus[] = [
  SessionStatus.RUNNING,
  SessionStatus.PAUSED,
  SessionStatus.BREAK_RUNNING,
];

const COMPLETED_FOCUS_STATUSES: SessionStatus[] = [
  SessionStatus.COMPLETED,
  SessionStatus.BREAK_RUNNING,
  SessionStatus.BREAK_COMPLETED,
  SessionStatus.BREAK_SKIPPED,
];

export type TaskCandidate = {
  id: string;
  title: string;
  status: TaskStatus;
};

@Injectable()
export class FocusSessionRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findTaskForStart(
    client: DbClient,
    userId: string,
    taskId: string,
  ): Promise<Task | null> {
    return client.task.findFirst({
      where: {
        id: taskId,
        userId,
        deletedAt: null,
      },
    });
  }

  findActiveSession(
    client: DbClient,
    userId: string,
  ): Promise<FocusSession | null> {
    return client.focusSession.findFirst({
      where: {
        userId,
        status: {
          in: ACTIVE_SESSION_STATUSES,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  createSession(
    client: DbClient,
    input: {
      userId: string;
      taskId: string;
      clientGeneratedId: string;
      startedAt: Date;
      plannedFocusSec: number;
    },
  ): Promise<FocusSession> {
    return client.focusSession.create({
      data: {
        userId: input.userId,
        taskId: input.taskId,
        clientGeneratedId: input.clientGeneratedId,
        startedAt: input.startedAt,
        plannedFocusSec: input.plannedFocusSec,
      },
    });
  }

  findById(
    client: DbClient,
    userId: string,
    sessionId: string,
  ): Promise<FocusSession | null> {
    return client.focusSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });
  }

  async updateWithVersion(
    client: DbClient,
    input: {
      userId: string;
      sessionId: string;
      version: number;
      data: Prisma.FocusSessionUpdateManyMutationInput;
    },
  ): Promise<FocusSession | null> {
    const updated = await client.focusSession.updateMany({
      where: {
        id: input.sessionId,
        userId: input.userId,
        version: input.version,
      },
      data: {
        ...input.data,
        version: {
          increment: 1,
        },
      },
    });

    if (updated.count !== 1) {
      return null;
    }

    return client.focusSession.findFirst({
      where: {
        id: input.sessionId,
        userId: input.userId,
      },
    });
  }

  async markTimedOut(
    client: DbClient,
    input: {
      userId: string;
      sessionId: string;
      version: number;
      givenUpAt: Date;
    },
  ): Promise<FocusSession | null> {
    const updated = await client.focusSession.updateMany({
      where: {
        id: input.sessionId,
        userId: input.userId,
        version: input.version,
        status: SessionStatus.PAUSED,
      },
      data: {
        status: SessionStatus.GIVEN_UP_TIMEOUT,
        givenUpAt: input.givenUpAt,
        pauseStartedAt: null,
        pauseDeadlineAt: null,
        version: {
          increment: 1,
        },
      },
    });

    if (updated.count !== 1) {
      return null;
    }

    return client.focusSession.findFirst({
      where: {
        id: input.sessionId,
        userId: input.userId,
      },
    });
  }

  listNextTaskCandidates(
    userId: string,
    excludeTaskId: string,
    limit: number,
  ): Promise<TaskCandidate[]> {
    return this.prismaService.task.findMany({
      where: {
        userId,
        deletedAt: null,
        status: TaskStatus.PENDING,
        id: {
          not: excludeTaskId,
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
      orderBy: [
        {
          updatedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      take: limit,
    });
  }

  countCompletedFocusSessions(userId: string): Promise<number> {
    return this.prismaService.focusSession.count({
      where: {
        userId,
        status: {
          in: COMPLETED_FOCUS_STATUSES,
        },
      },
    });
  }
}
