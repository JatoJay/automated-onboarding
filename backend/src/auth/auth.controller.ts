import { Controller, Post, Body, Get, Delete, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { RegisterWithInviteDto } from './dto/register-with-invite.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('invites')
  createInvite(@Request() req: any, @Body() dto: CreateInviteDto) {
    return this.authService.createInvite(req.user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('invites')
  listInvites(@Request() req: any) {
    return this.authService.listInvites(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('invites/:id')
  revokeInvite(@Request() req: any, @Param('id') id: string) {
    return this.authService.revokeInvite(req.user.id, id);
  }

  @Get('invites/validate')
  validateInvite(@Query('token') token: string) {
    return this.authService.getInviteByToken(token);
  }

  @Post('register-with-invite')
  registerWithInvite(@Body() dto: RegisterWithInviteDto) {
    return this.authService.registerWithInvite(dto);
  }
}
