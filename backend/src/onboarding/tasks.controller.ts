import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(
    private tasksService: TasksService,
    private prisma: PrismaService,
  ) {}

  @Post()
  createTask(@Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(dto);
  }

  @Get('my-tasks')
  async getMyTasks(@Request() req: any, @Query('status') status?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: req.user.id },
    });

    if (!employee) {
      return [];
    }

    return this.tasksService.getEmployeeTasks(employee.id, status);
  }

  @Get('all')
  async getAllTasks(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'HR')) {
      return { tasks: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    return this.tasksService.getAllTasks({
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get('employee/:employeeId')
  getEmployeeTasks(
    @Param('employeeId') employeeId: string,
    @Query('status') status?: string,
  ) {
    return this.tasksService.getEmployeeTasks(employeeId, status);
  }

  @Post('assign/:employeeId/:planId')
  assignFromPlan(
    @Param('employeeId') employeeId: string,
    @Param('planId') planId: string,
  ) {
    return this.tasksService.assignTasksFromPlan(employeeId, planId);
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
}
