import { Injectable } from '@nestjs/common';
import { Prisma, RefreshToken, UserSetting } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

type AuthUserRecord = Prisma.UserGetPayload<{
  include: {
    settings: true;
  };
}>;

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.prismaService.user.findUnique({
      where: {
        email,
      },
      include: {
        settings: true,
      },
    });
  }

  findById(userId: string): Promise<AuthUserRecord | null> {
    return this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        settings: true,
      },
    });
  }

  createUser(input: {
    email: string;
    passwordHash: string;
    displayName: string;
    timezone: string;
  }): Promise<AuthUserRecord> {
    return this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          displayName: input.displayName,
        },
      });

      const settings = await tx.userSetting.create({
        data: {
          userId: user.id,
          timezone: input.timezone,
        },
      });

      return {
        ...user,
        settings,
      } satisfies AuthUserRecord;
    });
  }

  async storeRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    deviceInfo?: string;
  }): Promise<void> {
    await this.prismaService.refreshToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        deviceInfo: input.deviceInfo,
      },
    });
  }

  findActiveRefreshTokenByHash(
    tokenHash: string,
  ): Promise<RefreshToken | null> {
    return this.prismaService.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async rotateRefreshToken(input: {
    currentTokenId: string;
    userId: string;
    newTokenHash: string;
    newExpiresAt: Date;
    deviceInfo?: string;
  }): Promise<boolean> {
    return this.prismaService.$transaction(async (tx) => {
      const updateResult = await tx.refreshToken.updateMany({
        where: {
          id: input.currentTokenId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      if (updateResult.count !== 1) {
        return false;
      }

      await tx.refreshToken.create({
        data: {
          userId: input.userId,
          tokenHash: input.newTokenHash,
          expiresAt: input.newExpiresAt,
          deviceInfo: input.deviceInfo,
        },
      });

      return true;
    });
  }

  async revokeRefreshToken(tokenId: string): Promise<boolean> {
    const updateResult = await this.prismaService.refreshToken.updateMany({
      where: {
        id: tokenId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return updateResult.count === 1;
  }

  resolveTimezone(settings: UserSetting | null | undefined): string {
    return settings?.timezone ?? 'Asia/Seoul';
  }
}
