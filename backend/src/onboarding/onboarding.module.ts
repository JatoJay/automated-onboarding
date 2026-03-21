import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { EmployeeManagementController } from './employees.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OnboardingController, TasksController, EmployeeManagementController],
  providers: [OnboardingService, TasksService],
  exports: [OnboardingService, TasksService],
})
export class OnboardingModule {}
