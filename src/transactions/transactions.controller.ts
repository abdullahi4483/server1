import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ListTransactionsQuery } from './dto/list-transactions.query';
import { TransactionsService } from './transactions.service';

type RequestWithUser = Request & { user?: { sub: string } };

@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('transactions')
  listForUser(@Req() req: RequestWithUser, @Query() query: ListTransactionsQuery) {
    return this.transactionsService.listForUser(req.user!.sub, query);
  }

  @Get('transactions/:transactionId')
  getForUser(
    @Req() req: RequestWithUser,
    @Param('transactionId') transactionId: string,
  ) {
    return this.transactionsService.getForUser(req.user!.sub, transactionId);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/transactions')
  listForAdmin(@Query() query: ListTransactionsQuery) {
    return this.transactionsService.listForAdmin(query);
  }
}
