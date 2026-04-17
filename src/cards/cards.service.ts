import { Injectable, NotFoundException } from '@nestjs/common';
import { CardStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.card.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async freeze(userId: string, cardId: string) {
    await this.ensureOwnership(userId, cardId);
    return this.prisma.card.update({
      where: { id: cardId },
      data: { status: CardStatus.FROZEN },
    });
  }

  async unfreeze(userId: string, cardId: string) {
    await this.ensureOwnership(userId, cardId);
    return this.prisma.card.update({
      where: { id: cardId },
      data: { status: CardStatus.ACTIVE },
    });
  }

  async replace(userId: string, cardId: string) {
    const card = await this.ensureOwnership(userId, cardId);
    await this.prisma.card.update({
      where: { id: cardId },
      data: { status: CardStatus.REPLACED },
    });
    return this.prisma.card.create({
      data: {
        userId,
        accountId: card.accountId,
        brand: card.brand,
        cardType: card.cardType,
        maskedPan: `**** **** **** ${Math.floor(1000 + Math.random() * 9000)}`,
        last4: `${Math.floor(1000 + Math.random() * 9000)}`,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear + 3,
        status: CardStatus.ACTIVE,
        spendingLimit: card.spendingLimit,
        currentUsage: 0,
      },
    });
  }

  private async ensureOwnership(userId: string, cardId: string) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, userId },
    });
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    return card;
  }
}
