import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QdrantService } from '../../ai/qdrant.service';
import { DocumentParserService } from './document-parser.service';
import { ChunkingService } from './chunking.service';
import { DocumentStatus, DocumentType } from '@prisma/client';

@Injectable()
export class IngestionService {
  constructor(
    private prisma: PrismaService,
    private qdrantService: QdrantService,
    private documentParser: DocumentParserService,
    private chunkingService: ChunkingService,
  ) {}

  async uploadDocument(
    organizationId: string,
    file: Express.Multer.File,
    category: string,
    title?: string,
    departmentId?: string,
    isOrgWide?: boolean,
  ) {
    const documentType = this.getDocumentType(file.mimetype);

    const document = await this.prisma.knowledgeDocument.create({
      data: {
        organizationId,
        departmentId,
        isOrgWide: isOrgWide ?? false,
        title: title || file.originalname,
        content: '',
        category,
        documentType,
        status: 'PENDING',
        fileSize: file.size,
      },
    });

    this.processDocument(document.id, file.buffer, file.mimetype);

    return document;
  }

  async uploadFromUrl(
    organizationId: string,
    url: string,
    category: string,
    title?: string,
    departmentId?: string,
    isOrgWide?: boolean,
  ) {
    const document = await this.prisma.knowledgeDocument.create({
      data: {
        organizationId,
        departmentId,
        isOrgWide: isOrgWide ?? false,
        title: title || url,
        content: '',
        category,
        documentType: 'URL',
        status: 'PENDING',
        fileUrl: url,
      },
    });

    this.processUrlDocument(document.id, url);

    return document;
  }

  async bulkUpload(
    organizationId: string,
    documents: Array<{
      title: string;
      content: string;
      category: string;
      metadata?: Record<string, any>;
      departmentId?: string;
      isOrgWide?: boolean;
    }>,
  ) {
    const results = [];

    for (const doc of documents) {
      const document = await this.prisma.knowledgeDocument.create({
        data: {
          organizationId,
          departmentId: doc.departmentId,
          isOrgWide: doc.isOrgWide ?? false,
          title: doc.title,
          content: doc.content,
          category: doc.category,
          documentType: 'TXT',
          status: 'PENDING',
          metadata: doc.metadata,
        },
      });

      this.processTextDocument(document.id, doc.content);
      results.push(document);
    }

    return results;
  }

  private async processDocument(documentId: string, buffer: Buffer, mimeType: string) {
    try {
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      });

      const parsed = await this.documentParser.parse(buffer, mimeType, '');
      await this.indexDocument(documentId, parsed.content, parsed.metadata);
    } catch (error) {
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });
    }
  }

  private async processUrlDocument(documentId: string, url: string) {
    try {
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      });

      const parsed = await this.documentParser.parseUrl(url);
      await this.indexDocument(documentId, parsed.content, parsed.metadata);
    } catch (error) {
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });
    }
  }

  private async processTextDocument(documentId: string, content: string) {
    try {
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      });

      await this.indexDocument(documentId, content, {});
    } catch (error) {
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });
    }
  }

  private async indexDocument(
    documentId: string,
    content: string,
    metadata: Record<string, any>,
  ) {
    const document = await this.prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
      include: { organization: true },
    });

    if (!document) throw new NotFoundException('Document not found');

    const chunks = this.chunkingService.chunkByParagraph(content);

    await this.prisma.documentChunk.deleteMany({
      where: { documentId },
    });

    for (const chunk of chunks) {
      const savedChunk = await this.prisma.documentChunk.create({
        data: {
          documentId,
          content: chunk.content,
          chunkIndex: chunk.index,
          tokenCount: chunk.tokenCount,
          metadata: {
            documentTitle: document.title,
            category: document.category,
            organizationId: document.organizationId,
            departmentId: document.departmentId,
            isOrgWide: document.isOrgWide,
            ...metadata,
          },
        },
      });

      const qdrantId = `${documentId}_${chunk.index}`;

      await this.qdrantService.upsertDocument({
        id: qdrantId,
        title: document.title,
        content: chunk.content,
        category: document.category,
        metadata: {
          documentId,
          chunkIndex: chunk.index,
          organizationId: document.organizationId,
          organizationSlug: document.organization.slug,
          departmentId: document.departmentId,
          isOrgWide: document.isOrgWide,
        },
      });

      await this.prisma.documentChunk.update({
        where: { id: savedChunk.id },
        data: { qdrantId },
      });
    }

    await this.prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        content: content.substring(0, 10000),
        status: 'INDEXED',
        chunkCount: chunks.length,
        metadata: {
          ...((document.metadata as object) || {}),
          ...metadata,
        },
      },
    });
  }

  async reindexDocument(documentId: string) {
    const document = await this.prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) throw new NotFoundException('Document not found');

    if (document.fileUrl) {
      await this.processUrlDocument(documentId, document.fileUrl);
    } else if (document.content) {
      await this.processTextDocument(documentId, document.content);
    } else {
      throw new BadRequestException('No content to reindex');
    }

    return this.prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
    });
  }

  async deleteDocument(documentId: string) {
    const chunks = await this.prisma.documentChunk.findMany({
      where: { documentId },
      select: { qdrantId: true },
    });

    for (const chunk of chunks) {
      if (chunk.qdrantId) {
        await this.qdrantService.deleteDocument(chunk.qdrantId);
      }
    }

    await this.prisma.knowledgeDocument.delete({
      where: { id: documentId },
    });

    return { deleted: true };
  }

  async getDocumentStatus(documentId: string) {
    return this.prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        status: true,
        chunkCount: true,
        errorMessage: true,
        updatedAt: true,
      },
    });
  }

  async listDocuments(organizationId: string, options?: {
    category?: string;
    status?: DocumentStatus;
    departmentId?: string;
    includeOrgWide?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const departmentFilter = options?.departmentId
      ? options.includeOrgWide !== false
        ? { OR: [{ departmentId: options.departmentId }, { isOrgWide: true }] }
        : { departmentId: options.departmentId }
      : {};

    const [documents, total] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({
        where: {
          organizationId,
          ...(options?.category && { category: options.category }),
          ...(options?.status && { status: options.status }),
          ...departmentFilter,
        },
        select: {
          id: true,
          title: true,
          category: true,
          documentType: true,
          status: true,
          chunkCount: true,
          fileSize: true,
          departmentId: true,
          isOrgWide: true,
          department: { select: { id: true, name: true } },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.knowledgeDocument.count({
        where: {
          organizationId,
          ...(options?.category && { category: options.category }),
          ...(options?.status && { status: options.status }),
          ...departmentFilter,
        },
      }),
    ]);

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCategories(organizationId: string) {
    const results = await this.prisma.knowledgeDocument.groupBy({
      by: ['category'],
      where: { organizationId },
      _count: { id: true },
    });

    return results.map((r) => ({
      category: r.category,
      count: r._count.id,
    }));
  }

  private getDocumentType(mimeType: string): DocumentType {
    switch (mimeType) {
      case 'application/pdf':
        return 'PDF';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'DOCX';
      case 'text/html':
        return 'HTML';
      case 'text/markdown':
        return 'MD';
      default:
        return 'TXT';
    }
  }
}
