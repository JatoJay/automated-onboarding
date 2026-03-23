import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AiModule } from './ai/ai.module';
import { WorkflowModule } from './workflow/workflow.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { DepartmentsModule } from './departments/departments.module';
import { FormsModule } from './forms/forms.module';
import { HelpRequestsModule } from './help-requests/help-requests.module';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    OnboardingModule,
    AiModule,
    WorkflowModule,
    IntegrationsModule,
    IngestionModule,
    DepartmentsModule,
    FormsModule,
    HelpRequestsModule,
  ],
})
export class AppModule {}
