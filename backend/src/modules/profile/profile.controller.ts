import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { createSuccessResponse } from '../../common/http/api-response';
import { ProfileService } from './profile.service';

@ApiTags('Profile & Setting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Fetch user profile.' })
  @ApiOkResponse({ description: 'Profile fetched successfully.' })
  async getProfile(@CurrentUser('userId') userId: string) {
    const data = await this.profileService.getProfile(userId);
    return createSuccessResponse('Profile fetched successfully.', data);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile.' })
  @ApiOkResponse({ description: 'Profile updated successfully.' })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: { version: number; displayName?: string; avatarUrl?: string },
  ) {
    const { version, ...data } = dto;
    const result = await this.profileService.updateProfile(userId, version, data);
    return createSuccessResponse('Profile updated successfully.', result);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Fetch user settings.' })
  @ApiOkResponse({ description: 'Settings fetched successfully.' })
  async getSettings(@CurrentUser('userId') userId: string) {
    const data = await this.profileService.getSettings(userId);
    return createSuccessResponse('Settings fetched successfully.', data);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update user settings.' })
  @ApiOkResponse({ description: 'Settings updated successfully.' })
  async updateSettings(
    @CurrentUser('userId') userId: string,
    @Body() dto: { version: number; theme?: any; timezone?: string; syncEnabled?: boolean },
  ) {
    const { version, ...data } = dto;
    const result = await this.profileService.updateSettings(userId, version, data);
    return createSuccessResponse('Settings updated successfully.', result);
  }
}
