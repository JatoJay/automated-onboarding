import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddDocumentDto } from './dto/add-document.dto';

@ApiTags('knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/knowledge')
export class KnowledgeController {
  constructor(private knowledgeService: KnowledgeService) {}

  @Get('documents')
  listDocuments(@Query('category') category?: string) {
    return this.knowledgeService.listDocuments(category);
  }

  @Get('documents/:id')
  getDocument(@Param('id') id: string) {
    return this.knowledgeService.getDocument(id);
  }

  @Post('documents')
  addDocument(
    @Param('organizationId') organizationId: string,
    @Body() dto: AddDocumentDto,
  ) {
    return this.knowledgeService.addDocument({ ...dto, organizationId });
  }

  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string) {
    return this.knowledgeService.deleteDocument(id);
  }

  @Get('categories')
  getCategories() {
    return this.knowledgeService.getCategories();
  }

  @Post('documents/:id/reindex')
  reindexDocument(@Param('id') id: string) {
    return this.knowledgeService.reindexDocument(id);
  }
}
