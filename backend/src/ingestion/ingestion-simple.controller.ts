import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { IngestionService } from './services/ingestion.service';
import { DocsCrawlerService } from './services/docs-crawler.service';
import { PlaywrightCrawlerService } from './services/playwright-crawler.service';
import { NotionConnector } from './connectors/notion.connector';
import { ConfluenceConnector } from './connectors/confluence.connector';
import { GitHubConnector } from './connectors/github.connector';
import { UploadDocumentDto, UploadFromUrlDto, BulkUploadDto } from './dto/upload-document.dto';
import { CrawlDocsDto, CrawlSitemapDto } from './dto/crawl-docs.dto';
import { PlaywrightCrawlDto, NotionSyncDto, ConfluenceSyncDto, GitHubSyncDto } from './dto/connectors.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class IngestionSimpleController {
  private readonly defaultOrgId: string;

  constructor(
    private ingestionService: IngestionService,
    private crawlerService: DocsCrawlerService,
    private playwrightCrawler: PlaywrightCrawlerService,
    private notionConnector: NotionConnector,
    private confluenceConnector: ConfluenceConnector,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.defaultOrgId = this.configService.get<string>('DEFAULT_ORG_ID') || 'default';
  }

  private async getOrgId(): Promise<string> {
    let org = await this.prisma.organization.findFirst();
    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          name: 'Default Organization',
          slug: 'default',
        },
      });
    }
    return org.id;
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: { type: 'string' },
        title: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown',
          'text/html',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
        }
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const orgId = await this.getOrgId();
    return this.ingestionService.uploadDocument(
      orgId,
      file,
      dto.category,
      dto.title,
      dto.departmentId,
      dto.isOrgWide,
    );
  }

  @Post('upload-url')
  async uploadFromUrl(@Body() dto: UploadFromUrlDto) {
    const orgId = await this.getOrgId();
    return this.ingestionService.uploadFromUrl(
      orgId,
      dto.url,
      dto.category,
      dto.title,
      dto.departmentId,
      dto.isOrgWide,
    );
  }

  @Post('bulk')
  async bulkUpload(@Body() dto: BulkUploadDto) {
    const orgId = await this.getOrgId();
    return this.ingestionService.bulkUpload(orgId, dto.documents);
  }

  @Get()
  async listDocuments(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
    @Query('includeOrgWide') includeOrgWide?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = await this.getOrgId();
    return this.ingestionService.listDocuments(orgId, {
      category,
      status: status as any,
      departmentId,
      includeOrgWide: includeOrgWide !== 'false',
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('categories')
  async getCategories() {
    const orgId = await this.getOrgId();
    return this.ingestionService.getCategories(orgId);
  }

  @Get(':documentId/status')
  getDocumentStatus(@Param('documentId') documentId: string) {
    return this.ingestionService.getDocumentStatus(documentId);
  }

  @Post(':documentId/reindex')
  reindexDocument(@Param('documentId') documentId: string) {
    return this.ingestionService.reindexDocument(documentId);
  }

  @Delete(':documentId')
  deleteDocument(@Param('documentId') documentId: string) {
    return this.ingestionService.deleteDocument(documentId);
  }
}

@ApiTags('external-docs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('external-docs')
export class ExternalDocsSimpleController {
  constructor(
    private crawlerService: DocsCrawlerService,
    private prisma: PrismaService,
  ) {}

  private async getOrgId(): Promise<string> {
    let org = await this.prisma.organization.findFirst();
    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          name: 'Default Organization',
          slug: 'default',
        },
      });
    }
    return org.id;
  }

  @Post('crawl')
  async crawlDocs(@Body() dto: CrawlDocsDto) {
    const orgId = await this.getOrgId();
    return this.crawlerService.crawlAndIndex(orgId, dto.name, dto.docsUrl, dto.category, {
      maxPages: dto.maxPages,
      maxDepth: dto.maxDepth,
      delay: dto.delay,
      includePatterns: dto.includePatterns,
      excludePatterns: dto.excludePatterns,
    });
  }

  @Post('crawl-sitemap')
  async crawlSitemap(@Body() dto: CrawlSitemapDto) {
    const orgId = await this.getOrgId();
    return this.crawlerService.crawlFromSitemap(orgId, dto.name, dto.sitemapUrl, dto.category, {
      maxPages: dto.maxPages,
      delay: dto.delay,
    });
  }

  @Get()
  async listDataSources() {
    const orgId = await this.getOrgId();
    const sources = await this.prisma.dataSource.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { knowledgeDocuments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      type: source.type,
      config: source.config,
      documentsCount: source._count.knowledgeDocuments,
      lastSyncAt: source.lastSyncAt,
      createdAt: source.createdAt,
    }));
  }

  @Get(':dataSourceId/status')
  getCrawlStatus(@Param('dataSourceId') dataSourceId: string) {
    return this.crawlerService.getCrawlStatus(dataSourceId);
  }

  @Post(':dataSourceId/resync')
  resync(@Param('dataSourceId') dataSourceId: string) {
    return this.crawlerService.resync(dataSourceId);
  }

  @Delete(':dataSourceId')
  async deleteDataSource(@Param('dataSourceId') dataSourceId: string) {
    await this.prisma.knowledgeDocument.deleteMany({ where: { dataSourceId } });
    await this.prisma.dataSource.delete({ where: { id: dataSourceId } });
    return { deleted: true };
  }
}

