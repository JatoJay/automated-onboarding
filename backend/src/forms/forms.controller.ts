import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FormsService } from './forms.service';
import { CreateFormDto, CreateFormFieldDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { SubmitFormDto } from './dto/submit-form.dto';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('forms')
export class FormsController {
  constructor(
    private formsService: FormsService,
    private prisma: PrismaService,
  ) {}

  @Post()
  async createForm(@Body() dto: CreateFormDto, @Request() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { organizationId: true },
    });
    return this.formsService.createForm(dto, req.user.id, user!.organizationId!);
  }

  @Get()
  async listForms(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { organizationId: true },
    });
    return this.formsService.listForms(user!.organizationId!, { status, departmentId });
  }

  @Get('my-forms')
  async getMyForms(@Request() req: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: req.user.id },
    });
    if (!employee) {
      return [];
    }
    return this.formsService.getFormsForEmployee(employee.id);
  }

  @Get(':id')
  getForm(@Param('id') id: string) {
    return this.formsService.getForm(id);
  }

  @Put(':id')
  updateForm(@Param('id') id: string, @Body() dto: UpdateFormDto) {
    return this.formsService.updateForm(id, dto);
  }

  @Delete(':id')
  deleteForm(@Param('id') id: string) {
    return this.formsService.deleteForm(id);
  }

  @Post(':id/fields')
  addField(@Param('id') formId: string, @Body() dto: CreateFormFieldDto) {
    return this.formsService.addField(formId, dto);
  }

  @Put('fields/:fieldId')
  updateField(@Param('fieldId') fieldId: string, @Body() dto: Partial<CreateFormFieldDto>) {
    return this.formsService.updateField(fieldId, dto);
  }

  @Delete('fields/:fieldId')
  deleteField(@Param('fieldId') fieldId: string) {
    return this.formsService.deleteField(fieldId);
  }

  @Post(':id/reorder')
  reorderFields(@Param('id') formId: string, @Body() body: { fieldIds: string[] }) {
    return this.formsService.reorderFields(formId, body.fieldIds);
  }

  @Post(':id/submit')
  async submitForm(@Param('id') formId: string, @Body() dto: SubmitFormDto, @Request() req: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: req.user.id },
    });
    if (!employee) {
      throw new Error('Employee not found');
    }
    return this.formsService.submitForm(formId, employee.id, dto);
  }

  @Get(':id/my-submission')
  async getMySubmission(@Param('id') formId: string, @Request() req: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: req.user.id },
    });
    if (!employee) {
      return null;
    }
    return this.formsService.getMySubmission(formId, employee.id);
  }

  @Get(':id/submissions')
  getSubmissions(@Param('id') formId: string) {
    return this.formsService.getSubmissions(formId);
  }

  @Get(':id/export')
  async exportSubmissions(
    @Param('id') formId: string,
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Res() res: Response,
  ) {
    const result = await this.formsService.exportSubmissions(formId, format);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${formId}_submissions.json"`);
      return res.send(JSON.stringify(result, null, 2));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.content);
  }
}
