import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateTaskTemplateDto } from './dto/create-task-template.dto';

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
}
