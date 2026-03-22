import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async createTask(dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        employeeId: dto.employeeId,
        title: dto.title,
        description: dto.description,
        type: dto.type as any,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assignedById: dto.assignedById,
      },
    });
  }

  async getTask(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        employee: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        assignedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async getEmployeeTasks(employeeId: string, status?: string) {
    return this.prisma.task.findMany({
      where: {
        employeeId,
        ...(status && { status: status as any }),
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async getAllTasks(params: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where = status ? { status: status as any } : {};

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          employee: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
          assignedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status as any }),
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.status === 'COMPLETED' && { completedAt: new Date() }),
      },
    });
  }

  async completeTask(id: string) {
    return this.updateTask(id, { status: 'COMPLETED' });
  }

  async assignTasksFromPlan(employeeId: string, planId: string) {
    const plan = await this.prisma.onboardingPlan.findUnique({
      where: { id: planId },
      include: { taskTemplates: { orderBy: { order: 'asc' } } },
    });

    if (!plan) {
      throw new NotFoundException('Onboarding plan not found');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const tasks = plan.taskTemplates.map((template) => ({
      employeeId,
      title: template.title,
      description: template.description,
      type: template.type,
      dueDate: new Date(
        employee.startDate.getTime() +
          template.daysFromStart * 24 * 60 * 60 * 1000,
      ),
    }));

    return this.prisma.task.createMany({ data: tasks });
  }
}
