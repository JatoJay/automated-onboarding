import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateTaskTemplateDto } from './dto/create-task-template.dto';

interface MilestoneTemplate {
  title: string;
  description: string;
  type: string;
  daysFromStart: number;
  milestone: '30' | '60' | '90' | 'first_week';
}

const STANDARD_MILESTONES: MilestoneTemplate[] = [
  { title: 'Complete HR onboarding paperwork', description: 'Submit all required HR documents and forms', type: 'DOCUMENT', daysFromStart: 1, milestone: 'first_week' },
  { title: 'Set up workstation and accounts', description: 'Configure laptop, email, and tool access', type: 'DOCUMENT', daysFromStart: 1, milestone: 'first_week' },
  { title: 'Meet with your manager', description: 'Initial 1:1 to discuss role expectations and goals', type: 'MEETING', daysFromStart: 2, milestone: 'first_week' },
  { title: 'Complete security training', description: 'Finish required security awareness training', type: 'TRAINING', daysFromStart: 5, milestone: 'first_week' },
  { title: 'Meet team members', description: 'Schedule introductory calls with all team members', type: 'MEETING', daysFromStart: 7, milestone: 'first_week' },

  { title: '30-day check-in with manager', description: 'Review first month progress and adjust goals', type: 'MEETING', daysFromStart: 30, milestone: '30' },
  { title: 'Complete role-specific training', description: 'Finish all required training for your position', type: 'TRAINING', daysFromStart: 25, milestone: '30' },
  { title: 'Shadow a senior team member', description: 'Observe workflows and best practices', type: 'TRAINING', daysFromStart: 14, milestone: '30' },
  { title: 'Document learnings', description: 'Create notes on key processes and contacts', type: 'DOCUMENT', daysFromStart: 28, milestone: '30' },

  { title: '60-day check-in with manager', description: 'Mid-point review and feedback session', type: 'MEETING', daysFromStart: 60, milestone: '60' },
  { title: 'Lead a small project or task', description: 'Take ownership of a defined piece of work', type: 'APPROVAL', daysFromStart: 45, milestone: '60' },
  { title: 'Present to the team', description: 'Share what you have learned or accomplished', type: 'MEETING', daysFromStart: 55, milestone: '60' },

  { title: '90-day review meeting', description: 'Formal end-of-probation review with manager', type: 'MEETING', daysFromStart: 90, milestone: '90' },
  { title: 'Set goals for next quarter', description: 'Define objectives for the upcoming quarter', type: 'DOCUMENT', daysFromStart: 85, milestone: '90' },
  { title: 'Complete onboarding feedback survey', description: 'Provide feedback on your onboarding experience', type: 'FORM', daysFromStart: 88, milestone: '90' },
];

@Injectable()
export class WorkflowService {
  constructor(private prisma: PrismaService) {}

