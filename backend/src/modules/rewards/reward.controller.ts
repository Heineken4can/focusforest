import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { createSuccessResponse } from '../../common/http/api-response';
import { RewardService } from './reward.service';

@ApiTags('Reward')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rewards')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Fetch today stats and progress snapshot.' })
  @ApiOkResponse({ description: 'Stats fetched successfully.' })
  async getStats(@CurrentUser('userId') userId: string) {
    const data = await this.rewardService.getStats(userId);
    return createSuccessResponse('Stats fetched successfully.', data);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Fetch reward ledger history.' })
  @ApiOkResponse({ description: 'Ledger history fetched successfully.' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getLedger(
    @CurrentUser('userId') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    const data = await this.rewardService.getLedger(userId, cursor, limit ? +limit : 20);
    return createSuccessResponse('Ledger history fetched successfully.', data);
  }
}
