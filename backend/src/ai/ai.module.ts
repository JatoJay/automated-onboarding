import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { QdrantService } from './qdrant.service';
import { MemoryService } from './memory.service';
import { GeminiService } from './gemini.service';

@Module({
  controllers: [AiController],
  providers: [GeminiService, QdrantService, MemoryService, AiService],
  exports: [AiService, QdrantService, GeminiService],
})
export class AiModule {}
