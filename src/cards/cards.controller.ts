import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { CreateCardReplacementDto } from './dto/create-card-replacement.dto';
import { CardsService } from './cards.service';

type RequestWithUser = Request & { user?: { sub: string } };

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.cardsService.list(req.user!.sub);
  }

  @Patch(':cardId/freeze')
  freeze(@Req() req: RequestWithUser, @Param('cardId') cardId: string) {
    return this.cardsService.freeze(req.user!.sub, cardId);
  }

  @Patch(':cardId/unfreeze')
  unfreeze(@Req() req: RequestWithUser, @Param('cardId') cardId: string) {
    return this.cardsService.unfreeze(req.user!.sub, cardId);
  }

  @Post(':cardId/replace')
  replace(
    @Req() req: RequestWithUser,
    @Param('cardId') cardId: string,
    @Body() _dto: CreateCardReplacementDto,
  ) {
    return this.cardsService.replace(req.user!.sub, cardId);
  }
}
