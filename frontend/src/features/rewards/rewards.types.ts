export type RewardStats = {
  totalSp: number;
  level: number;
  totalCompletedSessions: number;
};

export type RewardLedgerEntry = {
  id: string;
  focusSessionId: string;
  awardedSp: number;
  awardedTrees: number;
  occurredAt: string;
};

export type GetRewardStatsResponse = {
  stats: RewardStats;
};

export type GetRewardLedgerResponse = {
  items: RewardLedgerEntry[];
  nextCursor?: string;
};
