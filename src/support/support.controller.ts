import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateMessageDto } from './dto/create-message.dto';
import { ListMessagesQuery } from './dto/list-messages.query';
import { ReplyMessageDto } from './dto/reply-message.dto';
import { SupportService } from './support.service';

type RequestWithUser = Request & { user?: { sub: string } };

@Controller()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('support/messages')
  create(@Req() req: RequestWithUser, @Body() dto: CreateMessageDto) {
    return this.supportService.create(req.user!.sub, dto);
  }

  @Get('support/messages')
  listForUser(@Req() req: RequestWithUser, @Query() query: ListMessagesQuery) {
    return this.supportService.listForUser(req.user!.sub, query);
  }

  @Get('support/messages/:messageId')
  getForUser(@Req() req: RequestWithUser, @Param('messageId') messageId: string) {
    return this.supportService.getForUser(req.user!.sub, messageId);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/messages')
  listForAdmin(@Query() query: ListMessagesQuery) {
    return this.supportService.listForAdmin(query);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('admin/messages/:messageId/reply')
  reply(
    @Req() req: RequestWithUser,
    @Param('messageId') messageId: string,
    @Body() dto: ReplyMessageDto,
  ) {
    return this.supportService.reply(messageId, req.user!.sub, dto.body);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('admin/messages/:messageId/resolve')
  resolve(@Param('messageId') messageId: string) {
    return this.supportService.resolve(messageId);
  }
}
