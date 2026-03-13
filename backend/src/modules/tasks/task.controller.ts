import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/auth/auth-request.interface';
import { CreateTaskDto } from './dto/create-task.dto';
import { DeleteTaskQueryDto } from './dto/delete-task.dto';
import {
  DeleteTaskEnvelopeDto,
  TaskEnvelopeDto,
  TaskListEnvelopeDto,
} from './dto/task-response.dto';
import { GetTasksQueryDto } from './dto/get-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskService } from './task.service';

@ApiTags('Task')
@ApiBearerAuth()
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @ApiOperation({ summary: 'Fetch visible tasks.' })
  @ApiOkResponse({
    description: 'Tasks fetched successfully.',
    type: TaskListEnvelopeDto,
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'isCore', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getTasks(
    @Req() request: AuthenticatedRequest,
    @Query() query: GetTasksQueryDto,
  ) {
    return this.taskService.getTasks(request.auth!.userId, query);
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Fetch a single visible task.' })
  @ApiOkResponse({
    description: 'Task fetched successfully.',
    type: TaskEnvelopeDto,
  })
  @ApiNotFoundResponse({ description: 'Task not found.' })
  getTask(
    @Req() request: AuthenticatedRequest,
    @Param('taskId') taskId: string,
  ) {
    return this.taskService.getTask(request.auth!.userId, taskId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a task.' })
  @ApiCreatedResponse({
    description: 'Task created successfully.',
    type: TaskEnvelopeDto,
  })
  createTask(@Req() request: AuthenticatedRequest, @Body() dto: CreateTaskDto) {
    return this.taskService.createTask(request.auth!.userId, dto);
  }

  @Patch(':taskId')
  @ApiOperation({
    summary: 'Update a task, including completion or core designation.',
  })
  @ApiOkResponse({
    description: 'Task updated successfully.',
    type: TaskEnvelopeDto,
  })
  @ApiConflictResponse({
    description:
      'Version conflict, active-session lock, or completed-task core designation guard.',
  })
  updateTask(
    @Req() request: AuthenticatedRequest,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.updateTask(request.auth!.userId, taskId, dto);
  }

  @Delete(':taskId')
  @ApiOperation({ summary: 'Soft-delete a task.' })
  @ApiOkResponse({
    description: 'Task deleted successfully.',
    type: DeleteTaskEnvelopeDto,
  })
  @ApiConflictResponse({
    description: 'Version conflict or active-session lock.',
  })
  deleteTask(
    @Req() request: AuthenticatedRequest,
    @Param('taskId') taskId: string,
    @Query() query: DeleteTaskQueryDto,
  ) {
    return this.taskService.deleteTask(
      request.auth!.userId,
      taskId,
      query.version,
    );
  }
}
