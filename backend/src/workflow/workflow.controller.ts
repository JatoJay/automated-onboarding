import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateTaskTemplateDto } from './dto/create-task-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/workflows')
export class WorkflowController {
  constructor(private workflowService: WorkflowService) {}

  @Post('plans')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.workflowService.createPlan(dto);
  }

  @Get('plans')
  listPlans(@Query('departmentId') departmentId?: string) {
    return this.workflowService.listPlans(departmentId);
  }

  @Get('plans/:id')
  getPlan(@Param('id') id: string) {
    return this.workflowService.getPlan(id);
  }

  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) {
    return this.workflowService.deletePlan(id);
  }

  @Post('plans/:planId/tasks')
  addTaskTemplate(
    @Param('planId') planId: string,
    @Body() dto: CreateTaskTemplateDto,
  ) {
    return this.workflowService.addTaskTemplate(planId, dto);
  }

  @Post('plans/:planId/reorder')
  reorderTasks(
    @Param('planId') planId: string,
    @Body() body: { templateIds: string[] },
  ) {
    return this.workflowService.reorderTaskTemplates(planId, body.templateIds);
  }

  @Delete('tasks/:id')
  deleteTaskTemplate(@Param('id') id: string) {
    return this.workflowService.deleteTaskTemplate(id);
  }
}
