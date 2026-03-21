import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

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
}
