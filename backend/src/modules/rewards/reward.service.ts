import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type DailyFocusStat,
  type UserProgressSnapshot,
} from '@prisma/client';
import { RewardRepository } from './reward.repository';

const AWARDED_SP = 100;
const AWARDED_TREES = 1;
const DEFAULT_TIMEZONE = 'Asia/Seoul';
const SP_PER_LEVEL = 1000;

export type CompletionRewardSummary = {
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
};

@Injectable()
export class RewardService {
  constructor(private readonly rewardRepository: RewardRepository) {}

  async settleCompletion(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      sessionId: string;
      occurredAt: Date;
      focusedSeconds: number;
    },
  ): Promise<CompletionRewardSummary> {
    const timezoneRecord = await this.rewardRepository.findTimezone(
      tx,
      input.userId,
    );
    const statDate = this.toStatDate(
      input.occurredAt,
      timezoneRecord?.timezone ?? DEFAULT_TIMEZONE,
    );

    await this.rewardRepository.createRewardLedger(tx, {
      userId: input.userId,
      sourceSessionId: input.sessionId,
      spAmount: AWARDED_SP,
      treeCount: AWARDED_TREES,
      description: 'Focus session completion reward.',
    });

    const dailyStat = await this.rewardRepository.upsertDailyFocusStat(tx, {
      userId: input.userId,
      statDate,
      focusedSeconds: input.focusedSeconds,
      completedSessions: 1,
      plantedTrees: AWARDED_TREES,
    });

    const existingSnapshot = await this.rewardRepository.findProgressSnapshot(
      tx,
      input.userId,
    );
    const totalSp = (existingSnapshot?.totalSp ?? 0) + AWARDED_SP;
    const totalCompletedSessions =
      (existingSnapshot?.totalCompletedSessions ?? 0) + 1;
    const currentLevel = this.calculateLevel(totalSp);
    const progressSnapshot = existingSnapshot
      ? await this.rewardRepository.updateProgressSnapshot(tx, {
          userId: input.userId,
          totalSp,
          currentLevel,
          totalCompletedSessions,
        })
      : await this.rewardRepository.createProgressSnapshot(tx, {
          userId: input.userId,
          totalSp,
          currentLevel,
          totalCompletedSessions,
        });

    return {
      reward: {
        awardedSp: AWARDED_SP,
        awardedTrees: AWARDED_TREES,
        totalSp,
        level: currentLevel,
      },
      dailyStat: this.toDailyStatPayload(dailyStat),
      progressSnapshot: this.toProgressPayload(progressSnapshot),
    };
  }

  async getCompletedSessionCount(userId: string): Promise<number> {
    return this.rewardRepository.getCompletedSessionCount(userId);
  }

  calculateLevel(totalSp: number): number {
    return Math.floor(totalSp / SP_PER_LEVEL) + 1;
  }

  private toStatDate(occurredAt: Date, timezone: string): Date {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(occurredAt);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new Error('Failed to resolve DailyFocusStat date.');
    }

    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  }

  private toDailyStatPayload(dailyStat: DailyFocusStat) {
    return {
      statDate: dailyStat.statDate.toISOString().slice(0, 10),
      focusedSeconds: dailyStat.focusedSeconds,
      completedSessions: dailyStat.completedSessions,
      plantedTrees: dailyStat.plantedTrees,
    };
  }

  private toProgressPayload(progressSnapshot: UserProgressSnapshot) {
    return {
      totalSp: progressSnapshot.totalSp,
      currentLevel: progressSnapshot.currentLevel,
      totalCompletedSessions: progressSnapshot.totalCompletedSessions,
    };
  }
}
