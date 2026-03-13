import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsUUID, Min } from 'class-validator';

export class StartFocusSessionDto {
  @ApiProperty()
  @IsUUID()
  taskId!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  taskVersion!: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientGeneratedId!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  startedAt!: string;
}
