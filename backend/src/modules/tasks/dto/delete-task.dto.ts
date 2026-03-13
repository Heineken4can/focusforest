import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class DeleteTaskQueryDto {
  @ApiProperty({
    description: 'Current task version for optimistic locking.',
    minimum: 1,
  })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  version!: number;
}
