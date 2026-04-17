import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { Request } from 'express';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';
import { SettingsService } from './settings.service';

type RequestWithUser = Request & { user?: { sub: string } };

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('profile')
  getProfile(@Req() req: RequestWithUser) {
    return this.settingsService.getProfile(req.user!.sub);
  }

  @Patch('profile')
  updateProfile(@Req() req: RequestWithUser, @Body() dto: UpdateProfileDto) {
    return this.settingsService.updateProfile(req.user!.sub, dto);
  }

  @Get('security')
  getSecurity(@Req() req: RequestWithUser) {
    return this.settingsService.getSecurity(req.user!.sub);
  }

  @Patch('security')
  updateSecurity(@Req() req: RequestWithUser, @Body() dto: UpdateSecurityDto) {
    return this.settingsService.updateSecurity(req.user!.sub, dto);
  }

  @Get('notifications')
  getNotifications(@Req() req: RequestWithUser) {
    return this.settingsService.getNotifications(req.user!.sub);
  }

  @Patch('notifications')
  updateNotifications(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateNotificationsDto,
  ) {
    return this.settingsService.updateNotifications(req.user!.sub, dto);
  }

  @Get('preferences')
  getPreferences(@Req() req: RequestWithUser) {
    return this.settingsService.getPreferences(req.user!.sub);
  }

  @Patch('preferences')
  updatePreferences(@Req() req: RequestWithUser, @Body() dto: UpdatePreferencesDto) {
    return this.settingsService.updatePreferences(req.user!.sub, dto);
  }
}
