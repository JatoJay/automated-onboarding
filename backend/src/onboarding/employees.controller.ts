import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { IsString, IsArray, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  departmentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiProperty({ example: 'Software Engineer' })
  @IsString()
  jobTitle: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Additional department IDs employee can access' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accessibleDepartmentIds?: string[];
}

class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobTitle?: string;
}

class UpdateDepartmentAccessDto {
  @ApiProperty({ description: 'Department IDs to grant access to' })
  @IsArray()
  @IsString({ each: true })
  departmentIds: string[];
}

@ApiTags('employee-management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/employees')
export class EmployeeManagementController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async listEmployees(
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
  ) {
    return this.prisma.employee.findMany({
      where: {
        ...(departmentId && { departmentId }),
        ...(status && { onboardingStatus: status as any }),
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
        department: { select: { id: true, name: true } },
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        departmentAccess: {
          include: { department: { select: { id: true, name: true } } },
        },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('users/available')
  async getAvailableUsers() {
    return this.prisma.user.findMany({
      where: {
        employee: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  async getEmployee(@Param('id') id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
        department: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        departmentAccess: {
          include: { department: { select: { id: true, name: true } } },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  @Get(':id/accessible-departments')
  async getAccessibleDepartments(@Param('id') id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        departmentAccess: {
          include: { department: { select: { id: true, name: true } } },
        },
      },
    });

    if (!employee) return [];

    const departments = [
      { ...employee.department, isPrimary: true },
      ...employee.departmentAccess.map((a) => ({ ...a.department, isPrimary: false })),
    ];

    return departments;
  }

  @Post()
  async createEmployee(@Body() dto: CreateEmployeeDto, @Request() req: any) {
    const employee = await this.prisma.employee.create({
      data: {
        userId: dto.userId,
        departmentId: dto.departmentId,
        managerId: dto.managerId,
        jobTitle: dto.jobTitle,
        startDate: new Date(dto.startDate),
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (dto.accessibleDepartmentIds?.length) {
      await this.prisma.employeeDepartmentAccess.createMany({
        data: dto.accessibleDepartmentIds
          .filter((deptId) => deptId !== dto.departmentId)
          .map((departmentId) => ({
            employeeId: employee.id,
            departmentId,
            grantedById: req.user.id,
          })),
        skipDuplicates: true,
      });
    }

    return this.getEmployee(employee.id);
  }

  @Put(':id')
  async updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.departmentId && { departmentId: dto.departmentId }),
        ...(dto.managerId !== undefined && { managerId: dto.managerId || null }),
        ...(dto.jobTitle && { jobTitle: dto.jobTitle }),
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        department: { select: { id: true, name: true } },
      },
    });
  }

  @Put(':id/department-access')
  async updateDepartmentAccess(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentAccessDto,
    @Request() req: any,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { departmentId: true },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    await this.prisma.employeeDepartmentAccess.deleteMany({
      where: { employeeId: id },
    });

    const additionalDepts = dto.departmentIds.filter(
      (deptId) => deptId !== employee.departmentId,
    );

    if (additionalDepts.length > 0) {
      await this.prisma.employeeDepartmentAccess.createMany({
        data: additionalDepts.map((departmentId) => ({
          employeeId: id,
          departmentId,
          grantedById: req.user.id,
        })),
      });
    }

    return this.getAccessibleDepartments(id);
  }

  @Post(':id/grant-access/:departmentId')
  async grantDepartmentAccess(
    @Param('id') employeeId: string,
    @Param('departmentId') departmentId: string,
    @Request() req: any,
  ) {
    await this.prisma.employeeDepartmentAccess.upsert({
      where: {
        employeeId_departmentId: { employeeId, departmentId },
      },
      create: {
        employeeId,
        departmentId,
        grantedById: req.user.id,
      },
      update: {},
    });

    return this.getAccessibleDepartments(employeeId);
  }

  @Delete(':id/revoke-access/:departmentId')
  async revokeDepartmentAccess(
    @Param('id') employeeId: string,
    @Param('departmentId') departmentId: string,
  ) {
    await this.prisma.employeeDepartmentAccess.deleteMany({
      where: { employeeId, departmentId },
    });

    return this.getAccessibleDepartments(employeeId);
  }

  @Delete(':id')
  async deleteEmployee(@Param('id') id: string) {
    await this.prisma.employee.delete({ where: { id } });
    return { deleted: true };
  }
}
