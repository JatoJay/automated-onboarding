import { Controller, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';

@ApiTags('cron')
@Controller('cron')
export class CronController {
  constructor(
    private workflowService: WorkflowService,
    private configService: ConfigService,
  ) {}

  @Post('send-task-reminders')
  async sendTaskReminders(@Headers('x-cron-secret') secret: string) {
    const expectedSecret = this.configService.get<string>('CRON_SECRET');
    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    return this.workflowService.sendTaskReminders();
  }
}
