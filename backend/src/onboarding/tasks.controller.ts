import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  createTask(@Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(dto);
  }

  @Get('employee/:employeeId')
  getEmployeeTasks(
    @Param('employeeId') employeeId: string,
    @Query('status') status?: string,
  ) {
    return this.tasksService.getEmployeeTasks(employeeId, status);
  }

  @Get(':id')
  getTask(@Param('id') id: string) {
    return this.tasksService.getTask(id);
  }

  @Patch(':id')
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.updateTask(id, dto);
  }

  @Post(':id/complete')
  completeTask(@Param('id') id: string) {
    return this.tasksService.completeTask(id);
  }

  @Post('assign/:employeeId/:planId')
  assignFromPlan(
    @Param('employeeId') employeeId: string,
    @Param('planId') planId: string,
  ) {
    return this.tasksService.assignTasksFromPlan(employeeId, planId);
  }
}
