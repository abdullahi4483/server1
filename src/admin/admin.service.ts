import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary() {
    const [totalUsers, activeUsers, suspendedUsers, pendingWithdrawals, deposits] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
        this.prisma.withdrawal.aggregate({
          where: { status: 'PENDING' },
          _count: true,
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: { type: 'DEPOSIT', status: 'COMPLETED' },
          _sum: { amount: true },
        }),
      ]);

    const recentActivity = await this.prisma.transaction.findMany({
      orderBy: { postedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        reference: true,
        amount: true,
        type: true,
        status: true,
        postedAt: true,
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return {
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers },
      depositsTotal: deposits._sum.amount ?? new Prisma.Decimal(0),
      pendingWithdrawals: {
        count: pendingWithdrawals._count,
        amount: pendingWithdrawals._sum.amount ?? new Prisma.Decimal(0),
      },
      revenue: 0,
      recentActivity,
    };
  }

  async getPlatformSettings() {
    const existing = await this.prisma.platformSettings.findUnique({
      where: { id: 'singleton' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.platformSettings.create({
      data: {
        id: 'singleton',
        supportEmail: 'support@fintech.com',
        adminEmail: 'admin@fintech.com',
      },
    });
  }

  async updatePlatformSettings(userId: string, dto: UpdatePlatformSettingsDto) {
    await this.getPlatformSettings();
    return this.prisma.platformSettings.update({
      where: { id: 'singleton' },
      data: {
        platformName: dto.platformName,
        supportEmail: dto.supportEmail,
        adminEmail: dto.adminEmail,
        withdrawalManualThreshold: dto.withdrawalManualThreshold,
        autoApproveEnabled: dto.autoApproveEnabled,
        autoApproveMaxAmount: dto.autoApproveMaxAmount,
        sessionTimeoutMinutes: dto.sessionTimeoutMinutes,
        apiRateLimitPerHour: dto.apiRateLimitPerHour,
        updatedBy: userId,
      },
    });
  }

  async createAdminUser(dto: CreateAdminUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        role: 'CLIENT',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
      },
    });

    await this.prisma.userSettings.create({
      data: {
        userId: user.id,
      },
    });

    return user;
  }
}
