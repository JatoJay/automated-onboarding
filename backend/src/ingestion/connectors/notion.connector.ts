import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QdrantService } from '../../ai/qdrant.service';
import { ChunkingService } from '../services/chunking.service';

interface NotionBlock {
  id: string;
  type: string;
  [key: string]: any;
}

interface NotionPage {
  id: string;
  title: string;
  content: string;
  url: string;
}

@Injectable()
export class NotionConnector {
  private readonly logger = new Logger(NotionConnector.name);
  private readonly baseUrl = 'https://api.notion.com/v1';

  constructor(
    private prisma: PrismaService,
    private qdrantService: QdrantService,
    private chunkingService: ChunkingService,
  ) {}

  async syncWorkspace(
    organizationId: string,
    name: string,
    apiKey: string,
    category: string,
    options: { pageIds?: string[]; databaseIds?: string[] } = {},
  ) {
    const dataSource = await this.prisma.dataSource.create({
      data: {
        organizationId,
        name,
        type: 'NOTION',
        config: {
          category,
          status: 'syncing',
          startedAt: new Date().toISOString(),
        },
      },
    });

    this.syncInBackground(dataSource.id, organizationId, apiKey, category, options);

    return {
      dataSourceId: dataSource.id,
      status: 'syncing',
      message: 'Started syncing Notion workspace.',
    };
  }

  private async syncInBackground(
    dataSourceId: string,
    organizationId: string,
    apiKey: string,
    category: string,
    options: { pageIds?: string[]; databaseIds?: string[] },
  ) {
    try {
      const pages: NotionPage[] = [];

      if (options.pageIds && options.pageIds.length > 0) {
        for (const pageId of options.pageIds) {
          const page = await this.fetchPage(apiKey, pageId);
          if (page) pages.push(page);
        }
      }

      if (options.databaseIds && options.databaseIds.length > 0) {
        for (const databaseId of options.databaseIds) {
          const dbPages = await this.fetchDatabasePages(apiKey, databaseId);
          pages.push(...dbPages);
        }
      }

      if (!options.pageIds && !options.databaseIds) {
        const searchResults = await this.searchAllPages(apiKey);
        pages.push(...searchResults);
      }

      await this.indexPages(dataSourceId, organizationId, category, pages);

      await this.prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
          lastSyncAt: new Date(),
          config: {
            category,
            status: 'completed',
            pagesIndexed: pages.length,
            completedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Notion sync completed: ${pages.length} pages indexed`);
    } catch (error) {
      this.logger.error(`Notion sync failed: ${error.message}`);

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

  private async fetchPage(apiKey: string, pageId: string): Promise<NotionPage | null> {
    try {
      const pageResponse = await fetch(`${this.baseUrl}/pages/${pageId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
        },
      });

      if (!pageResponse.ok) {
        this.logger.warn(`Failed to fetch page ${pageId}: ${pageResponse.status}`);
        return null;
      }

      const pageData = await pageResponse.json();
      const title = this.extractTitle(pageData);

      const blocksResponse = await fetch(`${this.baseUrl}/blocks/${pageId}/children?page_size=100`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
        },
      });

      if (!blocksResponse.ok) {
        return null;
      }

      const blocksData = await blocksResponse.json();
      const content = this.extractBlocksContent(blocksData.results);

      return {
        id: pageId,
        title,
        content,
        url: pageData.url || `https://notion.so/${pageId.replace(/-/g, '')}`,
      };
    } catch (error) {
      this.logger.warn(`Error fetching page ${pageId}: ${error.message}`);
      return null;
    }
  }

  private async fetchDatabasePages(apiKey: string, databaseId: string): Promise<NotionPage[]> {
    const pages: NotionPage[] = [];

    try {
      let hasMore = true;
      let startCursor: string | undefined;

      while (hasMore) {
        const response = await fetch(`${this.baseUrl}/databases/${databaseId}/query`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            page_size: 100,
            start_cursor: startCursor,
          }),
        });

        if (!response.ok) break;

        const data = await response.json();

        for (const result of data.results) {
          const page = await this.fetchPage(apiKey, result.id);
          if (page) pages.push(page);
          await this.sleep(300);
        }

        hasMore = data.has_more;
        startCursor = data.next_cursor;
      }
    } catch (error) {
      this.logger.warn(`Error fetching database ${databaseId}: ${error.message}`);
    }

    return pages;
  }

  private async searchAllPages(apiKey: string): Promise<NotionPage[]> {
    const pages: NotionPage[] = [];

    try {
      let hasMore = true;
      let startCursor: string | undefined;

      while (hasMore && pages.length < 100) {
        const response = await fetch(`${this.baseUrl}/search`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filter: { property: 'object', value: 'page' },
            page_size: 100,
            start_cursor: startCursor,
          }),
        });

        if (!response.ok) break;

        const data = await response.json();

        for (const result of data.results) {
          const page = await this.fetchPage(apiKey, result.id);
          if (page) pages.push(page);
          await this.sleep(300);
        }

        hasMore = data.has_more;
        startCursor = data.next_cursor;
      }
    } catch (error) {
      this.logger.warn(`Error searching pages: ${error.message}`);
    }

    return pages;
  }

  private extractTitle(pageData: any): string {
    const properties = pageData.properties || {};

    for (const key of Object.keys(properties)) {
      const prop = properties[key];
      if (prop.type === 'title' && prop.title?.length > 0) {
        return prop.title.map((t: any) => t.plain_text).join('');
      }
    }

    return 'Untitled';
  }

  private extractBlocksContent(blocks: NotionBlock[]): string {
    const textParts: string[] = [];

    for (const block of blocks) {
      const text = this.extractBlockText(block);
      if (text) textParts.push(text);
    }

    return textParts.join('\n\n');
  }

  private extractBlockText(block: NotionBlock): string {
    const type = block.type;
    const data = block[type];

    if (!data) return '';

    if (data.rich_text) {
      const text = data.rich_text.map((t: any) => t.plain_text).join('');

      switch (type) {
        case 'heading_1':
          return `# ${text}`;
        case 'heading_2':
          return `## ${text}`;
        case 'heading_3':
          return `### ${text}`;
        case 'bulleted_list_item':
          return `• ${text}`;
        case 'numbered_list_item':
          return `- ${text}`;
        case 'to_do':
          return `☐ ${text}`;
        case 'toggle':
          return `▸ ${text}`;
        case 'quote':
          return `> ${text}`;
        case 'callout':
          return `📌 ${text}`;
        case 'code':
          return `\`\`\`\n${text}\n\`\`\``;
        default:
          return text;
      }
    }

    if (type === 'child_page') {
      return `📄 ${data.title}`;
    }

    if (type === 'child_database') {
      return `📊 ${data.title}`;
    }

    return '';
  }

  private async indexPages(
    dataSourceId: string,
    organizationId: string,
    category: string,
    pages: NotionPage[],
  ) {
    for (const page of pages) {
      if (!page.content || page.content.length < 50) continue;

      const document = await this.prisma.knowledgeDocument.create({
        data: {
          organizationId,
          dataSourceId,
          title: page.title,
          content: page.content.substring(0, 10000),
          category,
          documentType: 'MD',
          status: 'PROCESSING',
          fileUrl: page.url,
          metadata: {
            notionPageId: page.id,
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
            notionPageId: page.id,
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
