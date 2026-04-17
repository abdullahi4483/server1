import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { DashboardService } from './dashboard.service';

type RequestWithUser = Request & { user?: { sub: string } };

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Req() req: RequestWithUser) {
    return this.dashboardService.getSummary(req.user!.sub);
  }
}
