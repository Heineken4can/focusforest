import { PrismaClient, MetricEventName, SessionStatus, TaskStatus, ThemeMode } from '@prisma/client';

const prisma = new PrismaClient();
const seedPasswordHash = '$argon2id$v=19$m=65536,t=3,p=4$HhFKXJI+YJmspiaW2Uzj2w$evnfVOUwzaxzmZUlMflKOAM9kZhoy2xP6oqMQdpha98';

const users = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'seed-user1@example.com',
    passwordHash: seedPasswordHash,
    displayName: 'Seed User 1',
    avatarUrl: null,
    version: 1,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'seed-user2@example.com',
    passwordHash: seedPasswordHash,
    displayName: 'Seed User 2',
    avatarUrl: null,
    version: 1,
  },
] as const;

const settings = [
  {
    id: '31111111-1111-4111-8111-111111111111',
    userId: users[0].id,
    theme: ThemeMode.SYSTEM,
    timezone: 'Asia/Seoul',
    syncEnabled: true,
    version: 1,
  },
  {
    id: '32222222-2222-4222-8222-222222222222',
    userId: users[1].id,
    theme: ThemeMode.SYSTEM,
    timezone: 'Asia/Seoul',
    syncEnabled: true,
    version: 1,
  },
] as const;

const tasks = [
  {
    id: '41111111-1111-4111-8111-111111111111',
    userId: users[0].id,
    clientGeneratedId: '51111111-1111-4111-8111-111111111111',
    title: 'Deep work block',
    description: 'Primary pending task',
    status: TaskStatus.PENDING,
    isCore: true,
    version: 1,
    deletedAt: null,
  },
  {
    id: '41111111-1111-4111-8111-111111111112',
    userId: users[0].id,
    clientGeneratedId: '51111111-1111-4111-8111-111111111112',
    title: 'Inbox cleanup',
    description: 'Secondary pending task',
    status: TaskStatus.PENDING,
    isCore: false,
    version: 2,
    deletedAt: null,
  },
  {
    id: '41111111-1111-4111-8111-111111111113',
    userId: users[0].id,
    clientGeneratedId: '51111111-1111-4111-8111-111111111113',
    title: 'Completed review',
    description: 'Completed task cannot remain core',
    status: TaskStatus.COMPLETED,
    isCore: false,
    version: 3,
    deletedAt: null,
  },
  {
    id: '42222222-2222-4222-8222-222222222221',
    userId: users[1].id,
    clientGeneratedId: '52222222-2222-4222-8222-222222222221',
    title: 'Plan sprint',
    description: 'Core pending task for second user',
    status: TaskStatus.PENDING,
    isCore: true,
    version: 1,
    deletedAt: null,
  },
  {
    id: '42222222-2222-4222-8222-222222222222',
    userId: users[1].id,
    clientGeneratedId: '52222222-2222-4222-8222-222222222222',
    title: 'Archive notes',
    description: 'Soft deleted task sample',
    status: TaskStatus.PENDING,
    isCore: false,
    version: 4,
    deletedAt: new Date('2026-03-12T08:00:00.000Z'),
  },
  {
    id: '42222222-2222-4222-8222-222222222223',
    userId: users[1].id,
    clientGeneratedId: '52222222-2222-4222-8222-222222222223',
    title: 'Write recap',
    description: 'Completed task sample',
    status: TaskStatus.COMPLETED,
    isCore: false,
    version: 2,
    deletedAt: null,
  },
] as const;

