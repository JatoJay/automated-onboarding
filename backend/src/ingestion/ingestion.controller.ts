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
  UploadedFiles,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { IngestionService } from './services/ingestion.service';
import { UploadDocumentDto, UploadFromUrlDto, BulkUploadDto } from './dto/upload-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('ingestion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/documents')
export class IngestionController {
  constructor(private ingestionService: IngestionService) {}

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
  uploadDocument(
    @Param('organizationId') organizationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.ingestionService.uploadDocument(
      organizationId,
      file,
      dto.category,
      dto.title,
    );
  }

  @Post('upload-multiple')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadMultiple(
    @Param('organizationId') organizationId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('category') category: string,
  ) {
    const results = [];
    for (const file of files) {
      const doc = await this.ingestionService.uploadDocument(
        organizationId,
        file,
        category,
      );
      results.push(doc);
    }
    return results;
  }

  @Post('upload-url')
  uploadFromUrl(
    @Param('organizationId') organizationId: string,
    @Body() dto: UploadFromUrlDto,
  ) {
    return this.ingestionService.uploadFromUrl(
      organizationId,
      dto.url,
      dto.category,
      dto.title,
    );
  }

  @Post('bulk')
  bulkUpload(
    @Param('organizationId') organizationId: string,
    @Body() dto: BulkUploadDto,
  ) {
    return this.ingestionService.bulkUpload(organizationId, dto.documents);
  }

  @Get()
  listDocuments(
    @Param('organizationId') organizationId: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ingestionService.listDocuments(organizationId, {
      category,
      status: status as any,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('categories')
  getCategories(@Param('organizationId') organizationId: string) {
    return this.ingestionService.getCategories(organizationId);
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
