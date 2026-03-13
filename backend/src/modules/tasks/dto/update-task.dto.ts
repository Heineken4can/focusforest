import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateTaskDto {
  @ApiProperty({
    description: 'Current task version for optimistic locking.',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({
    description: 'Task title.',
    minLength: 1,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({
    description: 'Optional task description.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    enum: TaskStatus,
    description: 'Task status transition.',
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Core-task designation toggle.',
  })
  @IsOptional()
  @IsBoolean()
  isCore?: boolean;
}
