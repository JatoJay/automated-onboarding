import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QdrantService } from '../../ai/qdrant.service';
import { ChunkingService } from './chunking.service';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';

interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  delay?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  [key: string]: any;
}

interface CrawledPage {
  url: string;
  title: string;
  content: string;
  links: string[];
}

@Injectable()
export class DocsCrawlerService {
  private readonly logger = new Logger(DocsCrawlerService.name);

  constructor(
    private prisma: PrismaService,
    private qdrantService: QdrantService,
    private chunkingService: ChunkingService,
  ) {}

  async crawlAndIndex(
    organizationId: string,
    name: string,
    docsUrl: string,
    category: string,
    options: CrawlOptions = {},
  ) {
    const maxPages = options.maxPages || 100;
    const maxDepth = options.maxDepth || 3;
    const delay = options.delay || 500;

    const dataSource = await this.prisma.dataSource.create({
      data: {
        organizationId,
        name,
        type: 'EXTERNAL_DOCS',
        config: {
          docsUrl,
          category,
          options,
          status: 'crawling',
          startedAt: new Date().toISOString(),
        },
      },
    });

    this.crawlInBackground(dataSource.id, organizationId, docsUrl, category, {
      maxPages,
      maxDepth,
      delay,
      ...options,
    });

    return {
      dataSourceId: dataSource.id,
      status: 'crawling',
      message: `Started crawling ${docsUrl}. This may take a few minutes.`,
    };
  }

