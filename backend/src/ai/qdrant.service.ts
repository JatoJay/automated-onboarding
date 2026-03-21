import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { GeminiService } from './gemini.service';
import { v4 as uuidv4 } from 'uuid';

const COLLECTION_NAME = 'knowledge_documents';
const VECTOR_SIZE = 768;

@Injectable()
export class QdrantService implements OnModuleInit {
  private client: QdrantClient;

  constructor(
    private configService: ConfigService,
    private geminiService: GeminiService,
  ) {
    this.client = new QdrantClient({
      url: this.configService.get<string>('QDRANT_URL') || 'http://localhost:6333',
      apiKey: this.configService.get<string>('QDRANT_API_KEY'),
    });
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  private async ensureCollection() {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

      if (!exists) {
        await this.client.createCollection(COLLECTION_NAME, {
          vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine',
          },
        });

        await this.client.createPayloadIndex(COLLECTION_NAME, {
          field_name: 'organizationId',
          field_schema: 'keyword',
        });

        await this.client.createPayloadIndex(COLLECTION_NAME, {
          field_name: 'departmentId',
          field_schema: 'keyword',
        });

        await this.client.createPayloadIndex(COLLECTION_NAME, {
          field_name: 'isOrgWide',
          field_schema: 'bool',
        });
      }
    } catch (error) {
      console.error('Failed to initialize Qdrant collection:', error.message);
    }
  }

  async createEmbedding(text: string): Promise<number[]> {
    return this.geminiService.generateEmbedding(text);
  }

  async upsertDocument(doc: {
    id: string;
    title: string;
    content: string;
    category: string;
    metadata?: Record<string, any>;
  }) {
    const embedding = await this.createEmbedding(`${doc.title}\n\n${doc.content}`);

    const pointId = this.stringToUuid(doc.id);

    await this.client.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: pointId,
          vector: embedding,
          payload: {
            originalId: doc.id,
            title: doc.title,
            content: doc.content,
            category: doc.category,
            ...doc.metadata,
          },
        },
      ],
    });

    return { id: doc.id, indexed: true };
  }

  async search(
    query: string,
    options?: {
      organizationId?: string;
      departmentId?: string;
      departmentIds?: string[];
      includeOrgWide?: boolean;
      category?: string;
      limit?: number;
      scoreThreshold?: number;
    },
  ) {
    const limit = options?.limit || 5;
    const scoreThreshold = options?.scoreThreshold || 0.5;

    const queryEmbedding = await this.createEmbedding(query);

    const filter: any = { must: [] };

    if (options?.organizationId) {
      filter.must.push({
        key: 'organizationId',
        match: { value: options.organizationId },
      });
    }

    if (options?.departmentIds?.length) {
      const shouldConditions = options.departmentIds.map((deptId) => ({
        key: 'departmentId',
        match: { value: deptId },
      }));
      if (options.includeOrgWide !== false) {
        shouldConditions.push({ key: 'isOrgWide', match: { value: true } } as any);
      }
      filter.must.push({ should: shouldConditions });
    } else if (options?.departmentId) {
      if (options.includeOrgWide !== false) {
        filter.must.push({
          should: [
            { key: 'departmentId', match: { value: options.departmentId } },
            { key: 'isOrgWide', match: { value: true } },
          ],
        });
      } else {
        filter.must.push({
          key: 'departmentId',
          match: { value: options.departmentId },
        });
      }
    }

    if (options?.category) {
      filter.must.push({
        key: 'category',
        match: { value: options.category },
      });
    }

    const results = await this.client.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit,
      score_threshold: scoreThreshold,
      with_payload: true,
      filter: filter.must.length > 0 ? filter : undefined,
    });

    return results.map((result) => ({
      id: result.payload?.originalId as string || result.id as string,
      score: result.score,
      title: result.payload?.title as string,
      content: result.payload?.content as string,
      category: result.payload?.category as string,
      documentId: result.payload?.documentId as string,
      chunkIndex: result.payload?.chunkIndex as number,
      departmentId: result.payload?.departmentId as string,
      isOrgWide: result.payload?.isOrgWide as boolean,
    }));
  }

  async deleteDocument(id: string) {
    const pointId = this.stringToUuid(id);

    await this.client.delete(COLLECTION_NAME, {
      wait: true,
      points: [pointId],
    });
    return { id, deleted: true };
  }

  async deleteByOrganization(organizationId: string) {
    await this.client.delete(COLLECTION_NAME, {
      wait: true,
      filter: {
        must: [
          {
            key: 'organizationId',
            match: { value: organizationId },
          },
        ],
      },
    });
    return { organizationId, deleted: true };
  }

  async deleteByDocumentId(documentId: string) {
    await this.client.delete(COLLECTION_NAME, {
      wait: true,
      filter: {
        must: [
          {
            key: 'documentId',
            match: { value: documentId },
          },
        ],
      },
    });
    return { documentId, deleted: true };
  }

  async getCollectionInfo() {
    return this.client.getCollection(COLLECTION_NAME);
  }

  async getCollectionStats() {
    const info = await this.client.getCollection(COLLECTION_NAME);
    return {
      vectorsCount: info.vectors_count,
      pointsCount: info.points_count,
      status: info.status,
    };
  }

  private stringToUuid(str: string): string {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
      return str;
    }

    const hash = this.simpleHash(str);
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
  }

  private simpleHash(str: string): string {
    let hash = '';
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash as any) * 31 + char).toString(16);
    }
    return hash.padStart(32, '0').substring(0, 32);
  }
}
