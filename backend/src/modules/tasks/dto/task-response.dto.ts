import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';

export class TaskDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  clientGeneratedId!: string | null;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty({ enum: TaskStatus })
  status!: TaskStatus;

  @ApiProperty()
  isCore!: boolean;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class TaskDataDto {
  @ApiProperty({ type: TaskDto })
  task!: TaskDto;
}

export class TaskListDataDto {
  @ApiProperty({ type: [TaskDto] })
  items!: TaskDto[];
}

export class DeleteTaskDataDto {
  @ApiProperty()
  deletedTaskId!: string;

  @ApiProperty()
  deletedAt!: string;
}

export class TaskEnvelopeDto {
  @ApiProperty({ example: 'success' })
  status!: 'success';

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: TaskDataDto })
  data!: TaskDataDto;

  @ApiProperty()
  meta!: Record<string, unknown>;
}

export class TaskListEnvelopeDto {
  @ApiProperty({ example: 'success' })
  status!: 'success';

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: TaskListDataDto })
  data!: TaskListDataDto;

  @ApiProperty()
  meta!: {
    nextCursor?: string;
  };
}

export class DeleteTaskEnvelopeDto {
  @ApiProperty({ example: 'success' })
  status!: 'success';

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: DeleteTaskDataDto })
  data!: DeleteTaskDataDto;

  @ApiProperty()
  meta!: Record<string, unknown>;
}
