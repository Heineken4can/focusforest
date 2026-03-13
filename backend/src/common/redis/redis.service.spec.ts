import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('RedisService', () => {
  const onMock = jest.fn();
  const offMock = jest.fn();
  const pingMock = jest.fn();
  const connectMock = jest.fn();
  const disconnectMock = jest.fn();
  const quitMock = jest.fn();
  const configServiceMock = {
    getOrThrow: jest.fn(),
  };
  let statusValue = 'wait';

  const redisClientMock = {
    get status() {
      return statusValue;
    },
    ping: pingMock,
    connect: connectMock,
    disconnect: disconnectMock,
    quit: quitMock,
    on: onMock,
    off: offMock,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    statusValue = 'wait';
    configServiceMock.getOrThrow.mockReturnValue('redis://localhost:6379');
    pingMock.mockResolvedValue('PONG');
    connectMock.mockImplementation(() => {
      statusValue = 'ready';
      return Promise.resolve();
    });
    quitMock.mockResolvedValue(undefined);
    onMock.mockImplementation((event: string, handler: () => void) => {
      if (event === 'ready' && statusValue === 'connecting') {
        setImmediate(() => {
          statusValue = 'ready';
          handler();
        });
      }

      return redisClientMock;
    });
    offMock.mockReturnValue(redisClientMock);
    const redisConstructor = Redis as unknown as jest.Mock;
    redisConstructor.mockImplementation(() => redisClientMock);
  });

  it('connects lazy clients before returning a ready client', async () => {
    const service = new RedisService(
      configServiceMock as unknown as ConfigService,
    );

    const client = await service.getReadyClient();

    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(client).toBe(redisClientMock);
  });

  it('waits for the ready event while the client is connecting', async () => {
    statusValue = 'connecting';
    connectMock.mockImplementation(() => Promise.resolve(undefined));
    const service = new RedisService(
      configServiceMock as unknown as ConfigService,
    );

    const client = await service.getReadyClient();

    expect(connectMock).not.toHaveBeenCalled();
    expect(onMock).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(client).toBe(redisClientMock);
  });

  it('uses the ready client when pinging', async () => {
    const service = new RedisService(
      configServiceMock as unknown as ConfigService,
    );

    await expect(service.ping()).resolves.toBe('PONG');
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(pingMock).toHaveBeenCalledTimes(1);
  });
});
