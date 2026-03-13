import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthPasswordService } from './auth-password.service';
import { AuthRepository } from './auth.repository';
import { AuthTokenService } from './auth-token.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

export type AuthSessionResult = {
  data: {
    user: {
      id: string;
      email: string;
      displayName: string;
      timezone: string;
      createdAt?: string;
    };
    accessToken: string;
    accessTokenExpiresAt: string;
    bootstrapRequired?: boolean;
  };
  refreshToken: string;
  csrfToken: string;
  refreshTokenMaxAgeMs: number;
};

export type RefreshSessionResult = {
  data: {
    accessToken: string;
    accessTokenExpiresAt: string;
  };
  refreshToken: string;
  csrfToken: string;
  refreshTokenMaxAgeMs: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authPasswordService: AuthPasswordService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async signup(
    dto: SignupDto,
    deviceInfo?: string,
  ): Promise<AuthSessionResult> {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.authRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException({
        message: 'Email is already registered.',
        code: 'AUTH_409_EMAIL_ALREADY_EXISTS',
        data: {
          field: 'email',
        },
      });
    }

    const passwordHash = await this.authPasswordService.hash(dto.password);
    const user = await this.authRepository.createUser({
      email,
      passwordHash,
      displayName: dto.displayName.trim(),
      timezone: dto.timezone?.trim() || 'Asia/Seoul',
    });

    const accessToken = this.authTokenService.issueAccessToken(
      user.id,
      user.email,
    );
    const refreshToken = this.authTokenService.issueRefreshToken(user.id);
    const csrfToken = this.authTokenService.createCsrfToken();
    await this.storeRefreshToken(user.id, refreshToken.token, deviceInfo);

    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          timezone: this.authRepository.resolveTimezone(user.settings),
          createdAt: user.createdAt.toISOString(),
        },
        accessToken: accessToken.token,
        accessTokenExpiresAt: accessToken.expiresAt,
      },
      refreshToken: refreshToken.token,
      csrfToken,
      refreshTokenMaxAgeMs: this.authTokenService.getRefreshTokenMaxAgeMs(),
    };
  }

  async login(dto: LoginDto, deviceInfo?: string): Promise<AuthSessionResult> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.authRepository.findByEmail(email);

    if (!user) {
      throw this.invalidCredentials();
    }

    const isValidPassword = await this.authPasswordService.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isValidPassword) {
      throw this.invalidCredentials();
    }

    const accessToken = this.authTokenService.issueAccessToken(
      user.id,
      user.email,
    );
    const refreshToken = this.authTokenService.issueRefreshToken(user.id);
    const csrfToken = this.authTokenService.createCsrfToken();
    await this.storeRefreshToken(user.id, refreshToken.token, deviceInfo);

    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          timezone: this.authRepository.resolveTimezone(user.settings),
        },
        accessToken: accessToken.token,
        accessTokenExpiresAt: accessToken.expiresAt,
        bootstrapRequired: true,
      },
      refreshToken: refreshToken.token,
      csrfToken,
      refreshTokenMaxAgeMs: this.authTokenService.getRefreshTokenMaxAgeMs(),
    };
  }

  async refresh(input: {
    refreshToken?: string;
    csrfToken?: string;
    csrfHeader?: string;
    deviceInfo?: string;
  }): Promise<RefreshSessionResult> {
    this.assertValidCsrf(input.csrfToken, input.csrfHeader);

    if (!input.refreshToken) {
      throw this.invalidRefreshToken();
    }

    const refreshPayload = this.authTokenService.verifyRefreshToken(
      input.refreshToken,
    );

    if (!refreshPayload) {
      throw this.invalidRefreshToken();
    }

    const tokenHash = this.authTokenService.hashRefreshToken(
      input.refreshToken,
    );
    const storedRefreshToken =
      await this.authRepository.findActiveRefreshTokenByHash(tokenHash);

    if (
      !storedRefreshToken ||
      storedRefreshToken.userId !== refreshPayload.userId ||
      storedRefreshToken.expiresAt.getTime() <= Date.now()
    ) {
      throw this.invalidRefreshToken();
    }

    const user = await this.authRepository.findById(refreshPayload.userId);

    if (!user) {
      throw this.invalidRefreshToken();
    }

    const accessToken = this.authTokenService.issueAccessToken(
      user.id,
      user.email,
    );
    const nextRefreshToken = this.authTokenService.issueRefreshToken(user.id);
    const csrfToken = this.authTokenService.createCsrfToken();
    const rotated = await this.authRepository.rotateRefreshToken({
      currentTokenId: storedRefreshToken.id,
      userId: user.id,
      newTokenHash: this.authTokenService.hashRefreshToken(
        nextRefreshToken.token,
      ),
      newExpiresAt: new Date(nextRefreshToken.expiresAt),
      deviceInfo: input.deviceInfo,
    });

    if (!rotated) {
      throw this.invalidRefreshToken();
    }

    return {
      data: {
        accessToken: accessToken.token,
        accessTokenExpiresAt: accessToken.expiresAt,
      },
      refreshToken: nextRefreshToken.token,
      csrfToken,
      refreshTokenMaxAgeMs: this.authTokenService.getRefreshTokenMaxAgeMs(),
    };
  }

  async logout(input: {
    userId?: string;
    refreshToken?: string;
    csrfToken?: string;
    csrfHeader?: string;
  }): Promise<{ revoked: true }> {
    if (!input.userId) {
      throw this.unauthorized();
    }

    this.assertValidCsrf(input.csrfToken, input.csrfHeader);

    const refreshToken = input.refreshToken?.trim();

    if (!refreshToken) {
      throw this.invalidRefreshToken();
    }

    const refreshPayload =
      this.authTokenService.verifyRefreshToken(refreshToken);

    if (!refreshPayload || refreshPayload.userId !== input.userId) {
      throw this.invalidRefreshToken();
    }

    const storedRefreshToken =
      await this.authRepository.findActiveRefreshTokenByHash(
        this.authTokenService.hashRefreshToken(refreshToken),
      );

    if (!storedRefreshToken || storedRefreshToken.userId !== input.userId) {
      throw this.invalidRefreshToken();
    }

    const revoked = await this.authRepository.revokeRefreshToken(
      storedRefreshToken.id,
    );

    if (!revoked) {
      throw this.invalidRefreshToken();
    }

    return { revoked: true };
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      message: 'Invalid email or password.',
      code: 'AUTH_401_UNAUTHORIZED',
      data: null,
    });
  }

  private invalidRefreshToken(): UnauthorizedException {
    return new UnauthorizedException({
      message: 'Refresh token is invalid or revoked.',
      code: 'AUTH_401_REFRESH_REVOKED',
      data: null,
    });
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      message: 'Authentication required.',
      code: 'AUTH_401_UNAUTHORIZED',
      data: null,
    });
  }

  private assertValidCsrf(csrfToken?: string, csrfHeader?: string): void {
    if (!csrfToken || !csrfHeader || csrfToken !== csrfHeader) {
      throw new ForbiddenException({
        message: 'CSRF token is invalid.',
        code: 'AUTH_403_CSRF_INVALID',
        data: null,
      });
    }
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
    deviceInfo?: string,
  ): Promise<void> {
    await this.authRepository.storeRefreshToken({
      userId,
      tokenHash: this.authTokenService.hashRefreshToken(refreshToken),
      expiresAt: new Date(
        Date.now() + this.authTokenService.getRefreshTokenMaxAgeMs(),
      ),
      deviceInfo,
    });
  }
}
