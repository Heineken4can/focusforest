import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SessionStatus,
  TaskStatus,
  type FocusSession,
  type Task,
} from '@prisma/client';
import {
  DEFAULT_BREAK_DURATION_SEC,
  DEFAULT_FOCUS_DURATION_SEC,
  DEFAULT_PAUSE_LIMIT_SEC,
} from '../../common/config/app.config';
import {
  createSuccessResponse,
  type ApiSuccessResponse,
} from '../../common/http/api-response';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RewardService } from '../rewards/reward.service';
import { FocusSessionRepository } from './focus-session.repository';
import { PauseFocusSessionDto } from './dto/pause-focus-session.dto';
import { ResumeFocusSessionDto } from './dto/resume-focus-session.dto';
import {
  GiveUpReason,
  GiveUpFocusSessionDto,
  SessionEventDto,
} from './dto/session-event.dto';
import { StartFocusSessionDto } from './dto/start-focus-session.dto';
import { SessionIdempotencyService } from './session-idempotency.service';

type DbClient = Prisma.TransactionClient | PrismaService;

type FocusSessionPayload = {
  focusSessionId: string;
  taskId: string;
  status: SessionStatus;
  startedAt: string;
  plannedFocusSec: number;
  pauseCount: number;
  pauseStartedAt: string | null;
  pauseDeadlineAt: string | null;
  focusEndedAt: string | null;
  givenUpAt: string | null;
  breakStartedAt: string | null;
  breakEndsAt: string | null;
  breakEndedAt: string | null;
  version: number;
};

