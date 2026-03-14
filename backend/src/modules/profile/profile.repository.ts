import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProfileRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findProfile(userId: string) {
    return this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        version: true,
        updatedAt: true,
      },
    });
  }

  async updateProfile(userId: string, version: number, data: { displayName?: string, avatarUrl?: string }) {
    return this.prismaService.user.update({
      where: { id: userId, version },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  }

  async findSettings(userId: string) {
    return this.prismaService.userSetting.findUnique({
      where: { userId },
    });
  }

  async updateSettings(userId: string, version: number, data: { theme?: any, timezone?: string, syncEnabled?: boolean }) {
    return this.prismaService.userSetting.update({
      where: { userId, version },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  }
}
