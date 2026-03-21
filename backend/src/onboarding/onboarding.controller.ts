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

  @Get(':id')
  getEmployee(@Param('id') id: string) {
    return this.onboardingService.getEmployee(id);
  }

  @Get(':id/progress')
  getProgress(@Param('id') id: string) {
    return this.onboardingService.getOnboardingProgress(id);
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
}