const focusSessions = [
  {
    id: '61111111-1111-4111-8111-111111111111',
    userId: users[0].id,
    taskClientGeneratedId: tasks[0].clientGeneratedId,
    clientGeneratedId: '71111111-1111-4111-8111-111111111111',
    status: SessionStatus.RUNNING,
    plannedFocusSec: 1500,
    startedAt: new Date('2026-03-13T00:30:00.000Z'),
    pauseCount: 0,
    version: 1,
  },
  {
    id: '61111111-1111-4111-8111-111111111112',
    userId: users[0].id,
    taskClientGeneratedId: tasks[2].clientGeneratedId,
    clientGeneratedId: '71111111-1111-4111-8111-111111111112',
    status: SessionStatus.COMPLETED,
    plannedFocusSec: 1500,
    startedAt: new Date('2026-03-11T01:00:00.000Z'),
    pauseCount: 0,
    focusEndedAt: new Date('2026-03-11T01:25:00.000Z'),
    version: 2,
  },
  {
    id: '62222222-2222-4222-8222-222222222221',
    userId: users[1].id,
    taskClientGeneratedId: tasks[3].clientGeneratedId,
    clientGeneratedId: '72222222-2222-4222-8222-222222222221',
    status: SessionStatus.BREAK_COMPLETED,
    plannedFocusSec: 1500,
    startedAt: new Date('2026-03-10T03:00:00.000Z'),
    pauseCount: 1,
    pauseStartedAt: new Date('2026-03-10T03:10:00.000Z'),
    pauseDeadlineAt: new Date('2026-03-10T03:15:00.000Z'),
    focusEndedAt: new Date('2026-03-10T03:30:00.000Z'),
    breakStartedAt: new Date('2026-03-10T03:30:00.000Z'),
    breakEndsAt: new Date('2026-03-10T03:35:00.000Z'),
    breakEndedAt: new Date('2026-03-10T03:35:00.000Z'),
    version: 4,
  },
  {
    id: '62222222-2222-4222-8222-222222222222',
    userId: users[1].id,
    taskClientGeneratedId: tasks[5].clientGeneratedId,
    clientGeneratedId: '72222222-2222-4222-8222-222222222222',
    status: SessionStatus.GIVEN_UP,
    plannedFocusSec: 1500,
    startedAt: new Date('2026-03-09T04:00:00.000Z'),
    pauseCount: 0,
    givenUpAt: new Date('2026-03-09T04:05:00.000Z'),
    version: 2,
  },
] as const;

const rewardLedgers = [
  {
    id: '81111111-1111-4111-8111-111111111111',
    userId: users[0].id,
    sourceSessionClientGeneratedId: focusSessions[1].clientGeneratedId,
    spAmount: 50,
    treeCount: 1,
    description: 'Completed focus reward',
  },
  {
    id: '82222222-2222-4222-8222-222222222221',
    userId: users[1].id,
    sourceSessionClientGeneratedId: focusSessions[2].clientGeneratedId,
    spAmount: 50,
    treeCount: 1,
    description: 'Completed focus reward',
  },
] as const;

const dailyFocusStats = [
  {
    id: '91111111-1111-4111-8111-111111111111',
    userId: users[0].id,
    statDate: new Date('2026-03-11'),
    focusedSeconds: 1500,
    completedSessions: 1,
    plantedTrees: 1,
  },
  {
    id: '91111111-1111-4111-8111-111111111112',
    userId: users[0].id,
    statDate: new Date('2026-03-12'),
    focusedSeconds: 0,
    completedSessions: 0,
    plantedTrees: 0,
  },
  {
    id: '92222222-2222-4222-8222-222222222221',
    userId: users[1].id,
    statDate: new Date('2026-03-10'),
    focusedSeconds: 1500,
    completedSessions: 1,
    plantedTrees: 1,
  },
] as const;

const progressSnapshots = [
  {
    id: 'a1111111-1111-4111-8111-111111111111',
    userId: users[0].id,
    totalSp: 50,
    currentLevel: 1,
    totalCompletedSessions: 1,
  },
  {
    id: 'a2222222-2222-4222-8222-222222222222',
    userId: users[1].id,
    totalSp: 50,
    currentLevel: 1,
    totalCompletedSessions: 1,
  },
] as const;

const metricEvents = [
  {
    eventId: 'b1111111-1111-4111-8111-111111111111',
    userId: users[0].id,
    focusSessionClientGeneratedId: focusSessions[1].clientGeneratedId,
    rewardLedgerSeedId: rewardLedgers[0].id,
    deviceId: 'seed-device-user-1',
    eventName: MetricEventName.FOCUS_SESSION_COMPLETED,
    dedupeKey: 'focus-session-completed-user-1',
    occurredAt: new Date('2026-03-11T01:25:05.000Z'),
    payload: { source: 'seed' },
  },
  {
    eventId: 'b2222222-2222-4222-8222-222222222222',
    userId: null,
    focusSessionClientGeneratedId: null,
    rewardLedgerSeedId: null,
    deviceId: 'seed-device-anon',
    eventName: MetricEventName.APP_FIRST_OPEN,
    dedupeKey: 'app-first-open-seed-device',
    occurredAt: new Date('2026-03-13T00:00:00.000Z'),
    payload: { source: 'seed' },
  },
] as const;

const syncCursors = [
  {
    id: 'c1111111-1111-4111-8111-111111111111',
    userId: users[0].id,
    deviceId: 'seed-device-user-1',
    lastCursor: 'cursor-user-1',
  },
  {
    id: 'c2222222-2222-4222-8222-222222222222',
    userId: users[1].id,
    deviceId: 'seed-device-user-2',
    lastCursor: 'cursor-user-2',
  },
] as const;

function stripId<T extends { id: string }>(record: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = record;
  return rest;
}

