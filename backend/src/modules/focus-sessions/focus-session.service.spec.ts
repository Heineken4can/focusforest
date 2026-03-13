import {
  SessionStatus,
  TaskStatus,
  type FocusSession,
  type Task,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RewardService } from '../rewards/reward.service';
import { FocusSessionRepository } from './focus-session.repository';
import { FocusSessionService } from './focus-session.service';
import { PauseFocusSessionDto } from './dto/pause-focus-session.dto';
import {
  GiveUpReason,
  SessionEventDto,
  type GiveUpFocusSessionDto,
} from './dto/session-event.dto';
import { StartFocusSessionDto } from './dto/start-focus-session.dto';
import { SessionIdempotencyService } from './session-idempotency.service';

const TASK_ID = '0195d7fe-aaaa-7aaa-8aaa-aaaaaaaaaaaa';
const SESSION_ID = 'session-1';

const createTaskRecord = (overrides: Partial<Task> = {}): Task => ({
  id: TASK_ID,
  userId: 'user-1',
  clientGeneratedId: '0195d7fe-1111-7111-8111-111111111111',
  title: 'Task title',
  description: 'Task description',
  status: TaskStatus.PENDING,
  isCore: false,
  version: 1,
  createdAt: new Date('2026-03-13T00:00:00.000Z'),
  updatedAt: new Date('2026-03-13T00:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

const createSessionRecord = (
  overrides: Partial<FocusSession> = {},
): FocusSession => ({
  id: SESSION_ID,
  userId: 'user-1',
  taskId: TASK_ID,
  clientGeneratedId: '0195d7fe-2222-7222-8222-222222222222',
  status: SessionStatus.RUNNING,
  plannedFocusSec: 1500,
  startedAt: new Date('2026-03-13T00:00:00.000Z'),
  pauseStartedAt: null,
  pauseDeadlineAt: null,
  pauseCount: 0,
  focusEndedAt: null,
  givenUpAt: null,
  breakStartedAt: null,
  breakEndsAt: null,
  breakEndedAt: null,
  version: 1,
  createdAt: new Date('2026-03-13T00:00:00.000Z'),
  updatedAt: new Date('2026-03-13T00:00:00.000Z'),
  ...overrides,
});

describe('FocusSessionService', () => {
  let service: FocusSessionService;
  let prismaService: { $transaction: jest.Mock };
  let repository: jest.Mocked<FocusSessionRepository>;
  let rewardService: jest.Mocked<RewardService>;
  let idempotencyService: jest.Mocked<SessionIdempotencyService>;

  beforeEach(() => {
    prismaService = {
      $transaction: jest.fn((callback: (tx: PrismaService) => unknown) =>
        Promise.resolve(callback(prismaService as unknown as PrismaService)),
      ),
    };
    repository = {
      findTaskForStart: jest.fn(),
      findActiveSession: jest.fn(),
      createSession: jest.fn(),
      findById: jest.fn(),
      updateWithVersion: jest.fn(),
      markTimedOut: jest.fn(),
      listNextTaskCandidates: jest.fn(),
      countCompletedFocusSessions: jest.fn(),
    } as unknown as jest.Mocked<FocusSessionRepository>;
    rewardService = {
      settleCompletion: jest.fn(),
      getCompletedSessionCount: jest.fn(),
      calculateLevel: jest.fn(),
    } as unknown as jest.Mocked<RewardService>;
    idempotencyService = {
      execute: jest.fn(({ handler }: { handler: () => Promise<unknown> }) =>
        handler(),
      ),
    } as unknown as jest.Mocked<SessionIdempotencyService>;

    service = new FocusSessionService(
      prismaService as unknown as PrismaService,
      repository,
      rewardService,
      idempotencyService,
    );
  });

  it('starts a focus session successfully', async () => {
    repository.findTaskForStart.mockResolvedValue(createTaskRecord());
    repository.findActiveSession.mockResolvedValue(null);
    repository.createSession.mockResolvedValue(createSessionRecord());
    repository.listNextTaskCandidates.mockResolvedValue([]);
    rewardService.getCompletedSessionCount.mockResolvedValue(0);

    const result = await service.startSession('user-1', {
      taskId: TASK_ID,
      taskVersion: 1,
      clientGeneratedId: '0195d7fe-3333-7333-8333-333333333333',
      startedAt: '2026-03-13T00:00:00.000Z',
    } satisfies StartFocusSessionDto);

    expect(result.data.activeSession.focusSessionId).toBe(SESSION_ID);
    expect(result.data.currentTask.isLocked).toBe(true);
  });

  it('blocks session start for completed tasks', async () => {
    repository.findTaskForStart.mockResolvedValue(
      createTaskRecord({ status: TaskStatus.COMPLETED }),
    );

    await expect(
      service.startSession('user-1', {
        taskId: TASK_ID,
        taskVersion: 1,
        clientGeneratedId: '0195d7fe-3333-7333-8333-333333333333',
        startedAt: '2026-03-13T00:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'TASK_409_COMPLETED',
      },
    });
  });

  it('pauses a running session', async () => {
    repository.findById.mockResolvedValue(createSessionRecord());
    repository.updateWithVersion.mockResolvedValue(
      createSessionRecord({
        status: SessionStatus.PAUSED,
        version: 2,
        pauseCount: 1,
      }),
    );

    const result = await service.pauseSession('user-1', SESSION_ID, {
      version: 1,
      pausedAt: '2026-03-13T00:05:00.000Z',
    } satisfies PauseFocusSessionDto);

    expect(result.data.session.status).toBe(SessionStatus.PAUSED);
    expect(result.data.session.version).toBe(2);
  });

  it('returns timeout on resume after pause deadline', async () => {
    repository.findById.mockResolvedValue(
      createSessionRecord({
        status: SessionStatus.PAUSED,
        version: 2,
        pauseStartedAt: new Date('2026-03-13T00:05:00.000Z'),
        pauseDeadlineAt: new Date('2026-03-13T00:10:00.000Z'),
        pauseCount: 1,
      }),
    );
    repository.markTimedOut.mockResolvedValue(
      createSessionRecord({
        status: SessionStatus.GIVEN_UP_TIMEOUT,
        version: 3,
      }),
    );

    await expect(
      service.resumeSession('user-1', SESSION_ID, {
        version: 2,
        resumedAt: '2026-03-13T00:11:00.000Z',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'SESSION_409_TIMEOUT',
      },
    });
  });

  it('returns a version conflict when timeout transition loses a race', async () => {
    repository.findById
      .mockResolvedValueOnce(
        createSessionRecord({
          status: SessionStatus.PAUSED,
          version: 2,
          pauseStartedAt: new Date('2026-03-13T00:05:00.000Z'),
          pauseDeadlineAt: new Date('2026-03-13T00:10:00.000Z'),
          pauseCount: 1,
        }),
      )
      .mockResolvedValueOnce(
        createSessionRecord({
          status: SessionStatus.RUNNING,
          version: 3,
        }),
      );
    repository.markTimedOut.mockResolvedValue(null);

    await expect(
      service.resumeSession('user-1', SESSION_ID, {
        version: 2,
        resumedAt: '2026-03-13T00:11:00.000Z',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'SYNC_409_CONFLICT',
        data: {
          serverVersion: 3,
        },
      },
    });
  });

  it('settles rewards when completing a session', async () => {
    repository.findById.mockResolvedValue(createSessionRecord({ version: 2 }));
    rewardService.settleCompletion.mockResolvedValue({
      reward: {
        awardedSp: 100,
        awardedTrees: 1,
        totalSp: 100,
        level: 1,
      },
      dailyStat: {
        statDate: '2026-03-13',
        focusedSeconds: 1500,
        completedSessions: 1,
        plantedTrees: 1,
      },
      progressSnapshot: {
        totalSp: 100,
        currentLevel: 1,
        totalCompletedSessions: 1,
      },
    });
    prismaService.$transaction.mockImplementationOnce(
      (callback: (tx: PrismaService) => unknown) => {
        const tx = {
          ...(prismaService as unknown as PrismaService),
          focusSession: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        } as unknown as PrismaService;
        repository.findById
          .mockResolvedValueOnce(createSessionRecord({ version: 2 }))
          .mockResolvedValueOnce(
            createSessionRecord({
              version: 3,
              status: SessionStatus.COMPLETED,
              focusEndedAt: new Date('2026-03-13T00:25:00.000Z'),
            }),
          );
        return Promise.resolve(callback(tx));
      },
    );

    const result = await service.completeSession('user-1', SESSION_ID, {
      version: 2,
      eventId: '0195d7fe-4444-7444-8444-444444444444',
      occurredAt: '2026-03-13T00:25:00.000Z',
    } satisfies SessionEventDto);

    expect(result.data.reward.totalSp).toBe(100);
    expect(result.data.session.status).toBe(SessionStatus.COMPLETED);
  });

  it('applies idempotency for give-up actions', async () => {
    repository.findById.mockResolvedValue(createSessionRecord({ version: 1 }));
    repository.updateWithVersion.mockResolvedValue(
      createSessionRecord({
        version: 2,
        status: SessionStatus.GIVEN_UP,
        givenUpAt: new Date('2026-03-13T00:10:00.000Z'),
      }),
    );

    const result = await service.giveUpSession('user-1', SESSION_ID, {
      version: 1,
      eventId: '0195d7fe-5555-7555-8555-555555555555',
      occurredAt: '2026-03-13T00:10:00.000Z',
      reason: GiveUpReason.USER_CANCEL,
    } satisfies GiveUpFocusSessionDto);

    expect(idempotencyService.execute.mock.calls).toHaveLength(1);
    expect(result.data.reward.awardedSp).toBe(0);
  });

  it('rejects invalid break transitions', async () => {
    repository.findById.mockResolvedValue(
      createSessionRecord({
        version: 3,
        status: SessionStatus.RUNNING,
      }),
    );

    await expect(
      service.startBreak('user-1', SESSION_ID, {
        version: 3,
        eventId: '0195d7fe-6666-7666-8666-666666666666',
        occurredAt: '2026-03-13T00:30:00.000Z',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'SESSION_409_INVALID_STATE',
      },
    });
  });
});
