import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type DailyFocusStat,
  type RewardLedger,
  type UserProgressSnapshot,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class RewardRepository {
  constructor(private readonly prismaService: PrismaService) {}

  get prisma() {
    return this.prismaService;
  }

  findTimezoneDirect(userId: string) {
    return this.findTimezone(this.prismaService, userId);
  }

  findTimezone(
    client: DbClient,
    userId: string,
  ): Promise<{ timezone: string } | null> {
    return client.userSetting.findUnique({
      where: {
        userId,
      },
      select: {
        timezone: true,
      },
    });
  }

  createRewardLedger(
    client: DbClient,
    input: {
      userId: string;
      sourceSessionId: string;
      spAmount: number;
      treeCount: number;
      description: string;
    },
  ): Promise<RewardLedger> {
    return client.rewardLedger.create({
      data: {
        userId: input.userId,
        sourceSessionId: input.sourceSessionId,
        spAmount: input.spAmount,
        treeCount: input.treeCount,
        description: input.description,
      },
    });
  }

  upsertDailyFocusStat(
    client: DbClient,
    input: {
      userId: string;
      statDate: Date;
      focusedSeconds: number;
      completedSessions: number;
      plantedTrees: number;
    },
  ): Promise<DailyFocusStat> {
    return client.dailyFocusStat.upsert({
      where: {
        userId_statDate: {
          userId: input.userId,
          statDate: input.statDate,
        },
      },
      create: {
        userId: input.userId,
        statDate: input.statDate,
        focusedSeconds: input.focusedSeconds,
        completedSessions: input.completedSessions,
        plantedTrees: input.plantedTrees,
      },
      update: {
        focusedSeconds: {
          increment: input.focusedSeconds,
        },
        completedSessions: {
          increment: input.completedSessions,
        },
        plantedTrees: {
          increment: input.plantedTrees,
        },
      },
    });
  }

  findProgressSnapshot(
    client: DbClient,
    userId: string,
  ): Promise<UserProgressSnapshot | null> {
    return client.userProgressSnapshot.findUnique({
      where: {
        userId,
      },
    });
  }

  createProgressSnapshot(
    client: DbClient,
    input: {
      userId: string;
      totalSp: number;
      currentLevel: number;
      totalCompletedSessions: number;
    },
  ): Promise<UserProgressSnapshot> {
    return client.userProgressSnapshot.create({
      data: input,
    });
  }

  updateProgressSnapshot(
    client: DbClient,
    input: {
      userId: string;
      totalSp: number;
      currentLevel: number;
      totalCompletedSessions: number;
    },
  ): Promise<UserProgressSnapshot> {
    return client.userProgressSnapshot.update({
      where: {
        userId: input.userId,
      },
      data: {
        totalSp: input.totalSp,
        currentLevel: input.currentLevel,
        totalCompletedSessions: input.totalCompletedSessions,
      },
    });
  }

  async getCompletedSessionCount(userId: string): Promise<number> {
    const snapshot = await this.prismaService.userProgressSnapshot.findUnique({
      where: {
        userId,
      },
      select: {
        totalCompletedSessions: true,
      },
    });

    return snapshot?.totalCompletedSessions ?? 0;
  }

  async findProgressSnapshotOnly(userId: string) {
    return this.prismaService.userProgressSnapshot.findUnique({
      where: { userId },
    });
  }

  async findDailyFocusStat(userId: string, statDate: Date) {
    return this.prismaService.dailyFocusStat.findUnique({
      where: {
        userId_statDate: {
          userId,
          statDate,
        },
      },
    });
  }

  async findRewardLedger(
    userId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<RewardLedger[]> {
    return this.prismaService.rewardLedger.findMany({
      where: { userId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }
}
