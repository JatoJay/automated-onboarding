import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { RegisterWithInviteDto } from './dto/register-with-invite.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || 'EMPLOYEE',
      },
    });

    return this.generateTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id, user.email, user.role);
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }

  private generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  async createInvite(creatorId: string, dto: CreateInviteDto) {
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      select: { role: true, organizationId: true },
    });

    if (!creator || !['HR', 'ADMIN', 'ORG_ADMIN'].includes(creator.role)) {
      throw new ForbiddenException('Only HR and Admin users can create invites');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('A user with this email already exists');
    }

    const existingInvite = await this.prisma.employeeInvite.findFirst({
      where: {
        email: dto.email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      throw new BadRequestException('An active invite already exists for this email');
    }

    let organizationId = creator.organizationId;
    if (!organizationId) {
      let org = await this.prisma.organization.findFirst();
      if (!org) {
        org = await this.prisma.organization.create({
          data: { name: 'Default Organization', slug: 'default' },
        });
      }
      organizationId = org.id;
    }

    const invite = await this.prisma.employeeInvite.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        jobTitle: dto.jobTitle,
        departmentId: dto.departmentId,
        managerId: dto.managerId,
        startDate: new Date(dto.startDate),
        organizationId,
        createdById: creatorId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        department: { select: { name: true } },
      },
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const inviteLink = `${frontendUrl}/join?token=${invite.token}`;

    return {
      id: invite.id,
      token: invite.token,
      email: invite.email,
      firstName: invite.firstName,
      lastName: invite.lastName,
      department: invite.department.name,
      expiresAt: invite.expiresAt,
      inviteLink,
    };
  }

  async getInviteByToken(token: string) {
    const invite = await this.prisma.employeeInvite.findUnique({
      where: { token },
      include: {
        department: { select: { name: true } },
        organization: { select: { name: true } },
      },
    });

    if (!invite) {
      throw new BadRequestException('Invalid invite token');
    }

    if (invite.usedAt) {
      throw new BadRequestException('This invite has already been used');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite has expired');
    }

    return {
      email: invite.email,
      firstName: invite.firstName,
      lastName: invite.lastName,
      jobTitle: invite.jobTitle,
      department: invite.department.name,
      organization: invite.organization.name,
      startDate: invite.startDate,
    };
  }

  async registerWithInvite(dto: RegisterWithInviteDto) {
    const invite = await this.prisma.employeeInvite.findUnique({
      where: { token: dto.token },
    });

    if (!invite) {
      throw new BadRequestException('Invalid invite token');
    }

    if (invite.usedAt) {
      throw new BadRequestException('This invite has already been used');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite has expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: invite.email,
        passwordHash,
        firstName: invite.firstName,
        lastName: invite.lastName,
        role: 'EMPLOYEE',
        organizationId: invite.organizationId,
      },
    });

    await this.prisma.employee.create({
      data: {
        userId: user.id,
        departmentId: invite.departmentId,
        managerId: invite.managerId,
        jobTitle: invite.jobTitle,
        startDate: invite.startDate,
        onboardingStatus: 'IN_PROGRESS',
      },
    });

    await this.prisma.employeeInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    return this.generateTokens(user.id, user.email, user.role);
  }

  async listInvites(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true },
    });

    if (!user || !['HR', 'ADMIN', 'ORG_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only HR and Admin users can view invites');
    }

    return this.prisma.employeeInvite.findMany({
      where: user.organizationId ? { organizationId: user.organizationId } : {},
      include: {
        department: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvite(userId: string, inviteId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || !['HR', 'ADMIN', 'ORG_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only HR and Admin users can revoke invites');
    }

    await this.prisma.employeeInvite.delete({
      where: { id: inviteId },
    });

    return { message: 'Invite revoked successfully' };
  }
}