@Injectable()
export class FocusSessionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly focusSessionRepository: FocusSessionRepository,
    private readonly rewardService: RewardService,
    private readonly sessionIdempotencyService: SessionIdempotencyService,
  ) {}

  async startSession(
    userId: string,
    dto: StartFocusSessionDto,
  ): Promise<
    ApiSuccessResponse<{
      activeSession: FocusSessionPayload;
      currentTask: {
        taskId: string;
        title: string;
        status: TaskStatus;
        isCore: boolean;
        isLocked: boolean;
      };
      sidebarSummary: {
        completedFocusSessionCount: number;
      };
      nextTaskCandidates: Array<{
        taskId: string;
        title: string;
        status: TaskStatus;
      }>;
      policy: {
        focusDurationSec: number;
        breakDurationSec: number;
        pauseLimitSec: number;
        maxPauseCount: number;
      };
    }>
  > {
    const startedAt = new Date(dto.startedAt);
    const { session, task } = await this.prismaService.$transaction(
      async (tx) => {
        const taskRecord = await this.focusSessionRepository.findTaskForStart(
          tx,
          userId,
          dto.taskId,
        );

        if (!taskRecord) {
          throw this.taskNotFound();
        }

        if (taskRecord.version !== dto.taskVersion) {
          this.throwTaskVersionConflict(taskRecord, dto.taskVersion);
        }

        if (taskRecord.status === TaskStatus.COMPLETED) {
          throw this.completedTaskGuard();
        }

        const activeSession =
          await this.focusSessionRepository.findActiveSession(tx, userId);

        if (activeSession) {
          throw this.alreadyRunning();
        }

        const createdSession = await this.focusSessionRepository.createSession(
          tx,
          {
            userId,
            taskId: taskRecord.id,
            clientGeneratedId: dto.clientGeneratedId,
            startedAt,
            plannedFocusSec: DEFAULT_FOCUS_DURATION_SEC,
          },
        );

        return {
          session: createdSession,
          task: taskRecord,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    const [completedFocusSessionCount, nextTaskCandidates] = await Promise.all([
      this.rewardService.getCompletedSessionCount(userId),
      this.focusSessionRepository.listNextTaskCandidates(userId, task.id, 2),
    ]);

    return createSuccessResponse('Focus session started successfully.', {
      activeSession: this.toSessionPayload(session),
      currentTask: {
        taskId: task.id,
        title: task.title,
        status: task.status,
        isCore: task.isCore,
        isLocked: true,
      },
      sidebarSummary: {
        completedFocusSessionCount,
      },
      nextTaskCandidates: nextTaskCandidates.map((candidate) => ({
        taskId: candidate.id,
        title: candidate.title,
        status: candidate.status,
      })),
      policy: {
        focusDurationSec: DEFAULT_FOCUS_DURATION_SEC,
        breakDurationSec: DEFAULT_BREAK_DURATION_SEC,
        pauseLimitSec: DEFAULT_PAUSE_LIMIT_SEC,
        maxPauseCount: 1,
      },
    });
  }

  async pauseSession(
    userId: string,
    sessionId: string,
    dto: PauseFocusSessionDto,
  ): Promise<ApiSuccessResponse<{ session: FocusSessionPayload }>> {
    const session = await this.getSessionOrThrow(userId, sessionId);

    if (session.version !== dto.version) {
      this.throwSessionVersionConflict(session, dto.version);
    }

    if (session.status !== SessionStatus.RUNNING) {
      throw this.invalidState(session.status);
    }

    if (session.pauseCount >= 1) {
      throw this.pauseLimitExceeded();
    }

    const pausedAt = new Date(dto.pausedAt);
    const pauseDeadlineAt = new Date(
      pausedAt.getTime() + DEFAULT_PAUSE_LIMIT_SEC * 1000,
    );
    const updatedSession = await this.focusSessionRepository.updateWithVersion(
      this.prismaService,
      {
        userId,
        sessionId,
        version: dto.version,
        data: {
          status: SessionStatus.PAUSED,
          pauseCount: 1,
          pauseStartedAt: pausedAt,
          pauseDeadlineAt,
        },
      },
    );

    if (!updatedSession) {
      this.throwSessionVersionConflict(
        await this.getSessionOrThrow(userId, sessionId),
        dto.version,
      );
    }

    return createSuccessResponse('Focus session paused successfully.', {
      session: this.toSessionPayload(updatedSession),
    });
  }

  async resumeSession(
    userId: string,
    sessionId: string,
    dto: ResumeFocusSessionDto,
  ): Promise<ApiSuccessResponse<{ session: FocusSessionPayload }>> {
    const session = await this.getSessionOrThrow(userId, sessionId);

    if (session.version !== dto.version) {
      this.throwSessionVersionConflict(session, dto.version);
    }

    if (session.status === SessionStatus.GIVEN_UP_TIMEOUT) {
      throw this.timeoutExceeded();
    }

    if (session.status !== SessionStatus.PAUSED) {
      throw this.invalidState(session.status);
    }

    const resumedAt = new Date(dto.resumedAt);
    await this.handlePauseTimeout(
      userId,
      session,
      resumedAt,
      this.prismaService,
    );

    const updatedSession = await this.focusSessionRepository.updateWithVersion(
      this.prismaService,
      {
        userId,
        sessionId,
        version: dto.version,
        data: {
          status: SessionStatus.RUNNING,
          pauseStartedAt: null,
          pauseDeadlineAt: null,
        },
      },
    );

    if (!updatedSession) {
      this.throwSessionVersionConflict(
        await this.getSessionOrThrow(userId, sessionId),
        dto.version,
      );
    }

    return createSuccessResponse('Focus session resumed successfully.', {
      session: this.toSessionPayload(updatedSession),
    });
  }

  async giveUpSession(
    userId: string,
    sessionId: string,
    dto: GiveUpFocusSessionDto,
  ): Promise<
    ApiSuccessResponse<{
      session: FocusSessionPayload;
      reward: {
        awardedSp: number;
        awardedTrees: number;
      };
    }>
  > {
    return this.sessionIdempotencyService.execute({
      userId,
      sessionId,
      action: 'give-up',
      eventId: dto.eventId,
      payload: dto,
      handler: async () => {
        const session = await this.getSessionOrThrow(userId, sessionId);

        if (session.version !== dto.version) {
          this.throwSessionVersionConflict(session, dto.version);
        }

        if (session.status === SessionStatus.GIVEN_UP_TIMEOUT) {
          throw this.timeoutExceeded();
        }

        if (
          session.status !== SessionStatus.RUNNING &&
          session.status !== SessionStatus.PAUSED
        ) {
          throw this.invalidState(session.status);
        }

        const occurredAt = new Date(dto.occurredAt);
        if (session.status === SessionStatus.PAUSED) {
          await this.handlePauseTimeout(
            userId,
            session,
            occurredAt,
            this.prismaService,
          );
        }

        const updatedSession =
          await this.focusSessionRepository.updateWithVersion(
            this.prismaService,
            {
              userId,
              sessionId,
              version: dto.version,
              data: {
                status:
                  dto.reason === GiveUpReason.PAUSE_TIMEOUT
                    ? SessionStatus.GIVEN_UP_TIMEOUT
                    : SessionStatus.GIVEN_UP,
                givenUpAt: occurredAt,
                pauseStartedAt: null,
                pauseDeadlineAt: null,
              },
            },
          );

        if (!updatedSession) {
          this.throwSessionVersionConflict(
            await this.getSessionOrThrow(userId, sessionId),
            dto.version,
          );
        }

        return createSuccessResponse('Focus session given up successfully.', {
          session: this.toSessionPayload(updatedSession),
          reward: {
            awardedSp: 0,
            awardedTrees: 0,
          },
        });
      },
    });
  }

  async completeSession(
    userId: string,
    sessionId: string,
    dto: SessionEventDto,
  ): Promise<
    ApiSuccessResponse<{
      session: FocusSessionPayload;
      reward: {
        awardedSp: number;
        awardedTrees: number;
        totalSp: number;
        level: number;
      };
      dailyStat: {
        statDate: string;
        focusedSeconds: number;
        completedSessions: number;
        plantedTrees: number;
      };
      progressSnapshot: {
        totalSp: number;
        currentLevel: number;
        totalCompletedSessions: number;
      };
    }>
  > {
    return this.sessionIdempotencyService.execute({
      userId,
      sessionId,
      action: 'complete',
      eventId: dto.eventId,
      payload: dto,
      handler: async () => {
        const occurredAt = new Date(dto.occurredAt);

        const result = await this.prismaService.$transaction(
          async (tx) => {
            const session = await this.focusSessionRepository.findById(
              tx,
              userId,
              sessionId,
            );

            if (!session) {
              throw this.sessionNotFound();
            }

            if (session.version !== dto.version) {
              this.throwSessionVersionConflict(session, dto.version);
            }

            if (session.status === SessionStatus.GIVEN_UP_TIMEOUT) {
              throw this.timeoutExceeded();
            }

            if (session.status === SessionStatus.PAUSED) {
              await this.handlePauseTimeout(userId, session, occurredAt, tx);
              throw this.invalidState(session.status);
            }

            if (session.status !== SessionStatus.RUNNING) {
              throw this.invalidState(session.status);
            }

            const updated = await tx.focusSession.updateMany({
              where: {
                id: sessionId,
                userId,
                version: dto.version,
              },
              data: {
                status: SessionStatus.COMPLETED,
                focusEndedAt: occurredAt,
                pauseStartedAt: null,
                pauseDeadlineAt: null,
                version: {
                  increment: 1,
                },
              },
            });

            if (updated.count !== 1) {
              this.throwSessionVersionConflict(
                await this.getSessionOrThrow(userId, sessionId, tx),
                dto.version,
              );
            }

            const completedSession = await this.getSessionOrThrow(
              userId,
              sessionId,
              tx,
            );
            const settlement = await this.rewardService.settleCompletion(tx, {
              userId,
              sessionId,
              occurredAt,
              focusedSeconds: session.plannedFocusSec,
            });

            return {
              session: completedSession,
              settlement,
            };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );

        return createSuccessResponse('Focus session completed successfully.', {
          session: this.toSessionPayload(result.session),
          reward: result.settlement.reward,
          dailyStat: result.settlement.dailyStat,
          progressSnapshot: result.settlement.progressSnapshot,
        });
      },
    });
  }

  async startBreak(
    userId: string,
    sessionId: string,
    dto: SessionEventDto,
  ): Promise<ApiSuccessResponse<{ session: FocusSessionPayload }>> {
    return this.transitionBreakState(
      userId,
      sessionId,
      dto,
      'start-break',
      SessionStatus.COMPLETED,
      {
        status: SessionStatus.BREAK_RUNNING,
        breakStartedAt: new Date(dto.occurredAt),
        breakEndsAt: new Date(
          new Date(dto.occurredAt).getTime() +
            DEFAULT_BREAK_DURATION_SEC * 1000,
        ),
      },
      'Break started successfully.',
    );
  }

  async completeBreak(
    userId: string,
    sessionId: string,
    dto: SessionEventDto,
  ): Promise<ApiSuccessResponse<{ session: FocusSessionPayload }>> {
    return this.transitionBreakState(
      userId,
      sessionId,
      dto,
      'complete-break',
      SessionStatus.BREAK_RUNNING,
      {
        status: SessionStatus.BREAK_COMPLETED,
        breakEndedAt: new Date(dto.occurredAt),
      },
      'Break completed successfully.',
    );
  }

  async skipBreak(
    userId: string,
    sessionId: string,
    dto: SessionEventDto,
  ): Promise<ApiSuccessResponse<{ session: FocusSessionPayload }>> {
    return this.transitionBreakState(
      userId,
      sessionId,
      dto,
      'skip-break',
      SessionStatus.BREAK_RUNNING,
      {
        status: SessionStatus.BREAK_SKIPPED,
        breakEndedAt: new Date(dto.occurredAt),
      },
      'Break skipped successfully.',
    );
  }

  private async transitionBreakState(
    userId: string,
    sessionId: string,
    dto: SessionEventDto,
    action: 'start-break' | 'complete-break' | 'skip-break',
    expectedStatus: SessionStatus,
    data: Prisma.FocusSessionUpdateManyMutationInput,
    message: string,
  ): Promise<ApiSuccessResponse<{ session: FocusSessionPayload }>> {
    return this.sessionIdempotencyService.execute({
      userId,
      sessionId,
      action,
      eventId: dto.eventId,
      payload: dto,
      handler: async () => {
        const session = await this.getSessionOrThrow(userId, sessionId);

        if (session.version !== dto.version) {
          this.throwSessionVersionConflict(session, dto.version);
        }

        if (session.status !== expectedStatus) {
          throw this.invalidState(session.status);
        }

        const updatedSession =
          await this.focusSessionRepository.updateWithVersion(
            this.prismaService,
            {
              userId,
              sessionId,
              version: dto.version,
              data,
            },
          );

        if (!updatedSession) {
          this.throwSessionVersionConflict(
            await this.getSessionOrThrow(userId, sessionId),
            dto.version,
          );
        }

        return createSuccessResponse(message, {
          session: this.toSessionPayload(updatedSession),
        });
      },
    });
  }

  private toSessionPayload(session: FocusSession): FocusSessionPayload {
    return {
      focusSessionId: session.id,
      taskId: session.taskId,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      plannedFocusSec: session.plannedFocusSec,
      pauseCount: session.pauseCount,
      pauseStartedAt: session.pauseStartedAt?.toISOString() ?? null,
      pauseDeadlineAt: session.pauseDeadlineAt?.toISOString() ?? null,
      focusEndedAt: session.focusEndedAt?.toISOString() ?? null,
      givenUpAt: session.givenUpAt?.toISOString() ?? null,
      breakStartedAt: session.breakStartedAt?.toISOString() ?? null,
      breakEndsAt: session.breakEndsAt?.toISOString() ?? null,
      breakEndedAt: session.breakEndedAt?.toISOString() ?? null,
      version: session.version,
    };
  }

  private async handlePauseTimeout(
    userId: string,
    session: FocusSession,
    at: Date,
    client: DbClient = this.prismaService,
  ): Promise<void> {
    if (session.status === SessionStatus.GIVEN_UP_TIMEOUT) {
      throw this.timeoutExceeded();
    }

    if (
      session.status === SessionStatus.PAUSED &&
      session.pauseDeadlineAt &&
      session.pauseDeadlineAt.getTime() <= at.getTime()
    ) {
      const timedOutSession = await this.focusSessionRepository.markTimedOut(
        client,
        {
          userId,
          sessionId: session.id,
          version: session.version,
          givenUpAt: session.pauseDeadlineAt,
        },
      );

      if (timedOutSession) {
        throw this.timeoutExceeded();
      }

      const latestSession = await this.getSessionOrThrow(
        userId,
        session.id,
        client,
      );
      if (latestSession.status === SessionStatus.GIVEN_UP_TIMEOUT) {
        throw this.timeoutExceeded();
      }

      if (latestSession.version !== session.version) {
        this.throwSessionVersionConflict(latestSession, session.version);
      }

      throw this.invalidState(latestSession.status);
    }
  }

  private async getSessionOrThrow(
    userId: string,
    sessionId: string,
    client: DbClient = this.prismaService,
  ): Promise<FocusSession> {
    const session = await this.focusSessionRepository.findById(
      client,
      userId,
      sessionId,
    );

    if (!session) {
      throw this.sessionNotFound();
    }

    return session;
  }

  private throwTaskVersionConflict(task: Task, clientVersion: number): never {
    throw new ConflictException({
      message: 'Version conflict detected.',
      code: 'SYNC_409_CONFLICT',
      data: {
        entityType: 'TASK',
        entityId: task.id,
        clientVersion,
        serverVersion: task.version,
        serverSnapshot: {
          id: task.id,
          clientGeneratedId: task.clientGeneratedId,
          title: task.title,
          description: task.description,
          status: task.status,
          isCore: task.isCore,
          version: task.version,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
        },
        resolutionStrategy: 'REPLACE_LOCAL_WITH_SERVER',
        retryable: false,
      },
    });
  }

  private throwSessionVersionConflict(
    session: FocusSession,
    clientVersion: number,
  ): never {
    throw new ConflictException({
      message: 'Version conflict detected.',
      code: 'SYNC_409_CONFLICT',
      data: {
        entityType: 'FOCUS_SESSION',
        entityId: session.id,
        clientVersion,
        serverVersion: session.version,
        serverSnapshot: this.toSessionPayload(session),
        resolutionStrategy: 'REPLACE_LOCAL_WITH_SERVER',
        retryable: false,
      },
    });
  }

  private alreadyRunning(): ConflictException {
    return new ConflictException({
      message: 'An active session already exists.',
      code: 'SESSION_409_ALREADY_RUNNING',
      data: null,
    });
  }

  private pauseLimitExceeded(): ConflictException {
    return new ConflictException({
      message: 'Pause limit exceeded.',
      code: 'SESSION_409_PAUSE_LIMIT',
      data: null,
    });
  }

  private invalidState(status: SessionStatus): ConflictException {
    return new ConflictException({
      message: 'Session transition is not allowed in the current state.',
      code: 'SESSION_409_INVALID_STATE',
      data: {
        currentStatus: status,
      },
    });
  }

  private timeoutExceeded(): ConflictException {
    return new ConflictException({
      message: 'Pause timeout exceeded.',
      code: 'SESSION_409_TIMEOUT',
      data: null,
    });
  }

  private completedTaskGuard(): ConflictException {
    return new ConflictException({
      message: 'Completed tasks cannot start focus sessions.',
      code: 'TASK_409_COMPLETED',
      data: null,
    });
  }

  private taskNotFound(): NotFoundException {
    return new NotFoundException({
      message: 'Task not found.',
      code: 'TASK_404_NOT_FOUND',
      data: null,
    });
  }

  private sessionNotFound(): NotFoundException {
    return new NotFoundException({
      message: 'Focus session not found.',
      code: 'SESSION_404_NOT_FOUND',
      data: null,
    });
  }
}
