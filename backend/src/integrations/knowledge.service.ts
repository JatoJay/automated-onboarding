import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QdrantService } from '../ai/qdrant.service';
import { AddDocumentDto } from './dto/add-document.dto';

@Injectable()
export class KnowledgeService {
  constructor(
    private prisma: PrismaService,
    private qdrantService: QdrantService,
  ) {}

  async listDocuments(category?: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: category ? { category } : {},
      select: {
        id: true,
        title: true,
        category: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getDocument(id: string) {
    const doc = await this.prisma.knowledgeDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    return doc;
  }

  async addDocument(dto: AddDocumentDto & { organizationId: string }) {
    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        organizationId: dto.organizationId,
        title: dto.title,
        content: dto.content,
        category: dto.category,
        metadata: dto.metadata || {},
      },
    });

    await this.qdrantService.upsertDocument({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      category: doc.category,
      metadata: dto.metadata,
    });

    return doc;
  }

  async deleteDocument(id: string) {
    await this.qdrantService.deleteDocument(id);
    return this.prisma.knowledgeDocument.delete({ where: { id } });
  }

  async reindexDocument(id: string) {
    const doc = await this.getDocument(id);
    return this.qdrantService.upsertDocument({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      category: doc.category,
    });
  }

  async getCategories() {
    const results = await this.prisma.knowledgeDocument.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    return results.map((r) => ({
      category: r.category,
      count: r._count.id,
    }));
  }
}
