import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SyncEntityType {
  TASK = 'TASK',
  FOCUS_SESSION = 'FOCUS_SESSION',
  PROFILE = 'PROFILE',
  SETTING = 'SETTING',
}

export enum SyncOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export class SyncEventInput {
  @IsUUID()
  @IsNotEmpty()
  eventId!: string;

  @IsInt()
  @Min(0)
  deviceSequence!: number;

  @IsEnum(SyncEntityType)
  entityType!: SyncEntityType;

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsEnum(SyncOperation)
  operation!: SyncOperation;

  @IsInt()
  @IsOptional()
  @Min(1)
  version?: number;

  @IsObject()
  @IsNotEmpty()
  payload!: any;

  @IsDateString()
  occurredAt!: string;
}

export class PushDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncEventInput)
  events!: SyncEventInput[];
}