  private async crawlInBackground(
    dataSourceId: string,
    organizationId: string,
    docsUrl: string,
    category: string,
    options: CrawlOptions,
  ) {
    try {
      const baseUrl = new URL(docsUrl);
      const robotsTxt = await this.fetchRobotsTxt(baseUrl.origin);
      const robots = robotsParser(baseUrl.origin + '/robots.txt', robotsTxt);

      const visited = new Set<string>();
      const queue: { url: string; depth: number }[] = [{ url: docsUrl, depth: 0 }];
      const pages: CrawledPage[] = [];

      while (queue.length > 0 && pages.length < (options.maxPages || 100)) {
        const { url, depth } = queue.shift()!;

        if (visited.has(url) || depth > (options.maxDepth || 3)) continue;
        if (!robots.isAllowed(url, 'OnboardingBot')) {
          this.logger.log(`Robots.txt disallows: ${url}`);
          continue;
        }
        if (!this.shouldCrawl(url, baseUrl.origin, options)) continue;

        visited.add(url);

        try {
          const page = await this.fetchAndParsePage(url);
          if (page && page.content.length > 100) {
            pages.push(page);
            this.logger.log(`Crawled (${pages.length}): ${url}`);

            for (const link of page.links) {
              if (!visited.has(link) && link.startsWith(baseUrl.origin)) {
                queue.push({ url: link, depth: depth + 1 });
              }
            }
          }

          await this.sleep(options.delay || 500);
        } catch (error) {
          this.logger.warn(`Failed to crawl ${url}: ${error.message}`);
        }
      }

      await this.indexPages(dataSourceId, organizationId, category, pages);

      await this.prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
          lastSyncAt: new Date(),
          config: {
            docsUrl,
            category,
            options,
            status: 'completed',
            pagesIndexed: pages.length,
            completedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Completed crawling ${docsUrl}: ${pages.length} pages indexed`);
    } catch (error) {
      this.logger.error(`Crawl failed for ${docsUrl}: ${error.message}`);

      await this.prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
          config: {
            status: 'failed',
            error: error.message,
            failedAt: new Date().toISOString(),
          },
        },
      });
    }
  }

  private async fetchRobotsTxt(origin: string): Promise<string> {
    try {
      const response = await fetch(`${origin}/robots.txt`);
      if (response.ok) {
        return await response.text();
      }
    } catch {
      // No robots.txt, allow all
    }
    return '';
  }

  private shouldCrawl(url: string, origin: string, options: CrawlOptions): boolean {
    if (!url.startsWith(origin)) return false;

    const path = url.replace(origin, '');

    if (options.excludePatterns) {
      for (const pattern of options.excludePatterns) {
        if (new RegExp(pattern).test(path)) return false;
      }
    }

    if (options.includePatterns && options.includePatterns.length > 0) {
      for (const pattern of options.includePatterns) {
        if (new RegExp(pattern).test(path)) return true;
      }
      return false;
    }

    const skipExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf', '.zip', '.css', '.js'];
    if (skipExtensions.some((ext) => path.toLowerCase().endsWith(ext))) return false;

    const skipPaths = ['/api/', '/auth/', '/login', '/signup', '/pricing', '/blog/'];
    if (skipPaths.some((p) => path.toLowerCase().includes(p))) return false;

    return true;
  }

  private async fetchAndParsePage(url: string): Promise<CrawledPage | null> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OnboardingBot/1.0 (Documentation Indexer)',
        Accept: 'text/html',
      },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    $('script, style, nav, footer, header, aside, .sidebar, .nav, .menu, .advertisement').remove();

    const title =
      $('h1').first().text().trim() ||
      $('title').text().trim() ||
      url.split('/').pop() ||
      'Untitled';

    const mainContent =
      $('main').text() ||
      $('article').text() ||
      $('[role="main"]').text() ||
      $('.content').text() ||
      $('.documentation').text() ||
      $('body').text();

    const content = mainContent.replace(/\s+/g, ' ').trim();

    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, url).href.split('#')[0].split('?')[0];
          if (!links.includes(absoluteUrl)) {
            links.push(absoluteUrl);
          }
        } catch {
          // Invalid URL
        }
      }
    });

    return { url, title, content, links };
  }

  private async indexPages(
    dataSourceId: string,
    organizationId: string,
    category: string,
    pages: CrawledPage[],
  ) {
    for (const page of pages) {
      const document = await this.prisma.knowledgeDocument.create({
        data: {
          organizationId,
          dataSourceId,
          title: page.title,
          content: page.content.substring(0, 10000),
          category,
          documentType: 'HTML',
          status: 'PROCESSING',
          fileUrl: page.url,
          metadata: {
            sourceUrl: page.url,
            crawledAt: new Date().toISOString(),
          },
        },
      });

      const chunks = this.chunkingService.chunkByParagraph(page.content);

      for (const chunk of chunks) {
        const savedChunk = await this.prisma.documentChunk.create({
          data: {
            documentId: document.id,
            content: chunk.content,
            chunkIndex: chunk.index,
            tokenCount: chunk.tokenCount,
            metadata: {
              documentTitle: page.title,
              sourceUrl: page.url,
              category,
              organizationId,
            },
          },
        });

        const qdrantId = `${document.id}_${chunk.index}`;

        await this.qdrantService.upsertDocument({
          id: qdrantId,
          title: page.title,
          content: chunk.content,
          category,
          metadata: {
            documentId: document.id,
            chunkIndex: chunk.index,
            organizationId,
            sourceUrl: page.url,
            dataSourceId,
          },
        });

        await this.prisma.documentChunk.update({
          where: { id: savedChunk.id },
          data: { qdrantId },
        });
      }

      await this.prisma.knowledgeDocument.update({
        where: { id: document.id },
        data: {
          status: 'INDEXED',
          chunkCount: chunks.length,
        },
      });
    }
  }

  async getSitemapUrls(sitemapUrl: string): Promise<string[]> {
    try {
      const response = await fetch(sitemapUrl);
      if (!response.ok) return [];

      const xml = await response.text();
      const $ = cheerio.load(xml, { xmlMode: true });

      const urls: string[] = [];

      $('url loc').each((_, el) => {
        urls.push($(el).text());
      });

      $('sitemap loc').each((_, el) => {
        // Nested sitemaps - would need recursive fetching
        this.logger.log(`Found nested sitemap: ${$(el).text()}`);
      });

      return urls;
    } catch (error) {
      this.logger.warn(`Failed to fetch sitemap: ${error.message}`);
      return [];
    }
  }

  async crawlFromSitemap(
    organizationId: string,
    name: string,
    sitemapUrl: string,
    category: string,
    options: CrawlOptions = {},
  ) {
    const urls = await this.getSitemapUrls(sitemapUrl);

    if (urls.length === 0) {
      throw new Error('No URLs found in sitemap');
    }

    const docsUrl = new URL(sitemapUrl).origin;

    const dataSource = await this.prisma.dataSource.create({
      data: {
        organizationId,
        name,
        type: 'EXTERNAL_DOCS',
        config: {
          sitemapUrl,
          docsUrl,
          category,
          options,
          status: 'crawling',
          totalUrls: urls.length,
          startedAt: new Date().toISOString(),
        },
      },
    });

    this.crawlUrlsInBackground(dataSource.id, organizationId, category, urls, options);

    return {
      dataSourceId: dataSource.id,
      status: 'crawling',
      urlsFound: urls.length,
      message: `Started crawling ${urls.length} URLs from sitemap.`,
    };
  }

  private async crawlUrlsInBackground(
    dataSourceId: string,
    organizationId: string,
    category: string,
    urls: string[],
    options: CrawlOptions,
  ) {
    const maxPages = options.maxPages || urls.length;
    const pages: CrawledPage[] = [];

    for (const url of urls.slice(0, maxPages)) {
      try {
        const page = await this.fetchAndParsePage(url);
        if (page && page.content.length > 100) {
          pages.push(page);
          this.logger.log(`Crawled (${pages.length}/${maxPages}): ${url}`);
        }
        await this.sleep(options.delay || 500);
      } catch (error) {
        this.logger.warn(`Failed to crawl ${url}: ${error.message}`);
      }
    }

    await this.indexPages(dataSourceId, organizationId, category, pages);

    await this.prisma.dataSource.update({
      where: { id: dataSourceId },
      data: {
        lastSyncAt: new Date(),
        config: {
          status: 'completed',
          pagesIndexed: pages.length,
          completedAt: new Date().toISOString(),
        },
      },
    });
  }

  async getCrawlStatus(dataSourceId: string) {
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { id: dataSourceId },
      include: {
        _count: {
          select: { knowledgeDocuments: true },
        },
      },
    });

    if (!dataSource) return null;

    const config = dataSource.config as any;

    return {
      id: dataSource.id,
      name: dataSource.name,
      status: config?.status || 'unknown',
      pagesIndexed: dataSource._count.knowledgeDocuments,
      lastSyncAt: dataSource.lastSyncAt,
      error: config?.error,
    };
  }

  async resync(dataSourceId: string) {
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { id: dataSourceId },
    });

    if (!dataSource) throw new Error('DataSource not found');

    const config = dataSource.config as any;

    await this.prisma.knowledgeDocument.deleteMany({
      where: { dataSourceId },
    });

    await this.qdrantService.deleteByDocumentId(dataSourceId);

    if (config.sitemapUrl) {
      return this.crawlFromSitemap(
        dataSource.organizationId,
        dataSource.name,
        config.sitemapUrl,
        config.category,
        config.options,
      );
    }

    return this.crawlAndIndex(
      dataSource.organizationId,
      dataSource.name,
      config.docsUrl,
      config.category,
      config.options,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
