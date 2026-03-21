import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QdrantService } from '../../ai/qdrant.service';
import { ChunkingService } from '../services/chunking.service';
import * as cheerio from 'cheerio';

interface ConfluencePage {
  id: string;
  title: string;
  content: string;
  url: string;
  spaceKey: string;
}

interface ConfluenceConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

@Injectable()
export class ConfluenceConnector {
  private readonly logger = new Logger(ConfluenceConnector.name);

  constructor(
    private prisma: PrismaService,
    private qdrantService: QdrantService,
    private chunkingService: ChunkingService,
  ) {}

  async syncSpace(
    organizationId: string,
    name: string,
    config: ConfluenceConfig,
    spaceKey: string,
    category: string,
    options: { maxPages?: number; parentPageId?: string } = {},
  ) {
    const dataSource = await this.prisma.dataSource.create({
      data: {
        organizationId,
        name,
        type: 'CONFLUENCE',
        config: {
          baseUrl: config.baseUrl,
          spaceKey,
          category,
          status: 'syncing',
          startedAt: new Date().toISOString(),
        },
      },
    });

    this.syncInBackground(dataSource.id, organizationId, config, spaceKey, category, options);

    return {
      dataSourceId: dataSource.id,
      status: 'syncing',
      message: `Started syncing Confluence space: ${spaceKey}`,
    };
  }

  private async syncInBackground(
    dataSourceId: string,
    organizationId: string,
    config: ConfluenceConfig,
    spaceKey: string,
    category: string,
    options: { maxPages?: number; parentPageId?: string },
  ) {
    const maxPages = options.maxPages || 100;
    const pages: ConfluencePage[] = [];

    try {
      const authHeader = this.getAuthHeader(config.email, config.apiToken);

      if (options.parentPageId) {
        const childPages = await this.fetchChildPages(config.baseUrl, authHeader, options.parentPageId, maxPages);
        pages.push(...childPages);
      } else {
        const spacePages = await this.fetchSpacePages(config.baseUrl, authHeader, spaceKey, maxPages);
        pages.push(...spacePages);
      }

      await this.indexPages(dataSourceId, organizationId, category, pages);

      await this.prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
          lastSyncAt: new Date(),
          config: {
            baseUrl: config.baseUrl,
            spaceKey,
            category,
            status: 'completed',
            pagesIndexed: pages.length,
            completedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Confluence sync completed: ${pages.length} pages indexed`);
    } catch (error) {
      this.logger.error(`Confluence sync failed: ${error.message}`);

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

  private getAuthHeader(email: string, apiToken: string): string {
    const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private async fetchSpacePages(
    baseUrl: string,
    authHeader: string,
    spaceKey: string,
    maxPages: number,
  ): Promise<ConfluencePage[]> {
    const pages: ConfluencePage[] = [];
    let start = 0;
    const limit = 25;

    while (pages.length < maxPages) {
      const url = `${baseUrl}/wiki/rest/api/content?spaceKey=${spaceKey}&type=page&expand=body.storage&start=${start}&limit=${limit}`;

      const response = await fetch(url, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Confluence API error: ${response.status}`);
      }

      const data = await response.json();

      for (const result of data.results) {
        const content = this.parseConfluenceHtml(result.body?.storage?.value || '');

        if (content.length > 50) {
          pages.push({
            id: result.id,
            title: result.title,
            content,
            url: `${baseUrl}/wiki${result._links.webui}`,
            spaceKey,
          });
        }
      }

      if (data.results.length < limit) break;
      start += limit;
      await this.sleep(300);
    }

    return pages.slice(0, maxPages);
  }

  private async fetchChildPages(
    baseUrl: string,
    authHeader: string,
    parentPageId: string,
    maxPages: number,
  ): Promise<ConfluencePage[]> {
    const pages: ConfluencePage[] = [];

    const parentPage = await this.fetchPage(baseUrl, authHeader, parentPageId);
    if (parentPage) pages.push(parentPage);

    const children = await this.fetchPageChildren(baseUrl, authHeader, parentPageId);

    for (const child of children) {
      if (pages.length >= maxPages) break;

      const page = await this.fetchPage(baseUrl, authHeader, child.id);
      if (page) pages.push(page);

      const grandchildren = await this.fetchPageChildren(baseUrl, authHeader, child.id);
      for (const grandchild of grandchildren) {
        if (pages.length >= maxPages) break;
        const gpage = await this.fetchPage(baseUrl, authHeader, grandchild.id);
        if (gpage) pages.push(gpage);
      }

      await this.sleep(300);
    }

    return pages;
  }

  private async fetchPage(
    baseUrl: string,
    authHeader: string,
    pageId: string,
  ): Promise<ConfluencePage | null> {
    try {
      const url = `${baseUrl}/wiki/rest/api/content/${pageId}?expand=body.storage,space`;

      const response = await fetch(url, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      const content = this.parseConfluenceHtml(data.body?.storage?.value || '');

      if (content.length < 50) return null;

      return {
        id: data.id,
        title: data.title,
        content,
        url: `${baseUrl}/wiki${data._links.webui}`,
        spaceKey: data.space?.key || '',
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch page ${pageId}: ${error.message}`);
      return null;
    }
  }

  private async fetchPageChildren(
    baseUrl: string,
    authHeader: string,
    pageId: string,
  ): Promise<{ id: string; title: string }[]> {
    try {
      const url = `${baseUrl}/wiki/rest/api/content/${pageId}/child/page?limit=100`;

      const response = await fetch(url, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.results.map((r: any) => ({ id: r.id, title: r.title }));
    } catch {
      return [];
    }
  }

  private parseConfluenceHtml(html: string): string {
    if (!html) return '';

    const $ = cheerio.load(html);

    $('ac\\:structured-macro[ac\\:name="code"]').each((_, el) => {
      const code = $(el).find('ac\\:plain-text-body').text();
      $(el).replaceWith(`<pre><code>${code}</code></pre>`);
    });

    $('ac\\:structured-macro').remove();
    $('ac\\:parameter').remove();

    const text = $.text().replace(/\s+/g, ' ').trim();
    return text;
  }

  private async indexPages(
    dataSourceId: string,
    organizationId: string,
    category: string,
    pages: ConfluencePage[],
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
            confluencePageId: page.id,
            spaceKey: page.spaceKey,
            sourceUrl: page.url,
            syncedAt: new Date().toISOString(),
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
            confluencePageId: page.id,
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
