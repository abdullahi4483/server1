import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
      },
    });
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
      },
    });
  }

  async getSecurity(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    return user;
  }

  updateSecurity(userId: string, dto: UpdateSecurityDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: dto.twoFactorEnabled,
      },
      select: {
        id: true,
        twoFactorEnabled: true,
      },
    });
  }

  async getNotifications(userId: string) {
    return this.ensureSettings(userId);
  }

  async updateNotifications(userId: string, dto: UpdateNotificationsDto) {
    await this.ensureSettings(userId);
    return this.prisma.userSettings.update({
      where: { userId },
      data: dto,
    });
  }

  async getPreferences(userId: string) {
    return this.ensureSettings(userId);
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    await this.ensureSettings(userId);
    return this.prisma.userSettings.update({
      where: { userId },
      data: dto,
    });
  }

  private async ensureSettings(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });
    if (settings) {
      return settings;
    }
    return this.prisma.userSettings.create({ data: { userId } });
  }
}
