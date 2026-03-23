import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateHelpRequestDto, UpdateHelpRequestDto, CreateReplyDto } from './dto/create-help-request.dto';

@Injectable()
export class HelpRequestsService {
  constructor(private prisma: PrismaService) {}

  async create(employeeId: string, organizationId: string, dto: CreateHelpRequestDto) {
    return this.prisma.helpRequest.create({
      data: {
        organizationId,
        employeeId,
        taskId: dto.taskId,
        category: dto.category as any,
        subject: dto.subject,
        description: dto.description,
      },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            department: { select: { id: true, name: true } },
          },
        },
        task: { select: { id: true, title: true, type: true } },
      },
    });
  }

  async getMyRequests(employeeId: string) {
    return this.prisma.helpRequest.findMany({
      where: { employeeId },
      include: {
        task: { select: { id: true, title: true, type: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        replies: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRequest(id: string, userId: string, organizationId: string) {
    const request = await this.prisma.helpRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            department: { select: { id: true, name: true } },
          },
        },
        task: { select: { id: true, title: true, type: true, status: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        replies: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Help request not found');
    }

    if (request.organizationId !== organizationId) {
      throw new ForbiddenException('Access denied');
    }

    return request;
  }

  async listForAdmin(organizationId: string, filters?: { status?: string; category?: string }) {
    const where: any = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;

    return this.prisma.helpRequest.findMany({
      where,
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            department: { select: { id: true, name: true } },
          },
        },
        task: { select: { id: true, title: true, type: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { replies: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async update(id: string, organizationId: string, dto: UpdateHelpRequestDto) {
    const request = await this.prisma.helpRequest.findUnique({ where: { id } });

    if (!request || request.organizationId !== organizationId) {
      throw new NotFoundException('Help request not found');
    }

    const data: any = {};
    if (dto.status) {
      data.status = dto.status;
      if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') {
        data.resolvedAt = new Date();
      }
    }
    if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId || null;
    if (dto.resolution !== undefined) data.resolution = dto.resolution;

    return this.prisma.helpRequest.update({
      where: { id },
      data,
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            department: { select: { id: true, name: true } },
          },
        },
        task: { select: { id: true, title: true, type: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async addReply(helpRequestId: string, userId: string, organizationId: string, dto: CreateReplyDto) {
    const request = await this.prisma.helpRequest.findUnique({ where: { id: helpRequestId } });

    if (!request || request.organizationId !== organizationId) {
      throw new NotFoundException('Help request not found');
    }

    const reply = await this.prisma.helpRequestReply.create({
      data: {
        helpRequestId,
        userId,
        message: dto.message,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    if (request.status === 'OPEN') {
      await this.prisma.helpRequest.update({
        where: { id: helpRequestId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return reply;
  }

  async getStats(organizationId: string) {
    const [open, inProgress, resolvedToday, total] = await Promise.all([
      this.prisma.helpRequest.count({ where: { organizationId, status: 'OPEN' } }),
      this.prisma.helpRequest.count({ where: { organizationId, status: 'IN_PROGRESS' } }),
      this.prisma.helpRequest.count({
        where: {
          organizationId,
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.helpRequest.count({ where: { organizationId } }),
    ]);

    return { open, inProgress, resolvedToday, total };
  }

  async getNotificationCount(userId: string, employeeId: string | null, organizationId: string, isAdmin: boolean) {
    if (isAdmin) {
      const openRequests = await this.prisma.helpRequest.count({
        where: { organizationId, status: 'OPEN' },
      });
      return { count: openRequests, type: 'admin' };
    }

    if (!employeeId) {
      return { count: 0, type: 'employee' };
    }

    const requestsWithNewReplies = await this.prisma.helpRequest.findMany({
      where: {
        employeeId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      include: {
        replies: {
          where: {
            userId: { not: userId },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const unreadCount = requestsWithNewReplies.filter(
      (r) => r.replies.length > 0
    ).length;

    return { count: unreadCount, type: 'employee' };
  }
}
