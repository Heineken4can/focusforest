import { AuthPasswordService } from './auth-password.service';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';

const authRepositoryMock = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  createUser: jest.fn(),
  storeRefreshToken: jest.fn(),
  findActiveRefreshTokenByHash: jest.fn(),
  rotateRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
  resolveTimezone: jest.fn(),
};

const authPasswordServiceMock = {
  hash: jest.fn(),
  verify: jest.fn(),
};

const authTokenServiceMock = {
  issueAccessToken: jest.fn(),
  issueRefreshToken: jest.fn(),
  createCsrfToken: jest.fn(),
  getRefreshTokenMaxAgeMs: jest.fn(),
  verifyAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  hashRefreshToken: jest.fn(),
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    authRepositoryMock.resolveTimezone.mockReturnValue('Asia/Seoul');
    authTokenServiceMock.issueAccessToken.mockReturnValue({
      token: 'access-token',
      expiresAt: '2026-03-12T15:00:00.000Z',
    });
    authTokenServiceMock.issueRefreshToken.mockReturnValue({
      token: 'refresh-token',
      expiresAt: '2026-04-11T15:00:00.000Z',
    });
    authTokenServiceMock.createCsrfToken.mockReturnValue('csrf-token');
    authTokenServiceMock.getRefreshTokenMaxAgeMs.mockReturnValue(1000);
    authTokenServiceMock.hashRefreshToken.mockReturnValue(
      'hashed-refresh-token',
    );
    authRepositoryMock.rotateRefreshToken.mockResolvedValue(true);
  });

  it('creates a user during signup and returns tokens', async () => {
    let storedRefreshTokenInput:
      | {
          userId: string;
          tokenHash: string;
          expiresAt: Date;
          deviceInfo?: string;
        }
      | undefined;

    authRepositoryMock.findByEmail.mockResolvedValue(null);
    authPasswordServiceMock.hash.mockResolvedValue('hashed-password');
    authRepositoryMock.createUser.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Focus User',
      passwordHash: 'hashed-password',
      avatarUrl: null,
      version: 1,
      createdAt: new Date('2026-03-12T14:00:00.000Z'),
      updatedAt: new Date('2026-03-12T14:00:00.000Z'),
      settings: {
        id: 'setting-1',
        userId: 'user-1',
        theme: 'SYSTEM',
        timezone: 'Asia/Seoul',
        syncEnabled: true,
        version: 1,
        createdAt: new Date('2026-03-12T14:00:00.000Z'),
        updatedAt: new Date('2026-03-12T14:00:00.000Z'),
      },
    });
    authRepositoryMock.storeRefreshToken.mockImplementation(
      (input: {
        userId: string;
        tokenHash: string;
        expiresAt: Date;
        deviceInfo?: string;
      }) => {
        storedRefreshTokenInput = input;
        return Promise.resolve();
      },
    );

    const service = new AuthService(
      authRepositoryMock as unknown as AuthRepository,
      authPasswordServiceMock as unknown as AuthPasswordService,
      authTokenServiceMock as unknown as AuthTokenService,
    );
    const result = await service.signup({
      email: 'User@example.com',
      password: 'password1234',
      displayName: 'Focus User',
      timezone: 'Asia/Seoul',
    });

    expect(authPasswordServiceMock.hash).toHaveBeenCalledWith('password1234');
    expect(authRepositoryMock.createUser).toHaveBeenCalledWith({
      email: 'user@example.com',
      passwordHash: 'hashed-password',
      displayName: 'Focus User',
      timezone: 'Asia/Seoul',
    });
    expect(storedRefreshTokenInput).toBeDefined();
    expect(storedRefreshTokenInput?.userId).toBe('user-1');
    expect(storedRefreshTokenInput?.tokenHash).toBe('hashed-refresh-token');
    expect(storedRefreshTokenInput?.expiresAt).toBeInstanceOf(Date);
    expect(storedRefreshTokenInput?.deviceInfo).toBeUndefined();
    expect(result.data.user.email).toBe('user@example.com');
    expect(result.data.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.csrfToken).toBe('csrf-token');
  });

  it('rejects login when password is invalid', async () => {
    authRepositoryMock.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Focus User',
      passwordHash: 'hashed-password',
      avatarUrl: null,
      version: 1,
      createdAt: new Date('2026-03-12T14:00:00.000Z'),
      updatedAt: new Date('2026-03-12T14:00:00.000Z'),
      settings: null,
    });
    authPasswordServiceMock.verify.mockResolvedValue(false);

    const service = new AuthService(
      authRepositoryMock as unknown as AuthRepository,
      authPasswordServiceMock as unknown as AuthPasswordService,
      authTokenServiceMock as unknown as AuthTokenService,
    );

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toMatchObject({
      status: 401,
    });
  });

  it('rotates refresh token and returns a new access token', async () => {
    let rotateRefreshTokenInput:
      | {
          currentTokenId: string;
          userId: string;
          newTokenHash: string;
          newExpiresAt: Date;
          deviceInfo?: string;
        }
      | undefined;

    authTokenServiceMock.verifyRefreshToken.mockReturnValue({
      userId: 'user-1',
    });
    authRepositoryMock.findActiveRefreshTokenByHash.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'hashed-refresh-token',
      deviceInfo: null,
      expiresAt: new Date('2026-04-11T15:00:00.000Z'),
      createdAt: new Date('2026-03-12T14:00:00.000Z'),
      revokedAt: null,
    });
    authRepositoryMock.findById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Focus User',
      passwordHash: 'hashed-password',
      avatarUrl: null,
      version: 1,
      createdAt: new Date('2026-03-12T14:00:00.000Z'),
      updatedAt: new Date('2026-03-12T14:00:00.000Z'),
      settings: null,
    });
    authRepositoryMock.rotateRefreshToken.mockImplementation(
      (input: {
        currentTokenId: string;
        userId: string;
        newTokenHash: string;
        newExpiresAt: Date;
        deviceInfo?: string;
      }) => {
        rotateRefreshTokenInput = input;
        return Promise.resolve(true);
      },
    );

    const service = new AuthService(
      authRepositoryMock as unknown as AuthRepository,
      authPasswordServiceMock as unknown as AuthPasswordService,
      authTokenServiceMock as unknown as AuthTokenService,
    );
    const result = await service.refresh({
      refreshToken: 'refresh-token',
      csrfToken: 'csrf-token',
      csrfHeader: 'csrf-token',
    });

    expect(rotateRefreshTokenInput).toBeDefined();
    expect(rotateRefreshTokenInput?.currentTokenId).toBe('token-1');
    expect(rotateRefreshTokenInput?.userId).toBe('user-1');
    expect(rotateRefreshTokenInput?.newTokenHash).toBe('hashed-refresh-token');
    expect(rotateRefreshTokenInput?.newExpiresAt).toBeInstanceOf(Date);
    expect(rotateRefreshTokenInput?.deviceInfo).toBeUndefined();
    expect(result.data.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });

  it('rejects refresh when csrf tokens do not match', async () => {
    const service = new AuthService(
      authRepositoryMock as unknown as AuthRepository,
      authPasswordServiceMock as unknown as AuthPasswordService,
      authTokenServiceMock as unknown as AuthTokenService,
    );

    await expect(
      service.refresh({
        refreshToken: 'refresh-token',
        csrfToken: 'cookie-token',
        csrfHeader: 'header-token',
      }),
    ).rejects.toMatchObject({
      status: 403,
    });
  });

  it('rejects refresh when the stored refresh token is not active', async () => {
    authTokenServiceMock.verifyRefreshToken.mockReturnValue({
      userId: 'user-1',
    });
    authRepositoryMock.findActiveRefreshTokenByHash.mockResolvedValue(null);
    const service = new AuthService(
      authRepositoryMock as unknown as AuthRepository,
      authPasswordServiceMock as unknown as AuthPasswordService,
      authTokenServiceMock as unknown as AuthTokenService,
    );

    await expect(
      service.refresh({
        refreshToken: 'refresh-token',
        csrfToken: 'csrf-token',
        csrfHeader: 'csrf-token',
      }),
    ).rejects.toMatchObject({
      status: 401,
      response: {
        code: 'AUTH_401_REFRESH_REVOKED',
      },
    });
  });

  it('revokes the current refresh token during logout', async () => {
    authTokenServiceMock.verifyRefreshToken.mockReturnValue({
      userId: 'user-1',
    });
    authRepositoryMock.findActiveRefreshTokenByHash.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'hashed-refresh-token',
      deviceInfo: null,
      expiresAt: new Date('2026-04-11T15:00:00.000Z'),
      createdAt: new Date('2026-03-12T14:00:00.000Z'),
      revokedAt: null,
    });
    authRepositoryMock.revokeRefreshToken.mockResolvedValue(true);

    const service = new AuthService(
      authRepositoryMock as unknown as AuthRepository,
      authPasswordServiceMock as unknown as AuthPasswordService,
      authTokenServiceMock as unknown as AuthTokenService,
    );
    const result = await service.logout({
      userId: 'user-1',
      refreshToken: 'refresh-token',
      csrfToken: 'csrf-token',
      csrfHeader: 'csrf-token',
    });

    expect(authRepositoryMock.revokeRefreshToken).toHaveBeenCalledWith(
      'token-1',
    );
    expect(result).toEqual({ revoked: true });
  });

  it('rejects logout without authenticated user context', async () => {
    const service = new AuthService(
      authRepositoryMock as unknown as AuthRepository,
      authPasswordServiceMock as unknown as AuthPasswordService,
      authTokenServiceMock as unknown as AuthTokenService,
    );

    await expect(
      service.logout({
        refreshToken: 'refresh-token',
        csrfToken: 'csrf-token',
        csrfHeader: 'csrf-token',
      }),
    ).rejects.toMatchObject({
      status: 401,
    });
  });

  it('rejects logout when refresh token is missing', async () => {
    const service = new AuthService(
      authRepositoryMock as unknown as AuthRepository,
      authPasswordServiceMock as unknown as AuthPasswordService,
      authTokenServiceMock as unknown as AuthTokenService,
    );

    await expect(
      service.logout({
        userId: 'user-1',
        csrfToken: 'csrf-token',
        csrfHeader: 'csrf-token',
      }),
    ).rejects.toMatchObject({
      status: 401,
      response: {
        code: 'AUTH_401_REFRESH_REVOKED',
      },
    });
  });

  it('rejects logout when refresh token belongs to another user', async () => {
    authTokenServiceMock.verifyRefreshToken.mockReturnValue({
      userId: 'other-user',
    });
    const service = new AuthService(
      authRepositoryMock as unknown as AuthRepository,
      authPasswordServiceMock as unknown as AuthPasswordService,
      authTokenServiceMock as unknown as AuthTokenService,
    );

    await expect(
      service.logout({
        userId: 'user-1',
        refreshToken: 'refresh-token',
        csrfToken: 'csrf-token',
        csrfHeader: 'csrf-token',
      }),
    ).rejects.toMatchObject({
      status: 401,
      response: {
        code: 'AUTH_401_REFRESH_REVOKED',
      },
    });
  });
});
