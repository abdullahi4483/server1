import { Controller, Get, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { AccountsService } from './accounts.service';

type RequestWithUser = Request & { user?: { sub: string } };

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.accountsService.list(req.user!.sub);
  }

  @Get(':accountId')
  getById(@Req() req: RequestWithUser, @Param('accountId') accountId: string) {
    return this.accountsService.getById(req.user!.sub, accountId);
  }
}
