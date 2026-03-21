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
        _count: {
          select: {
            employees: true,
            knowledgeDocuments: true,
            dataSources: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get(':id')
  async getDepartment(@Param('id') id: string) {
    return this.prisma.department.findUnique({
      where: { id },
      include: {
        employees: {
          include: {
            user: {
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
    });
  }

  @Delete(':id')
  async deleteDepartment(@Param('id') id: string) {
    await this.prisma.department.delete({ where: { id } });
    return { deleted: true };
  }
}
