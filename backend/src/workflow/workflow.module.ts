import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { CronController } from './cron.controller';
import { WorkflowService } from './workflow.service';

@Module({
  controllers: [WorkflowController, CronController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
