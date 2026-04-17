import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        availableBalance: true,
        ledgerBalance: true,
        currency: true,
      },
    });

    const totalBalance = accounts.reduce(
      (sum, a) => sum + Number(a.availableBalance),
      0,
    );

    const recentTransactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { postedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        description: true,
        postedAt: true,
      },
    });

    return {
      totalBalance,
      accounts,
      recentTransactions,
    };
  }
}
