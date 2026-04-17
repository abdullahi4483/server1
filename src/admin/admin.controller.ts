import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';
import { AdminService } from './admin.service';

type RequestWithUser = Request & { user?: { sub: string } };

@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/summary')
  getDashboardSummary() {
    return this.adminService.getDashboardSummary();
  }

  @Get('settings')
  getPlatformSettings() {
    return this.adminService.getPlatformSettings();
  }

  @Patch('settings')
  updatePlatformSettings(
    @Req() req: RequestWithUser,
    @Body() dto: UpdatePlatformSettingsDto,
  ) {
    return this.adminService.updatePlatformSettings(req.user!.sub, dto);
  }

  @Post('users')
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createAdminUser(dto);
  }
}
