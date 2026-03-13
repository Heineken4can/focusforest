import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/auth/public.decorator';
import { createSuccessResponse } from '../../common/http/api-response';
import { HealthService } from './health.service';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Application liveness check' })
  @ApiOkResponse({ description: 'Application process is alive.' })
  getLive() {
    return createSuccessResponse(
      'Application process is alive.',
      this.healthService.getLiveStatus(),
    );
  }

  @Get('ready')
  @ApiOperation({ summary: 'Application readiness check' })
  @ApiOkResponse({ description: 'Application dependencies are ready.' })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL or Redis is not reachable.',
  })
  async getReady() {
    const readiness = await this.healthService.getReadinessStatus();

    if (!readiness.ok) {
      throw new ServiceUnavailableException({
        message: 'Application dependencies are not ready.',
        code: 'APP_503_NOT_READY',
        data: readiness,
      });
    }

    return createSuccessResponse(
      'Application dependencies are ready.',
      readiness,
    );
  }
}
