import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { DocsCrawlerController } from './docs-crawler.controller';
import { ConnectorsController } from './connectors.controller';
import {
  IngestionSimpleController,
  ExternalDocsSimpleController,
  ConnectorsSimpleController,
} from './ingestion-simple.controller';
import { IngestionService } from './services/ingestion.service';
import { DocumentParserService } from './services/document-parser.service';
import { ChunkingService } from './services/chunking.service';
import { DocsCrawlerService } from './services/docs-crawler.service';
import { PlaywrightCrawlerService } from './services/playwright-crawler.service';
import { NotionConnector } from './connectors/notion.connector';
import { ConfluenceConnector } from './connectors/confluence.connector';
import { GitHubConnector } from './connectors/github.connector';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [
    IngestionSimpleController,
    ExternalDocsSimpleController,
    ConnectorsSimpleController,
    IngestionController,
    DocsCrawlerController,
    ConnectorsController,
  ],
  providers: [
    IngestionService,
    DocumentParserService,
    ChunkingService,
    DocsCrawlerService,
    PlaywrightCrawlerService,
    NotionConnector,
    ConfluenceConnector,
    GitHubConnector,
  ],
  exports: [IngestionService, DocsCrawlerService, PlaywrightCrawlerService, GitHubConnector],
})
export class IngestionModule {}
