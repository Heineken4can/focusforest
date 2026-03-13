import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export enum GiveUpReason {
  USER_CANCEL = 'USER_CANCEL',
  PAUSE_TIMEOUT = 'PAUSE_TIMEOUT',
}

export class SessionEventDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  eventId!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  occurredAt!: string;
}

export class GiveUpFocusSessionDto extends SessionEventDto {
  @ApiPropertyOptional({ enum: GiveUpReason })
  @IsOptional()
  @IsEnum(GiveUpReason)
  reason?: GiveUpReason;
}
