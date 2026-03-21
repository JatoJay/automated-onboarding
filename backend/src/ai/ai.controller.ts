import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('message')
  sendMessage(@Request() req: any, @Body() dto: ChatMessageDto) {
    return this.aiService.chat(req.user.id, dto);
  }

  @Get('history')
  getHistory(@Request() req: any) {
    return this.aiService.getChatHistory(req.user.id);
  }

  @Get('suggestions')
  getSuggestions(@Request() req: any) {
    return this.aiService.getSuggestions(req.user.id);
  }

  @Get('onboarding-status')
  getOnboardingStatus(@Request() req: any) {
    return this.aiService.getOnboardingStatus(req.user.id);
  }
}
