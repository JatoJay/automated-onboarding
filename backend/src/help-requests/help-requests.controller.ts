import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HelpRequestsService } from './help-requests.service';
import { CreateHelpRequestDto, UpdateHelpRequestDto, CreateReplyDto } from './dto/create-help-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('help-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('help-requests')
export class HelpRequestsController {
  constructor(private helpRequestsService: HelpRequestsService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateHelpRequestDto) {
    if (!req.user.employeeId) {
      throw new BadRequestException('Only employees can create help requests');
    }
    return this.helpRequestsService.create(
      req.user.employeeId,
      req.user.organizationId!,
      dto,
    );
  }

  @Get('my')
  async getMyRequests(@Request() req: any) {
    return this.helpRequestsService.getMyRequests(req.user.employeeId);
  }

  @Get('notifications')
  async getNotifications(@Request() req: any) {
    const isAdmin = ['HR', 'ADMIN', 'ORG_ADMIN'].includes(req.user.role);
    return this.helpRequestsService.getNotificationCount(
      req.user.id,
      req.user.employeeId,
      req.user.organizationId,
      isAdmin,
    );
  }

  @Get(':id')
  async getRequest(@Request() req: any, @Param('id') id: string) {
    return this.helpRequestsService.getRequest(id, req.user.id, req.user.organizationId!);
  }

  @Post(':id/replies')
  async addReply(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateReplyDto,
  ) {
    return this.helpRequestsService.addReply(id, req.user.id, req.user.organizationId!, dto);
  }
}

@ApiTags('admin/help-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/help-requests')
export class AdminHelpRequestsController {
  constructor(private helpRequestsService: HelpRequestsService) {}

  @Get()
  async list(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.helpRequestsService.listForAdmin(req.user.organizationId!, { status, category });
  }

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.helpRequestsService.getStats(req.user.organizationId!);
  }

  @Get(':id')
  async getRequest(@Request() req: any, @Param('id') id: string) {
    return this.helpRequestsService.getRequest(id, req.user.id, req.user.organizationId!);
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateHelpRequestDto,
  ) {
    return this.helpRequestsService.update(id, req.user.organizationId!, dto);
  }

  @Post(':id/replies')
  async addReply(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateReplyDto,
  ) {
    return this.helpRequestsService.addReply(id, req.user.id, req.user.organizationId!, dto);
  }
}
