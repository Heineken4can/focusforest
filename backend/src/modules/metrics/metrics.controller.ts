import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Public } from '../../common/auth/public.decorator';
import { createSuccessResponse } from '../../common/http/api-response';
import { MetricsService, MetricEventInput } from './metrics.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Public()
  @Post('events')
  @ApiOperation({ summary: 'Collect KPI events.' })
  @ApiOkResponse({ description: 'Events collected successfully.' })
  async collectEvents(
    @CurrentUser('userId') userId: string | undefined,
    @Body() dto: { deviceId: string; events: MetricEventInput[] },
  ) {
    const data = await this.metricsService.collectEvents(userId, dto.deviceId, dto.events);
    return createSuccessResponse('Events collected successfully.', data);
  }
}
