import { createHash, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';

export type TokenPair = {
  token: string;
  expiresAt: string;
};

type VerifiedTokenPayload = {
  userId: string;
  email?: string;
};

@Injectable()
export class AuthTokenService {
  constructor(private readonly configService: ConfigService) {}

  issueAccessToken(userId: string, email: string): TokenPair {
    return this.signToken(
      {
        sub: userId,
        email,
        type: 'access',
      },
      this.configService.getOrThrow<string>('auth.accessSecret'),
      this.configService.getOrThrow<string>('auth.accessTokenTtl'),
    );
  }

  issueRefreshToken(userId: string): TokenPair {
    return this.signToken(
      {
        sub: userId,
        type: 'refresh',
        jti: randomUUID(),
      },
      this.configService.getOrThrow<string>('auth.refreshSecret'),
      this.configService.getOrThrow<string>('auth.refreshTokenTtl'),
    );
  }

  createCsrfToken(): string {
    return randomUUID();
  }

  getRefreshTokenMaxAgeMs(): number {
    return this.parseDurationToMs(
      this.configService.getOrThrow<string>('auth.refreshTokenTtl'),
    );
  }

  verifyAccessToken(token: string): VerifiedTokenPayload | null {
    return this.verifyToken(
      token,
      this.configService.getOrThrow<string>('auth.accessSecret'),
      'access',
    );
  }

  verifyRefreshToken(token: string): VerifiedTokenPayload | null {
    return this.verifyToken(
      token,
      this.configService.getOrThrow<string>('auth.refreshSecret'),
      'refresh',
    );
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private signToken(
    payload: Record<string, string>,
    secret: string,
    expiresIn: string,
  ): TokenPair {
    const token = jwt.sign(
      payload,
      secret as Secret,
      {
        expiresIn,
      } as SignOptions,
    );
    const decoded = jwt.decode(token) as JwtPayload | null;

    if (!decoded?.exp) {
      throw new Error('Failed to resolve token expiration.');
    }

    return {
      token,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
    };
  }

  private verifyToken(
    token: string,
    secret: string,
    expectedType: 'access' | 'refresh',
  ): VerifiedTokenPayload | null {
    try {
      const verified = jwt.verify(token, secret as Secret) as
        | string
        | (JwtPayload & { type?: unknown; email?: unknown });

      if (typeof verified === 'string') {
        return null;
      }

      const subject = verified.sub;
      const tokenType: unknown = verified.type;

      if (typeof subject !== 'string' || tokenType !== expectedType) {
        return null;
      }

      return {
        userId: subject,
        email: typeof verified.email === 'string' ? verified.email : undefined,
      };
    } catch {
      return null;
    }
  }

  private parseDurationToMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);

    if (!match) {
      throw new Error(`Unsupported duration format: ${duration}`);
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multiplier =
      unit === 's'
        ? 1000
        : unit === 'm'
          ? 60_000
          : unit === 'h'
            ? 3_600_000
            : 86_400_000;

    return value * multiplier;
  }
}
