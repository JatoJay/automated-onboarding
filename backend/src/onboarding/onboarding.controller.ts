import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class OnboardingController {
  constructor(
    private onboardingService: OnboardingService,
    private prisma: PrismaService,
  ) {}

  @Post()
  createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.onboardingService.createEmployee(dto);
  }

  @Get()
  listEmployees(
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
  ) {
    return this.onboardingService.listEmployees({ departmentId, status });
  }

  @Get('me')
  getMyProfile(@Request() req: any) {
    return this.onboardingService.getEmployeeByUserId(req.user.id);
  }

  @Get('me/progress')
  async getMyProgress(@Request() req: any) {
    const employee = await this.onboardingService.getEmployeeByUserId(req.user.id);
    if (!employee) return null;
    return this.onboardingService.getOnboardingProgress(employee.id);
  }

  @Get('me/knowledge')
  async getMyKnowledge(@Request() req: any, @Query('category') category?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: req.user.id },
      select: {
        departmentId: true,
        departmentAccess: { select: { departmentId: true } },
      },
    });

    if (!employee) {
      return [];
    }

    const accessibleDeptIds = [
      employee.departmentId,
      ...employee.departmentAccess.map((a) => a.departmentId),
    ];

    return this.prisma.knowledgeDocument.findMany({
      where: {
        OR: [
          { departmentId: { in: accessibleDeptIds } },
          { isOrgWide: true },
        ],
        ...(category && { category }),
        status: 'INDEXED',
      },
      select: {
        id: true,
        title: true,
        category: true,
        documentType: true,
        isOrgWide: true,
        department: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('me/accessible-departments')
  async getMyAccessibleDepartments(@Request() req: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: req.user.id },
      select: {
        department: { select: { id: true, name: true, description: true } },
        departmentAccess: {
          select: {
            department: { select: { id: true, name: true, description: true } },
          },
        },
      },
    });

    if (!employee) {
      return [];
    }

    return [
      { ...employee.department, isPrimary: true },
      ...employee.departmentAccess.map((a) => ({
        ...a.department,
        isPrimary: false,
      })),
    ];
  }

  @Get('me/org-chart')
  async getMyOrgChart(@Request() req: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: req.user.id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        department: {
          include: {
            head: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            parent: {
              include: {
                head: {
                  select: { id: true, firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!employee) {
      return { noEmployeeRecord: true };
    }

    const buildManagerChain = async (managerId: string | null): Promise<any[]> => {
      if (!managerId) return [];

      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          employee: {
            select: {
              jobTitle: true,
              managerId: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!manager) return [];

      const chain = [{
        id: manager.id,
        firstName: manager.firstName,
        lastName: manager.lastName,
        email: manager.email,
        role: manager.role,
        jobTitle: manager.employee?.jobTitle,
        department: manager.employee?.department,
      }];

      if (manager.employee?.managerId) {
        const upperChain = await buildManagerChain(manager.employee.managerId);
        chain.push(...upperChain);
      }

      return chain;
    };

    const managerChain = await buildManagerChain(employee.managerId);

    const colleagues = await this.prisma.employee.findMany({
      where: {
        departmentId: employee.departmentId,
        userId: { not: req.user.id },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
      take: 10,
    });

    return {
      employee: {
        id: employee.user.id,
        firstName: employee.user.firstName,
        lastName: employee.user.lastName,
        email: employee.user.email,
        jobTitle: employee.jobTitle,
      },
      department: {
        id: employee.department.id,
        name: employee.department.name,
        head: employee.department.head,
        parent: employee.department.parent ? {
          id: employee.department.parent.id,
          name: employee.department.parent.name,
          head: employee.department.parent.head,
        } : null,
      },
      directManager: employee.manager,
      managerChain,
      colleagues: colleagues.map((c) => ({
        id: c.user.id,
        firstName: c.user.firstName,
        lastName: c.user.lastName,
        email: c.user.email,
        jobTitle: c.jobTitle,
        role: c.user.role,
      })),
    };
  }

  @Get(':id')
  getEmployee(@Param('id') id: string) {
    return this.onboardingService.getEmployee(id);
  }

  @Get(':id/progress')
  getProgress(@Param('id') id: string) {
    return this.onboardingService.getOnboardingProgress(id);
  }
}
