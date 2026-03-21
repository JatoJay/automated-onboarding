import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PlaywrightCrawlerService } from './services/playwright-crawler.service';
import { NotionConnector } from './connectors/notion.connector';
import { ConfluenceConnector } from './connectors/confluence.connector';
import { GitHubConnector } from './connectors/github.connector';
import { PlaywrightCrawlDto, NotionSyncDto, ConfluenceSyncDto, GitHubSyncDto } from './dto/connectors.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('connectors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/connectors')
export class ConnectorsController {
  constructor(
    private playwrightCrawler: PlaywrightCrawlerService,
    private notionConnector: NotionConnector,
    private confluenceConnector: ConfluenceConnector,
    private githubConnector: GitHubConnector,
  ) {}

  @Post('playwright/crawl')
  @ApiOperation({
    summary: 'Crawl docs using headless browser (for JS-rendered or protected sites)',
  })
  crawlWithPlaywright(
    @Param('organizationId') organizationId: string,
    @Body() dto: PlaywrightCrawlDto,
  ) {
    return this.playwrightCrawler.crawlAndIndex(
      organizationId,
      dto.name,
      dto.docsUrl,
      dto.category,
      {
        maxPages: dto.maxPages,
        maxDepth: dto.maxDepth,
        delay: dto.delay,
        waitForSelector: dto.waitForSelector,
        scrollToBottom: dto.scrollToBottom,
        includePatterns: dto.includePatterns,
        excludePatterns: dto.excludePatterns,
      },
    );
  }

  @Post('notion/sync')
  @ApiOperation({
    summary: 'Sync pages from Notion workspace',
  })
  syncNotion(
    @Param('organizationId') organizationId: string,
    @Body() dto: NotionSyncDto,
  ) {
    return this.notionConnector.syncWorkspace(
      organizationId,
      dto.name,
      dto.apiKey,
      dto.category,
      {
        pageIds: dto.pageIds,
        databaseIds: dto.databaseIds,
      },
    );
  }

  @Post('confluence/sync')
  @ApiOperation({
    summary: 'Sync pages from Confluence space',
  })
  syncConfluence(
    @Param('organizationId') organizationId: string,
    @Body() dto: ConfluenceSyncDto,
  ) {
    return this.confluenceConnector.syncSpace(
      organizationId,
      dto.name,
      {
        baseUrl: dto.baseUrl,
        email: dto.email,
        apiToken: dto.apiToken,
      },
      dto.spaceKey,
      dto.category,
      {
        maxPages: dto.maxPages,
        parentPageId: dto.parentPageId,
      },
    );
  }

  @Post('github/sync')
  @ApiOperation({
    summary: 'Sync code from a GitHub repository',
    description: 'Indexes code files from a GitHub repo for codebase Q&A',
  })
  syncGitHub(
    @Param('organizationId') organizationId: string,
    @Body() dto: GitHubSyncDto,
  ) {
    return this.githubConnector.syncRepository(
      organizationId,
      dto.name,
      dto.repoUrl,
      dto.accessToken,
      dto.category,
      {
        branch: dto.branch,
        maxFiles: dto.maxFiles,
        includePatterns: dto.includePatterns,
        excludePatterns: dto.excludePatterns,
        departmentId: dto.departmentId,
        isOrgWide: dto.isOrgWide,
      },
    );
  }

  @Get('github/:dataSourceId/status')
  @ApiOperation({ summary: 'Get GitHub sync status' })
  getGitHubStatus(@Param('dataSourceId') dataSourceId: string) {
    return this.githubConnector.getSyncStatus(dataSourceId);
  }

  @Post('github/:dataSourceId/resync')
  @ApiOperation({ summary: 'Resync GitHub repository' })
  resyncGitHub(
    @Param('dataSourceId') dataSourceId: string,
    @Body('accessToken') accessToken: string,
  ) {
    return this.githubConnector.resync(dataSourceId, accessToken);
  }
}
