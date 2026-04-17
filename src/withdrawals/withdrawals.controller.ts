import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { ListWithdrawalsQuery } from './dto/list-withdrawals.query';
import { RejectWithdrawalDto } from './dto/reject-withdrawal.dto';
import { WithdrawalsService } from './withdrawals.service';

type RequestWithUser = Request & { user?: { sub: string } };

@Controller()
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post('withdrawals')
  create(@Req() req: RequestWithUser, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalsService.create(req.user!.sub, dto);
  }

  @Get('withdrawals')
  listForUser(@Req() req: RequestWithUser, @Query() query: ListWithdrawalsQuery) {
    return this.withdrawalsService.listForUser(req.user!.sub, query);
  }

  @Get('withdrawals/:withdrawalId')
  getForUser(
    @Req() req: RequestWithUser,
    @Param('withdrawalId') withdrawalId: string,
  ) {
    return this.withdrawalsService.getForUser(req.user!.sub, withdrawalId);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/withdrawals')
  listForAdmin(@Query() query: ListWithdrawalsQuery) {
    return this.withdrawalsService.listForAdmin(query);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('admin/withdrawals/:withdrawalId/approve')
  approve(@Req() req: RequestWithUser, @Param('withdrawalId') withdrawalId: string) {
    return this.withdrawalsService.approve(withdrawalId, req.user!.sub);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('admin/withdrawals/:withdrawalId/reject')
  reject(
    @Req() req: RequestWithUser,
    @Param('withdrawalId') withdrawalId: string,
    @Body() dto: RejectWithdrawalDto,
  ) {
    return this.withdrawalsService.reject(withdrawalId, req.user!.sub, dto.reason);
  }
}
