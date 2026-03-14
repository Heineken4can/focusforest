import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma, SessionStatus, SyncCursor } from '@prisma/client';

export const ACTIVE_SYNC_SESSION_STATUSES: SessionStatus[] = [
  SessionStatus.RUNNING,
  SessionStatus.PAUSED,
  SessionStatus.BREAK_RUNNING,
];

export type SyncCursorData = {
  updatedAt: Date;
  id: string;
};

export type SyncSnapshot = {
  tasks: any[];
  activeSession: any | null;
  dashboardSummary: any;
  rewardSnapshot: any;
  profile: any;
  setting: any;
  syncState: {
    lastCursor: string;
    updatedAt: string;
  };
};

@Injectable()
export class SyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCursor(userId: string, deviceId: string): Promise<SyncCursor | null> {
    return this.prisma.syncCursor.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
    });
  }

  async upsertCursor(
    userId: string,
    deviceId: string,
    lastCursor: string,
  ): Promise<SyncCursor> {
    return this.prisma.syncCursor.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
      create: {
        userId,
        deviceId,
        lastCursor,
      },
      update: {
        lastCursor,
      },
    });
  }

  async getLatestSnapshot(userId: string): Promise<SyncSnapshot> {
    const [tasks, activeSession, progress, user] = await Promise.all([
      this.prisma.task.findMany({
        where: { userId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      this.prisma.focusSession.findFirst({
        where: {
          userId,
          status: {
            in: ACTIVE_SYNC_SESSION_STATUSES,
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.userProgressSnapshot.findUnique({
        where: { userId },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { settings: true },
      }),
    ]);

    // Simplified summary for now
    const dashboardSummary = {
      todayFocusedSeconds: 0,
      todayCompletedSessions: 0,
    };

    return {
      tasks: tasks.map((t) => ({
        id: t.id,
        clientGeneratedId: t.clientGeneratedId,
        title: t.title,
        description: t.description,
        status: t.status,
        isCore: t.isCore,
        version: t.version,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      activeSession: activeSession
        ? {
            focusSessionId: activeSession.id,
            taskId: activeSession.taskId,
            status: activeSession.status,
            startedAt: activeSession.startedAt.toISOString(),
            plannedFocusSec: activeSession.plannedFocusSec,
            pauseCount: activeSession.pauseCount,
            version: activeSession.version,
            updatedAt: activeSession.updatedAt.toISOString(),
          }
        : null,
      dashboardSummary,
      rewardSnapshot: progress
        ? {
            totalSp: progress.totalSp,
            level: progress.currentLevel,
            totalCompletedSessions: progress.totalCompletedSessions,
          }
        : { totalSp: 0, level: 1, totalCompletedSessions: 0 },
      profile: {
        userId: user?.id,
        displayName: user?.displayName,
        avatarUrl: user?.avatarUrl,
        version: user?.version,
      },
      setting: user?.settings
        ? {
            theme: user.settings.theme,
            timezone: user.settings.timezone,
            syncEnabled: user.settings.syncEnabled,
            version: user.settings.version,
          }
        : null,
      syncState: {
        lastCursor: '', // Will be filled by service
        updatedAt: new Date().toISOString(),
      },
    };
  }
}
