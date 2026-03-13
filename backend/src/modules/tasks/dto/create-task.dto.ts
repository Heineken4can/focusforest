import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Client-generated UUIDv7 for local-first reconciliation.',
    format: 'uuid',
  })
  @IsUUID()
  clientGeneratedId!: string;

  @ApiProperty({
    description: 'Task title.',
    minLength: 1,
    maxLength: 120,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional({
    description: 'Optional task description.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Marks the task as the current core task.',
  })
  @IsOptional()
  @IsBoolean()
  isCore?: boolean;
}