  async createPlan(dto: CreatePlanDto) {
    return this.prisma.onboardingPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        departmentId: dto.departmentId,
        isDefault: dto.isDefault || false,
      },
    });
  }

  async getPlan(id: string) {
    const plan = await this.prisma.onboardingPlan.findUnique({
      where: { id },
      include: {
        taskTemplates: { orderBy: { order: 'asc' } },
        department: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  async listPlans(departmentId?: string) {
    return this.prisma.onboardingPlan.findMany({
      where: departmentId ? { departmentId } : {},
      include: {
        department: true,
        taskTemplates: { orderBy: { order: 'asc' } },
        _count: { select: { taskTemplates: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async addTaskTemplate(planId: string, dto: CreateTaskTemplateDto) {
    const plan = await this.prisma.onboardingPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const maxOrder = await this.prisma.taskTemplate.aggregate({
      where: { onboardingPlanId: planId },
      _max: { order: true },
    });

    return this.prisma.taskTemplate.create({
      data: {
        onboardingPlanId: planId,
        title: dto.title,
        description: dto.description,
        type: dto.type as any,
        daysFromStart: dto.daysFromStart || 0,
        durationDays: dto.durationDays || 1,
        order: (maxOrder._max.order || 0) + 1,
        isRequired: dto.isRequired ?? true,
      },
    });
  }

  async reorderTaskTemplates(planId: string, templateIds: string[]) {
    const updates = templateIds.map((id, index) =>
      this.prisma.taskTemplate.update({
        where: { id },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return this.getPlan(planId);
  }

  async deleteTaskTemplate(id: string) {
    return this.prisma.taskTemplate.delete({ where: { id } });
  }

  async deletePlan(id: string) {
    await this.prisma.taskTemplate.deleteMany({
      where: { onboardingPlanId: id },
    });

    return this.prisma.onboardingPlan.delete({ where: { id } });
  }

  async createStandard30_60_90Plan(departmentId?: string) {
    const plan = await this.prisma.onboardingPlan.create({
      data: {
        name: '30-60-90 Day Onboarding Plan',
        description: 'Comprehensive onboarding with milestones at 30, 60, and 90 days',
        departmentId,
        isDefault: !departmentId,
      },
    });

    const templates = STANDARD_MILESTONES.map((m, index) => ({
      onboardingPlanId: plan.id,
      title: m.title,
      description: m.description,
      type: m.type as any,
      daysFromStart: m.daysFromStart,
      order: index,
      isRequired: true,
    }));

    await this.prisma.taskTemplate.createMany({ data: templates });

    return this.getPlan(plan.id);
  }

  async getEmployeeMilestones(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        tasks: { orderBy: { dueDate: 'asc' } },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const daysInRole = Math.floor(
      (Date.now() - new Date(employee.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const milestones = {
      first_week: { day: 7, tasks: [] as any[], completed: 0, total: 0 },
      day_30: { day: 30, tasks: [] as any[], completed: 0, total: 0 },
      day_60: { day: 60, tasks: [] as any[], completed: 0, total: 0 },
      day_90: { day: 90, tasks: [] as any[], completed: 0, total: 0 },
    };

    for (const task of employee.tasks) {
      const taskDaysFromStart = task.dueDate
        ? Math.ceil((new Date(task.dueDate).getTime() - new Date(employee.startDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      let milestone: keyof typeof milestones;
      if (taskDaysFromStart <= 7) milestone = 'first_week';
      else if (taskDaysFromStart <= 30) milestone = 'day_30';
      else if (taskDaysFromStart <= 60) milestone = 'day_60';
      else milestone = 'day_90';

      milestones[milestone].tasks.push(task);
      milestones[milestone].total++;
      if (task.status === 'COMPLETED') {
        milestones[milestone].completed++;
      }
    }

    const currentMilestone =
      daysInRole <= 7 ? 'first_week' :
      daysInRole <= 30 ? 'day_30' :
      daysInRole <= 60 ? 'day_60' :
      daysInRole <= 90 ? 'day_90' : 'completed';

    return {
      employeeId,
      daysInRole,
      currentMilestone,
      milestones: Object.entries(milestones).map(([key, value]) => ({
        name: key,
        targetDay: value.day,
        tasksCompleted: value.completed,
        tasksTotal: value.total,
        completionRate: value.total > 0 ? Math.round((value.completed / value.total) * 100) : 0,
        isComplete: value.completed === value.total && value.total > 0,
        isCurrent: key === currentMilestone,
        tasks: value.tasks,
      })),
      overallProgress: {
        completed: employee.tasks.filter(t => t.status === 'COMPLETED').length,
        total: employee.tasks.length,
        percentage: employee.tasks.length > 0
          ? Math.round((employee.tasks.filter(t => t.status === 'COMPLETED').length / employee.tasks.length) * 100)
          : 0,
      },
    };
  }

  async assignStandardPlanToEmployee(employeeId: string, planId?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    let plan;
    if (planId) {
      plan = await this.prisma.onboardingPlan.findUnique({
        where: { id: planId },
        include: { taskTemplates: { orderBy: { order: 'asc' } } },
      });
    } else {
      plan = await this.prisma.onboardingPlan.findFirst({
        where: {
          OR: [
            { departmentId: employee.departmentId },
            { isDefault: true },
          ],
        },
        include: { taskTemplates: { orderBy: { order: 'asc' } } },
        orderBy: { departmentId: 'desc' },
      });
    }

    if (!plan) {
      plan = await this.createStandard30_60_90Plan();
    }

    const tasks = plan.taskTemplates.map((template) => ({
      employeeId,
      title: template.title,
      description: template.description,
      type: template.type,
      dueDate: new Date(
        new Date(employee.startDate).getTime() +
        template.daysFromStart * 24 * 60 * 60 * 1000,
      ),
    }));

    await this.prisma.task.createMany({ data: tasks });

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { onboardingStatus: 'IN_PROGRESS' },
    });

    return {
      assigned: true,
      planName: plan.name,
      tasksCreated: tasks.length,
    };
  }
}
