import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateDepartmentDto {
  @ApiProperty({ example: 'Engineering' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Software development team' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headId?: string;
}

class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Engineering' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Software development team' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headId?: string;
}

class SetDepartmentHeadDto {
  @ApiProperty()
  @IsString()
  headId: string;
}

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private prisma: PrismaService) {}

  private async getOrgId(): Promise<string> {
    let org = await this.prisma.organization.findFirst();
    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          name: 'Default Organization',
          slug: 'default',
        },
      });
    }
    return org.id;
  }

  @Get()
  async listDepartments() {
    const orgId = await this.getOrgId();
    return this.prisma.department.findMany({
      where: { organizationId: orgId },
      include: {
        head: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        parent: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            employees: true,
            knowledgeDocuments: true,
            dataSources: true,
            children: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get('hierarchy')
  async getDepartmentHierarchy() {
    const orgId = await this.getOrgId();
    const departments = await this.prisma.department.findMany({
      where: { organizationId: orgId },
      include: {
        head: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        employees: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            manager: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const buildTree = (parentId: string | null): any[] => {
      return departments
        .filter((d) => d.parentId === parentId)
        .map((dept) => ({
          id: dept.id,
          name: dept.name,
          description: dept.description,
          head: dept.head,
          employees: dept.employees.map((e) => ({
            id: e.id,
            userId: e.userId,
            firstName: e.user.firstName,
            lastName: e.user.lastName,
            email: e.user.email,
            jobTitle: e.jobTitle,
            manager: e.manager,
          })),
          children: buildTree(dept.id),
        }));
    };

    return buildTree(null);
  }

  @Get(':id')
  async getDepartment(@Param('id') id: string) {
    return this.prisma.department.findUnique({
      where: { id },
      include: {
        head: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true },
        },
        employees: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            manager: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        _count: {
          select: {
            knowledgeDocuments: true,
            dataSources: true,
          },
        },
      },
    });
  }

  @Get(':id/documents')
  async getDepartmentDocuments(@Param('id') id: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: {
        OR: [{ departmentId: id }, { isOrgWide: true }],
      },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        isOrgWide: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id/stats')
  async getDepartmentStats(@Param('id') id: string) {
    const [employeeCount, documentCount, sourceCount, pendingTasks] =
      await Promise.all([
        this.prisma.employee.count({ where: { departmentId: id } }),
        this.prisma.knowledgeDocument.count({
          where: { OR: [{ departmentId: id }, { isOrgWide: true }] },
        }),
        this.prisma.dataSource.count({ where: { departmentId: id } }),
        this.prisma.task.count({
          where: {
            employee: { departmentId: id },
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
        }),
      ]);

    return {
      employeeCount,
      documentCount,
      sourceCount,
      pendingTasks,
    };
  }

  @Post()
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    const orgId = await this.getOrgId();
    return this.prisma.department.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
        headId: dto.headId,
      },
      include: {
        head: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
    });
  }

  @Put(':id')
  async updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.prisma.department.update({
      where: { id },
      data: dto,
      include: {
        head: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
    });
  }

  @Put(':id/head')
  async setDepartmentHead(
    @Param('id') id: string,
    @Body() dto: SetDepartmentHeadDto,
  ) {
    return this.prisma.department.update({
      where: { id },
      data: { headId: dto.headId },
      include: {
        head: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  @Delete(':id/head')
  async removeDepartmentHead(@Param('id') id: string) {
    return this.prisma.department.update({
      where: { id },
      data: { headId: null },
    });
  }

  @Get(':id/managers')
  async getDepartmentManagers(@Param('id') id: string) {
    const employees = await this.prisma.employee.findMany({
      where: { departmentId: id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    const managers = employees.filter((e) =>
      e.user.role === 'MANAGER' || e.user.role === 'ADMIN' || e.user.role === 'HR'
    );

    return managers.map((m) => ({
      id: m.user.id,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      email: m.user.email,
      jobTitle: m.jobTitle,
      role: m.user.role,
    }));
  }

  @Delete(':id')
  async deleteDepartment(@Param('id') id: string) {
    await this.prisma.department.delete({ where: { id } });
    return { deleted: true };
  }
}
