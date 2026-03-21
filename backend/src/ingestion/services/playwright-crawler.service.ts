import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QdrantService } from '../../ai/qdrant.service';
import { ChunkingService } from './chunking.service';
import { chromium, Browser, Page } from 'playwright';

interface PlaywrightCrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  delay?: number;
  waitForSelector?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  scrollToBottom?: boolean;
  [key: string]: any;
}

interface CrawledPage {
  url: string;
  title: string;
  content: string;
  links: string[];
}

@Injectable()
export class PlaywrightCrawlerService implements OnModuleDestroy {
  private readonly logger = new Logger(PlaywrightCrawlerService.name);
  private browser: Browser | null = null;

  constructor(
    private prisma: PrismaService,
    private qdrantService: QdrantService,
    private chunkingService: ChunkingService,
  ) {}

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  async crawlAndIndex(
    organizationId: string,
    name: string,
    docsUrl: string,
    category: string,
    options: PlaywrightCrawlOptions = {},
  ) {
    const dataSource = await this.prisma.dataSource.create({
      data: {
        organizationId,
        name,
        type: 'EXTERNAL_DOCS_PLAYWRIGHT',
        config: {
          docsUrl,
          category,
          options,
          status: 'crawling',
          startedAt: new Date().toISOString(),
        },
      },
    });

    this.crawlInBackground(dataSource.id, organizationId, docsUrl, category, options);

    return {
      dataSourceId: dataSource.id,
      status: 'crawling',
      message: `Started browser-based crawling of ${docsUrl}. This may take several minutes.`,
    };
  }

  private async crawlInBackground(
    dataSourceId: string,
    organizationId: string,
    docsUrl: string,
    category: string,
    options: PlaywrightCrawlOptions,
  ) {
    const maxPages = options.maxPages || 50;
    const maxDepth = options.maxDepth || 3;
    const delay = options.delay || 2000;

    let browser: Browser | null = null;

    try {
      browser = await this.getBrowser();
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });

      const baseUrl = new URL(docsUrl);
      const visited = new Set<string>();
      const queue: { url: string; depth: number }[] = [{ url: docsUrl, depth: 0 }];
      const pages: CrawledPage[] = [];

      while (queue.length > 0 && pages.length < maxPages) {
        const { url, depth } = queue.shift()!;

        if (visited.has(url) || depth > maxDepth) continue;
        if (!this.shouldCrawl(url, baseUrl.origin, options)) continue;

        visited.add(url);

        try {
          const page = await this.fetchPageWithBrowser(context, url, options);
          if (page && page.content.length > 100) {
            pages.push(page);
            this.logger.log(`Crawled (${pages.length}/${maxPages}): ${url}`);

            for (const link of page.links) {
              if (!visited.has(link) && link.startsWith(baseUrl.origin)) {
                queue.push({ url: link, depth: depth + 1 });
              }
            }
          }

          await this.sleep(delay);
        } catch (error) {
          this.logger.warn(`Failed to crawl ${url}: ${error.message}`);
        }
      }

      await context.close();
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

  private async fetchPageWithBrowser(
    context: any,
    url: string,
    options: PlaywrightCrawlOptions,
  ): Promise<CrawledPage | null> {
    const page: Page = await context.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 }).catch(() => {});
      }

      if (options.scrollToBottom) {
        await this.autoScroll(page);
      }

      await page.waitForTimeout(1000);

      const result = await page.evaluate(() => {
        const removeSelectors = [
          'script',
          'style',
          'nav',
          'footer',
          'header',
          'aside',
          '.sidebar',
          '.nav',
          '.menu',
          '.advertisement',
          '.cookie-banner',
          '.modal',
          '#cookie-consent',
        ];

        removeSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((el) => el.remove());
        });

        const title =
          document.querySelector('h1')?.textContent?.trim() ||
          document.title ||
          'Untitled';

        const mainContent =
          document.querySelector('main')?.textContent ||
          document.querySelector('article')?.textContent ||
          document.querySelector('[role="main"]')?.textContent ||
          document.querySelector('.content')?.textContent ||
          document.querySelector('.documentation')?.textContent ||
          document.body.textContent ||
          '';

        const content = mainContent.replace(/\s+/g, ' ').trim();

        const links: string[] = [];
        document.querySelectorAll('a[href]').forEach((a) => {
          const href = a.getAttribute('href');
          if (href) {
            try {
              const absoluteUrl = new URL(href, window.location.href).href
                .split('#')[0]
                .split('?')[0];
              if (!links.includes(absoluteUrl)) {
                links.push(absoluteUrl);
              }
            } catch {}
          }
        });

        return { title, content, links };
      });

      await page.close();

      return {
        url,
        title: result.title,
        content: result.content,
        links: result.links,
      };
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  private async autoScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(timer);
          resolve();
        }, 10000);
      });
    });
  }

  private shouldCrawl(url: string, origin: string, options: PlaywrightCrawlOptions): boolean {
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

    const skipPaths = ['/api/', '/auth/', '/login', '/signup', '/pricing'];
    if (skipPaths.some((p) => path.toLowerCase().includes(p))) return false;

    return true;
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
            crawlerType: 'playwright',
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
