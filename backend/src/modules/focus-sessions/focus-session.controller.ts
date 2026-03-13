import { Body, Controller, Param, Patch, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/auth/auth-request.interface';
import {
  CompleteSessionEnvelopeDto,
  GiveUpSessionEnvelopeDto,
  SessionEnvelopeDto,
  StartFocusSessionEnvelopeDto,
} from './dto/focus-session-response.dto';
import { PauseFocusSessionDto } from './dto/pause-focus-session.dto';
import { ResumeFocusSessionDto } from './dto/resume-focus-session.dto';
import {
  GiveUpFocusSessionDto,
  SessionEventDto,
} from './dto/session-event.dto';
import { StartFocusSessionDto } from './dto/start-focus-session.dto';
import { FocusSessionService } from './focus-session.service';

@ApiTags('Focus Session')
@ApiBearerAuth()
@Controller('focus-sessions')
export class FocusSessionController {
  constructor(private readonly focusSessionService: FocusSessionService) {}

  @Post()
  @ApiOperation({ summary: 'Start a focus session.' })
  @ApiCreatedResponse({
    description: 'Focus session started successfully.',
    type: StartFocusSessionEnvelopeDto,
  })
  @ApiConflictResponse({
    description:
      'Task is completed, task version conflicts, or another active session exists.',
  })
  startSession(
    @Req() request: AuthenticatedRequest,
    @Body() dto: StartFocusSessionDto,
  ) {
    return this.focusSessionService.startSession(request.auth!.userId, dto);
  }

  @Patch(':sessionId/pause')
  @ApiOperation({ summary: 'Pause a running focus session.' })
  @ApiOkResponse({
    description: 'Focus session paused successfully.',
    type: SessionEnvelopeDto,
  })
  pauseSession(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: PauseFocusSessionDto,
  ) {
    return this.focusSessionService.pauseSession(
      request.auth!.userId,
      sessionId,
      dto,
    );
  }

  @Patch(':sessionId/resume')
  @ApiOperation({ summary: 'Resume a paused focus session.' })
  @ApiOkResponse({
    description: 'Focus session resumed successfully.',
    type: SessionEnvelopeDto,
  })
  resumeSession(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: ResumeFocusSessionDto,
  ) {
    return this.focusSessionService.resumeSession(
      request.auth!.userId,
      sessionId,
      dto,
    );
  }

  @Post(':sessionId/give-up')
  @ApiOperation({ summary: 'Give up a focus session.' })
  @ApiOkResponse({
    description: 'Focus session given up successfully.',
    type: GiveUpSessionEnvelopeDto,
  })
  giveUpSession(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: GiveUpFocusSessionDto,
  ) {
    return this.focusSessionService.giveUpSession(
      request.auth!.userId,
      sessionId,
      dto,
    );
  }

  @Post(':sessionId/complete')
  @ApiOperation({ summary: 'Complete a focus session and settle rewards.' })
  @ApiOkResponse({
    description: 'Focus session completed successfully.',
    type: CompleteSessionEnvelopeDto,
  })
  completeSession(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: SessionEventDto,
  ) {
    return this.focusSessionService.completeSession(
      request.auth!.userId,
      sessionId,
      dto,
    );
  }

  @Post(':sessionId/start-break')
  @ApiOperation({ summary: 'Start a break after a completed focus session.' })
  @ApiOkResponse({
    description: 'Break started successfully.',
    type: SessionEnvelopeDto,
  })
  startBreak(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: SessionEventDto,
  ) {
    return this.focusSessionService.startBreak(
      request.auth!.userId,
      sessionId,
      dto,
    );
  }

  @Post(':sessionId/complete-break')
  @ApiOperation({ summary: 'Complete a running break.' })
  @ApiOkResponse({
    description: 'Break completed successfully.',
    type: SessionEnvelopeDto,
  })
  completeBreak(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: SessionEventDto,
  ) {
    return this.focusSessionService.completeBreak(
      request.auth!.userId,
      sessionId,
      dto,
    );
  }

  @Post(':sessionId/skip-break')
  @ApiOperation({ summary: 'Skip a running break.' })
  @ApiOkResponse({
    description: 'Break skipped successfully.',
    type: SessionEnvelopeDto,
  })
  skipBreak(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: SessionEventDto,
  ) {
    return this.focusSessionService.skipBreak(
      request.auth!.userId,
      sessionId,
      dto,
    );
  }
}