@ApiTags('connectors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('connectors')
export class ConnectorsSimpleController {
  constructor(
    private playwrightCrawler: PlaywrightCrawlerService,
    private notionConnector: NotionConnector,
    private confluenceConnector: ConfluenceConnector,
    private githubConnector: GitHubConnector,
    private prisma: PrismaService,
  ) {}

  private async getOrgId(): Promise<string> {
    let org = await this.prisma.organization.findFirst();
    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          name: 'Default Organization',
          slug: 'default',
        },
      });
    }
    return org.id;
  }

  @Post('playwright/crawl')
  async crawlWithPlaywright(@Body() dto: PlaywrightCrawlDto) {
    const orgId = await this.getOrgId();
    return this.playwrightCrawler.crawlAndIndex(orgId, dto.name, dto.docsUrl, dto.category, {
      maxPages: dto.maxPages,
      maxDepth: dto.maxDepth,
      delay: dto.delay,
      waitForSelector: dto.waitForSelector,
      scrollToBottom: dto.scrollToBottom,
      includePatterns: dto.includePatterns,
      excludePatterns: dto.excludePatterns,
    });
  }

  @Post('notion/sync')
  async syncNotion(@Body() dto: NotionSyncDto) {
    const orgId = await this.getOrgId();
    return this.notionConnector.syncWorkspace(orgId, dto.name, dto.apiKey, dto.category, {
      pageIds: dto.pageIds,
      databaseIds: dto.databaseIds,
    });
  }

  @Post('confluence/sync')
  async syncConfluence(@Body() dto: ConfluenceSyncDto) {
    const orgId = await this.getOrgId();
    return this.confluenceConnector.syncSpace(
      orgId,
      dto.name,
      { baseUrl: dto.baseUrl, email: dto.email, apiToken: dto.apiToken },
      dto.spaceKey,
      dto.category,
      { maxPages: dto.maxPages, parentPageId: dto.parentPageId },
    );
  }

  @Post('github/sync')
  async syncGitHub(@Body() dto: GitHubSyncDto) {
    const orgId = await this.getOrgId();
    return this.githubConnector.syncRepository(
      orgId,
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
  getGitHubStatus(@Param('dataSourceId') dataSourceId: string) {
    return this.githubConnector.getSyncStatus(dataSourceId);
  }

  @Post('github/:dataSourceId/resync')
  resyncGitHub(
    @Param('dataSourceId') dataSourceId: string,
    @Body('accessToken') accessToken: string,
  ) {
    return this.githubConnector.resync(dataSourceId, accessToken);
  }
}
