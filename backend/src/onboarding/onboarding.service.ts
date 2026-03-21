import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async createEmployee(dto: CreateEmployeeDto) {
    const employee = await this.prisma.employee.create({
      data: {
        userId: dto.userId,
        departmentId: dto.departmentId,
        managerId: dto.managerId,
        jobTitle: dto.jobTitle,
        startDate: new Date(dto.startDate),
      },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        department: true,
      },
    });

    return employee;
  }

  async getEmployee(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, firstName: true, lastName: true, role: true } },
        department: true,
        manager: { select: { firstName: true, lastName: true, email: true } },
        tasks: { orderBy: { dueDate: 'asc' } },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async getEmployeeByUserId(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true, role: true } },
        department: true,
        tasks: { orderBy: { dueDate: 'asc' } },
      },
    });

    return employee;
  }

  async getOnboardingProgress(employeeId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { employeeId },
    });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;

    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      byStatus: {
        pending: tasks.filter((t) => t.status === 'PENDING').length,
        inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
        completed,
        blocked: tasks.filter((t) => t.status === 'BLOCKED').length,
      },
    };
  }

  async listEmployees(filters?: { departmentId?: string; status?: string }) {
    return this.prisma.employee.findMany({
      where: {
        ...(filters?.departmentId && { departmentId: filters.departmentId }),
        ...(filters?.status && { onboardingStatus: filters.status as any }),
      },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        department: true,
      },
      orderBy: { startDate: 'desc' },
    });
  }
}
