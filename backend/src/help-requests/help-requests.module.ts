import { Module } from '@nestjs/common';
import { HelpRequestsService } from './help-requests.service';
import { HelpRequestsController, AdminHelpRequestsController } from './help-requests.controller';

@Module({
  controllers: [HelpRequestsController, AdminHelpRequestsController],
  providers: [HelpRequestsService],
  exports: [HelpRequestsService],
})
export class HelpRequestsModule {}
