import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DocsCrawlerService } from './services/docs-crawler.service';
import { CrawlDocsDto, CrawlSitemapDto } from './dto/crawl-docs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('docs-crawler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/external-docs')
export class DocsCrawlerController {
  constructor(
    private crawlerService: DocsCrawlerService,
    private prisma: PrismaService,
  ) {}

  @Post('crawl')
  @ApiOperation({ summary: 'Crawl and index external documentation from a URL' })
  crawlDocs(
    @Param('organizationId') organizationId: string,
    @Body() dto: CrawlDocsDto,
  ) {
    return this.crawlerService.crawlAndIndex(
      organizationId,
      dto.name,
      dto.docsUrl,
      dto.category,
      {
        maxPages: dto.maxPages,
        maxDepth: dto.maxDepth,
        delay: dto.delay,
        includePatterns: dto.includePatterns,
        excludePatterns: dto.excludePatterns,
      },
    );
  }

  @Post('crawl-sitemap')
  @ApiOperation({ summary: 'Crawl documentation from a sitemap.xml' })
  crawlSitemap(
    @Param('organizationId') organizationId: string,
    @Body() dto: CrawlSitemapDto,
  ) {
    return this.crawlerService.crawlFromSitemap(
      organizationId,
      dto.name,
      dto.sitemapUrl,
      dto.category,
      {
        maxPages: dto.maxPages,
        delay: dto.delay,
      },
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all external documentation sources' })
  async listDataSources(@Param('organizationId') organizationId: string) {
    const sources = await this.prisma.dataSource.findMany({
      where: {
        organizationId,
        type: 'EXTERNAL_DOCS',
      },
      include: {
        _count: {
          select: { knowledgeDocuments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      config: source.config,
      documentsCount: source._count.knowledgeDocuments,
      lastSyncAt: source.lastSyncAt,
      createdAt: source.createdAt,
    }));
  }

  @Get(':dataSourceId/status')
  @ApiOperation({ summary: 'Get crawl status for a data source' })
  async getCrawlStatus(@Param('dataSourceId') dataSourceId: string) {
    const status = await this.crawlerService.getCrawlStatus(dataSourceId);
    if (!status) {
      throw new NotFoundException('Data source not found');
    }
    return status;
  }

  @Post(':dataSourceId/resync')
  @ApiOperation({ summary: 'Re-crawl and reindex a data source' })
  resync(@Param('dataSourceId') dataSourceId: string) {
    return this.crawlerService.resync(dataSourceId);
  }

  @Delete(':dataSourceId')
  @ApiOperation({ summary: 'Delete a data source and all its documents' })
  async deleteDataSource(@Param('dataSourceId') dataSourceId: string) {
    await this.prisma.knowledgeDocument.deleteMany({
      where: { dataSourceId },
    });

    await this.prisma.dataSource.delete({
      where: { id: dataSourceId },
    });

    return { deleted: true };
  }
}
