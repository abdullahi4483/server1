import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        role: UserRole.CLIENT,
      },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
      },
    });

    await this.prisma.userSettings.create({
      data: {
        userId: user.id,
      },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is suspended');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        revokedAt: null,
      },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const match = await bcrypt.compare(dto.refreshToken, tokenRecord.tokenHash);
    if (!match || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      tokenRecord.user.id,
      tokenRecord.user.email,
      tokenRecord.user.role,
      tokenRecord.id,
    );
  }

  async logout(dto: RefreshTokenDto) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { revokedAt: null },
      select: { id: true, tokenHash: true },
    });

    const target = await this.findMatchingRefreshToken(dto.refreshToken, tokens);
    if (target) {
      await this.prisma.refreshToken.update({
        where: { id: target.id },
        data: { revokedAt: new Date() },
      });
    }

    return { success: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    const validPassword = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!validPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }

  forgotPassword(email: string) {
    return {
      success: true,
      message: `Password reset flow placeholder for ${email}`,
    };
  }

  resetPassword(token: string) {
    return {
      success: true,
      message: `Password reset placeholder for token ${token}`,
    };
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: UserRole,
    replacedBy?: string,
  ) {
    const accessTokenExpiresIn = (
      process.env.JWT_ACCESS_EXPIRES_IN ?? '15m'
    ) as StringValue;
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        expiresIn: accessTokenExpiresIn,
      },
    );

    const refreshTokenExpiresIn = (
      process.env.JWT_REFRESH_EXPIRES_IN ?? '30d'
    ) as StringValue;
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, email, role, type: 'refresh' },
      {
        expiresIn: refreshTokenExpiresIn,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    const refreshTTL =
      Number.parseInt(process.env.JWT_REFRESH_TTL_DAYS ?? '30', 10) || 30;
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + refreshTTL * 24 * 60 * 60 * 1000),
        replacedBy,
      },
    });

    return { accessToken, refreshToken };
  }

  private async findMatchingRefreshToken(
    rawToken: string,
    tokens: Array<{ id: string; tokenHash: string }>,
  ) {
    for (const token of tokens) {
      const match = await bcrypt.compare(rawToken, token.tokenHash);
      if (match) {
        return token;
      }
    }
    return null;
  }
}
