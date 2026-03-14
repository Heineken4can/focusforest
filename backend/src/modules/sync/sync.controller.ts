import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { BootstrapDto } from './dto/bootstrap.dto';
import { PushDto } from './dto/push.dto';
import { PullQueryDto } from './dto/pull.dto';
import { SyncRateLimitGuard } from './sync-rate-limit.guard';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';

@ApiTags('Sync')
@ApiBearerAuth()
@Controller('sync')
@UseGuards(SyncRateLimitGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('bootstrap')
  async bootstrap(@CurrentUser('userId') userId: string, @Body() dto: BootstrapDto) {
    return this.syncService.bootstrap(userId, dto);
  }

  @Post('push')
  async push(@CurrentUser('userId') userId: string, @Body() dto: PushDto) {
    return this.syncService.push(userId, dto);
  }

  @Get('pull')
  async pull(@CurrentUser('userId') userId: string, @Query() query: PullQueryDto) {
    return this.syncService.pull(userId, query);
  }
}
