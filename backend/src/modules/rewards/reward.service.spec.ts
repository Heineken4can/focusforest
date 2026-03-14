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

  describe('toStatDate', () => {
    it('calculates statDate correctly for Asia/Seoul (UTC+9)', () => {
      // 2026-03-14 01:00 UTC is 2026-03-14 10:00 KST
      const date = new Date('2026-03-14T01:00:00Z');
      const statDate = service['toStatDate'](date, 'Asia/Seoul');
      expect(statDate.toISOString()).toBe('2026-03-14T00:00:00.000Z');
    });

    it('calculates statDate correctly for America/New_York (UTC-5/EDT)', () => {
      // 2026-03-14 01:00 UTC is 2026-03-13 20:00 EST/EDT
      const date = new Date('2026-03-14T01:00:00Z');
      const statDate = service['toStatDate'](date, 'America/New_York');
      expect(statDate.toISOString()).toBe('2026-03-13T00:00:00.000Z');
    });

    it('handles day transition correctly for Asia/Seoul', () => {
      // 2026-03-13 23:00 UTC is 2026-03-14 08:00 KST
      const date = new Date('2026-03-13T23:00:00Z');
      const statDate = service['toStatDate'](date, 'Asia/Seoul');
      expect(statDate.toISOString()).toBe('2026-03-14T00:00:00.000Z');
    });
  });

  describe('calculateLevel', () => {
    it('calculates level 1 for 0-999 SP', () => {
      expect(service.calculateLevel(0)).toBe(1);
      expect(service.calculateLevel(999)).toBe(1);
    });

    it('calculates level 2 for 1000-1999 SP', () => {
      expect(service.calculateLevel(1000)).toBe(2);
      expect(service.calculateLevel(1999)).toBe(2);
    });
  });
});
