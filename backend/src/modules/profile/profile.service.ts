import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ProfileRepository } from './profile.repository';

@Injectable()
export class ProfileService {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async getProfile(userId: string) {
    const profile = await this.profileRepository.findProfile(userId);
    if (!profile) throw new NotFoundException('User profile not found.');
    return profile;
  }

  async updateProfile(userId: string, version: number, data: { displayName?: string, avatarUrl?: string }) {
    try {
      return await this.profileRepository.updateProfile(userId, version, data);
    } catch (error: any) {
      if (error.code === 'P2025') {
        const current = await this.profileRepository.findProfile(userId);
        throw new ConflictException({
          message: 'Profile version conflict.',
          code: 'SYNC_409_CONFLICT',
          data: {
            entityType: 'USER',
            entityId: userId,
            clientVersion: version,
            serverVersion: current?.version,
            serverSnapshot: current,
            resolutionStrategy: 'REPLACE_LOCAL_WITH_SERVER',
          },
        });
      }
      throw error;
    }
  }

  async getSettings(userId: string) {
    const settings = await this.profileRepository.findSettings(userId);
    if (!settings) throw new NotFoundException('User settings not found.');
    return settings;
  }

  async updateSettings(userId: string, version: number, data: { theme?: any, timezone?: string, syncEnabled?: boolean }) {
    try {
      return await this.profileRepository.updateSettings(userId, version, data);
    } catch (error: any) {
      if (error.code === 'P2025') {
        const current = await this.profileRepository.findSettings(userId);
        throw new ConflictException({
          message: 'Settings version conflict.',
          code: 'SYNC_409_CONFLICT',
          data: {
            entityType: 'SETTING',
            entityId: userId,
            clientVersion: version,
            serverVersion: current?.version,
            serverSnapshot: current,
            resolutionStrategy: 'REPLACE_LOCAL_WITH_SERVER',
          },
        });
      }
      throw error;
    }
  }
}
