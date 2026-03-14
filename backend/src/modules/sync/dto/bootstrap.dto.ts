import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionStatus, TaskStatus, ThemeMode } from '@prisma/client';

export class TaskUpsertInput {
  @IsUUID()
  @IsNotEmpty()
  clientGeneratedId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsBoolean()
  @IsOptional()
  isCore?: boolean;

  @IsInt()
  @Min(1)
  version!: number;

  @IsDateString()
  createdAt!: string;

  @IsDateString()
  updatedAt!: string;

  @IsDateString()
  @IsOptional()
  deletedAt?: string;
}

export class SessionFactInput {
  @IsUUID()
  @IsNotEmpty()
  clientGeneratedId!: string;

  @IsUUID()
  @IsNotEmpty()
  taskId!: string;

  @IsEnum(SessionStatus)
  status!: SessionStatus;

  @IsInt()
  @Min(0)
  plannedFocusSec!: number;

  @IsDateString()
  startedAt!: string;

  @IsInt()
  @Min(0)
  pauseCount!: number;

  @IsDateString()
  @IsOptional()
  pauseStartedAt?: string;

  @IsDateString()
  @IsOptional()
  pauseDeadlineAt?: string;

  @IsDateString()
  @IsOptional()
  focusEndedAt?: string;

  @IsDateString()
  @IsOptional()
  givenUpAt?: string;

  @IsDateString()
  @IsOptional()
  breakStartedAt?: string;

  @IsDateString()
  @IsOptional()
  breakEndsAt?: string;

  @IsDateString()
  @IsOptional()
  breakEndedAt?: string;

  @IsInt()
  @Min(1)
  version!: number;

  @IsDateString()
  createdAt!: string;

  @IsDateString()
  updatedAt!: string;
}

export class ProfileInput {
  @IsInt()
  @Min(1)
  version!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  displayName!: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

export class SettingInput {
  @IsInt()
  @Min(1)
  version!: number;

  @IsEnum(ThemeMode)
  theme!: ThemeMode;

  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @IsBoolean()
  syncEnabled!: boolean;
}

export class BootstrapBatch {
  @IsString()
  @IsNotEmpty()
  batchId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskUpsertInput)
  tasks!: TaskUpsertInput[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionFactInput)
  sessions!: SessionFactInput[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileInput)
  profile?: ProfileInput;

  @IsOptional()
  @ValidateNested()
  @Type(() => SettingInput)
  setting?: SettingInput;
}

export class BootstrapDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BootstrapBatch)
  batches!: BootstrapBatch[];
}
