import { RewardService } from './reward.service';
import { RewardRepository } from './reward.repository';

describe('RewardService', () => {
  let service: RewardService;
  let repository: jest.Mocked<RewardRepository>;

  beforeEach(() => {
    repository = {
      findTimezone: jest.fn(),
      createRewardLedger: jest.fn(),
      upsertDailyFocusStat: jest.fn(),
      findProgressSnapshot: jest.fn(),
      createProgressSnapshot: jest.fn(),
      updateProgressSnapshot: jest.fn(),
      getCompletedSessionCount: jest.fn(),
    } as unknown as jest.Mocked<RewardRepository>;
    service = new RewardService(repository);
  });

  it('settles a completion reward and levels up based on total SP', async () => {
    repository.findTimezone.mockResolvedValue({ timezone: 'Asia/Seoul' });
    repository.createRewardLedger.mockResolvedValue({} as never);
    repository.upsertDailyFocusStat.mockResolvedValue({
      statDate: new Date('2026-03-13T00:00:00.000Z'),
      focusedSeconds: 1500,
      completedSessions: 1,
      plantedTrees: 1,
    } as never);
    repository.findProgressSnapshot.mockResolvedValue({
      totalSp: 950,
      totalCompletedSessions: 9,
    } as never);
    repository.updateProgressSnapshot.mockResolvedValue({
      totalSp: 1050,
      currentLevel: 2,
      totalCompletedSessions: 10,
    } as never);

    const result = await service.settleCompletion({} as never, {
      userId: 'user-1',
      sessionId: 'session-1',
      occurredAt: new Date('2026-03-13T09:00:00.000Z'),
      focusedSeconds: 1500,
    });

    expect(result.reward).toEqual({
      awardedSp: 100,
      awardedTrees: 1,
      totalSp: 1050,
      level: 2,
    });
    expect(result.progressSnapshot.totalCompletedSessions).toBe(10);
  });
});