async function upsertTaskByClientGeneratedId(task: (typeof tasks)[number]) {
  const existing = await prisma.task.findFirst({
    where: { clientGeneratedId: task.clientGeneratedId },
    select: { id: true },
  });

  if (existing) {
    return prisma.task.update({
      where: { id: existing.id },
      data: stripId(task),
    });
  }

  return prisma.task.create({ data: task });
}

async function upsertFocusSessionByClientGeneratedId(
  session: Omit<(typeof focusSessions)[number], 'taskClientGeneratedId'> & {
    taskId: string;
  },
) {
  const existing = await prisma.focusSession.findFirst({
    where: { clientGeneratedId: session.clientGeneratedId },
    select: { id: true },
  });

  if (existing) {
    return prisma.focusSession.update({
      where: { id: existing.id },
      data: stripId(session),
    });
  }

  return prisma.focusSession.create({ data: session });
}

async function main() {
  const taskIdByClientGeneratedId = new Map<string, string>();
  const focusSessionIdByClientGeneratedId = new Map<string, string>();
  const rewardLedgerIdBySeedId = new Map<string, string>();

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }

  for (const setting of settings) {
    await prisma.userSetting.upsert({
      where: { userId: setting.userId },
      update: setting,
      create: setting,
    });
  }

  for (const task of tasks) {
    const persistedTask = await upsertTaskByClientGeneratedId(task);
    taskIdByClientGeneratedId.set(task.clientGeneratedId, persistedTask.id);
  }

  for (const session of focusSessions) {
    const taskId = taskIdByClientGeneratedId.get(session.taskClientGeneratedId);
    if (!taskId) {
      throw new Error(`Missing task mapping for ${session.taskClientGeneratedId}`);
    }

    const { taskClientGeneratedId: _taskClientGeneratedId, ...sessionWithoutTaskRef } = session;
    const persistedSession = await upsertFocusSessionByClientGeneratedId({
      ...sessionWithoutTaskRef,
      taskId,
    });
    focusSessionIdByClientGeneratedId.set(
      session.clientGeneratedId,
      persistedSession.id,
    );
  }

  for (const reward of rewardLedgers) {
    const sourceSessionId = focusSessionIdByClientGeneratedId.get(
      reward.sourceSessionClientGeneratedId,
    );
    if (!sourceSessionId) {
      throw new Error(
        `Missing focus session mapping for ${reward.sourceSessionClientGeneratedId}`,
      );
    }

    const { sourceSessionClientGeneratedId: _sourceSessionClientGeneratedId, ...rewardWithoutSessionRef } = reward;
    const persistedReward = await prisma.rewardLedger.upsert({
      where: { sourceSessionId },
      update: {
        ...rewardWithoutSessionRef,
        sourceSessionId,
      },
      create: {
        ...rewardWithoutSessionRef,
        sourceSessionId,
      },
    });
    rewardLedgerIdBySeedId.set(reward.id, persistedReward.id);
  }

  for (const snapshot of progressSnapshots) {
    await prisma.userProgressSnapshot.upsert({
      where: { userId: snapshot.userId },
      update: snapshot,
      create: snapshot,
    });
  }

  for (const stat of dailyFocusStats) {
    await prisma.dailyFocusStat.upsert({
      where: {
        userId_statDate: {
          userId: stat.userId,
          statDate: stat.statDate,
        },
      },
      update: stat,
      create: stat,
    });
  }

  for (const metric of metricEvents) {
    const focusSessionId = metric.focusSessionClientGeneratedId
      ? focusSessionIdByClientGeneratedId.get(metric.focusSessionClientGeneratedId) ?? null
      : null;
    const rewardLedgerId = metric.rewardLedgerSeedId
      ? rewardLedgerIdBySeedId.get(metric.rewardLedgerSeedId) ?? null
      : null;
    const { focusSessionClientGeneratedId: _focusSessionClientGeneratedId, rewardLedgerSeedId: _rewardLedgerSeedId, ...metricWithoutRefs } = metric;

    await prisma.productMetricEvent.upsert({
      where: { eventId: metric.eventId },
      update: {
        ...metricWithoutRefs,
        focusSessionId,
        rewardLedgerId,
      },
      create: {
        ...metricWithoutRefs,
        focusSessionId,
        rewardLedgerId,
      },
    });
  }

  for (const cursor of syncCursors) {
    await prisma.syncCursor.upsert({
      where: {
        userId_deviceId: {
          userId: cursor.userId,
          deviceId: cursor.deviceId,
        },
      },
      update: cursor,
      create: cursor,
    });
  }
}

main()
  .catch(async (error) => {
    console.error('Prisma seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
