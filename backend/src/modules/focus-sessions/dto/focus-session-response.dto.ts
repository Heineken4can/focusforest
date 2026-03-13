import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus, TaskStatus } from '@prisma/client';

export class FocusSessionDto {
  @ApiProperty()
  focusSessionId!: string;

  @ApiProperty()
  taskId!: string;

  @ApiProperty({ enum: SessionStatus })
  status!: SessionStatus;

  @ApiProperty()
  startedAt!: string;

  @ApiProperty()
  plannedFocusSec!: number;

  @ApiProperty()
  pauseCount!: number;

  @ApiPropertyOptional()
  pauseStartedAt!: string | null;

  @ApiPropertyOptional()
  pauseDeadlineAt!: string | null;

  @ApiPropertyOptional()
  focusEndedAt!: string | null;

  @ApiPropertyOptional()
  givenUpAt!: string | null;

  @ApiPropertyOptional()
  breakStartedAt!: string | null;

  @ApiPropertyOptional()
  breakEndsAt!: string | null;

  @ApiPropertyOptional()
  breakEndedAt!: string | null;

  @ApiProperty()
  version!: number;
}

export class CurrentTaskDto {
  @ApiProperty()
  taskId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: TaskStatus })
  status!: TaskStatus;

  @ApiProperty()
  isCore!: boolean;

  @ApiProperty()
  isLocked!: boolean;
}

export class NextTaskCandidateDto {
  @ApiProperty()
  taskId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: TaskStatus })
  status!: TaskStatus;
}

export class SidebarSummaryDto {
  @ApiProperty()
  completedFocusSessionCount!: number;
}

export class SessionPolicyDto {
  @ApiProperty()
  focusDurationSec!: number;

  @ApiProperty()
  breakDurationSec!: number;

  @ApiProperty()
  pauseLimitSec!: number;

  @ApiProperty()
  maxPauseCount!: number;
}

export class CompletionRewardDto {
  @ApiProperty()
  awardedSp!: number;

  @ApiProperty()
  awardedTrees!: number;

  @ApiProperty()
  totalSp!: number;

  @ApiProperty()
  level!: number;
}

export class GiveUpRewardDto {
  @ApiProperty()
  awardedSp!: number;

  @ApiProperty()
  awardedTrees!: number;
}

export class DailyStatDto {
  @ApiProperty()
  statDate!: string;

  @ApiProperty()
  focusedSeconds!: number;

  @ApiProperty()
  completedSessions!: number;

  @ApiProperty()
  plantedTrees!: number;
}

export class ProgressSnapshotDto {
  @ApiProperty()
  totalSp!: number;

  @ApiProperty()
  currentLevel!: number;

  @ApiProperty()
  totalCompletedSessions!: number;
}

export class StartFocusSessionDataDto {
  @ApiProperty({ type: FocusSessionDto })
  activeSession!: FocusSessionDto;

  @ApiProperty({ type: CurrentTaskDto })
  currentTask!: CurrentTaskDto;

  @ApiProperty({ type: SidebarSummaryDto })
  sidebarSummary!: SidebarSummaryDto;

  @ApiProperty({ type: [NextTaskCandidateDto] })
  nextTaskCandidates!: NextTaskCandidateDto[];

  @ApiProperty({ type: SessionPolicyDto })
  policy!: SessionPolicyDto;
}

export class SessionDataDto {
  @ApiProperty({ type: FocusSessionDto })
  session!: FocusSessionDto;
}

export class GiveUpSessionDataDto {
  @ApiProperty({ type: FocusSessionDto })
  session!: FocusSessionDto;

  @ApiProperty({ type: GiveUpRewardDto })
  reward!: GiveUpRewardDto;
}

export class CompleteSessionDataDto {
  @ApiProperty({ type: FocusSessionDto })
  session!: FocusSessionDto;

  @ApiProperty({ type: CompletionRewardDto })
  reward!: CompletionRewardDto;

  @ApiProperty({ type: DailyStatDto })
  dailyStat!: DailyStatDto;

  @ApiProperty({ type: ProgressSnapshotDto })
  progressSnapshot!: ProgressSnapshotDto;
}

export class StartFocusSessionEnvelopeDto {
  @ApiProperty({ example: 'success' })
  status!: 'success';

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: StartFocusSessionDataDto })
  data!: StartFocusSessionDataDto;

  @ApiProperty()
  meta!: Record<string, unknown>;
}

export class SessionEnvelopeDto {
  @ApiProperty({ example: 'success' })
  status!: 'success';

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: SessionDataDto })
  data!: SessionDataDto;

  @ApiProperty()
  meta!: Record<string, unknown>;
}

export class GiveUpSessionEnvelopeDto {
  @ApiProperty({ example: 'success' })
  status!: 'success';

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: GiveUpSessionDataDto })
  data!: GiveUpSessionDataDto;

  @ApiProperty()
  meta!: Record<string, unknown>;
}

export class CompleteSessionEnvelopeDto {
  @ApiProperty({ example: 'success' })
  status!: 'success';

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: CompleteSessionDataDto })
  data!: CompleteSessionDataDto;

  @ApiProperty()
  meta!: Record<string, unknown>;
}
