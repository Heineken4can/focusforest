import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import { SessionIdempotencyService } from './session-idempotency.service';

describe('SessionIdempotencyService', () => {
  it('returns cached results for the same event and payload', async () => {
    const getMock = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        JSON.stringify({
          payloadHash:
            '48208f9428d64634bd8e28ff345bf0eab60d53c18fa2fbdb0b9bc1e84df2b5f6',
          result: { ok: true },
        }),
      );
    const setMock = jest
      .fn()
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK');
    const delMock = jest.fn().mockResolvedValue(1);
    const redisService = {
      getReadyClient: jest.fn().mockResolvedValue({
        get: getMock,
        set: setMock,
        del: delMock,
      }),
    } as unknown as RedisService;
    const configService = {
      get: jest.fn().mockReturnValue(60),
    } as unknown as ConfigService;
    const service = new SessionIdempotencyService(redisService, configService);

    const first = await service.execute({
      userId: 'user-1',
      sessionId: 'session-1',
      action: 'complete',
      eventId: 'event-1',
      payload: { value: 1 },
      handler: jest.fn().mockResolvedValue({ ok: true }),
    });
    const second = await service.execute({
      userId: 'user-1',
      sessionId: 'session-1',
      action: 'complete',
      eventId: 'event-1',
      payload: { value: 1 },
      handler: jest.fn().mockResolvedValue({ ok: false }),
    });

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
  });

  it('replays from in-memory fallback when redis result write fails', async () => {
    const getMock = jest.fn().mockResolvedValue(null);
    const setMock = jest
      .fn()
      .mockResolvedValueOnce('OK')
      .mockRejectedValueOnce(new Error('redis write failed'));
    const delMock = jest.fn().mockResolvedValue(1);
    const handler = jest.fn().mockResolvedValue({ ok: true });
    const redisService = {
      getReadyClient: jest.fn().mockResolvedValue({
        get: getMock,
        set: setMock,
        del: delMock,
      }),
    } as unknown as RedisService;
    const configService = {
      get: jest.fn().mockReturnValue(60),
    } as unknown as ConfigService;
    const service = new SessionIdempotencyService(redisService, configService);

    const first = await service.execute({
      userId: 'user-1',
      sessionId: 'session-1',
      action: 'complete',
      eventId: 'event-2',
      payload: { value: 2 },
      handler,
    });
    const second = await service.execute({
      userId: 'user-1',
      sessionId: 'session-1',
      action: 'complete',
      eventId: 'event-2',
      payload: { value: 2 },
      handler: jest.fn().mockResolvedValue({ ok: false }),
    });

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
