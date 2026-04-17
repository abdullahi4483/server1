import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WithdrawalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { ListWithdrawalsQuery } from './dto/list-withdrawals.query';

@Injectable()
export class WithdrawalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWithdrawalDto) {
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lte(0)) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (amount.gt(account.availableBalance)) {
      throw new BadRequestException('Insufficient balance');
    }

    const settings = await this.getPlatformSettings();
    const status =
      settings.autoApproveEnabled &&
      amount.lte(settings.autoApproveMaxAmount)
        ? WithdrawalStatus.APPROVED
        : WithdrawalStatus.PENDING;

    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          accountId: account.id,
          amount,
          currency: dto.currency,
          status,
          reviewedAt: status === WithdrawalStatus.APPROVED ? new Date() : null,
        },
      });

      await tx.account.update({
        where: { id: account.id },
        data: {
          availableBalance: {
            decrement: amount,
          },
        },
      });

      await tx.transaction.create({
        data: {
          accountId: account.id,
          userId,
          reference: `WD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          type: 'WITHDRAWAL',
          direction: 'DEBIT',
          amount,
          currency: dto.currency,
          status: status === WithdrawalStatus.APPROVED ? 'COMPLETED' : 'PENDING',
          description: 'Withdrawal request',
        },
      });

      return withdrawal;
    });
  }

  async listForUser(userId: string, query: ListWithdrawalsQuery) {
    const where: Prisma.WithdrawalWhereInput = { userId };
    if (query.status && query.status in WithdrawalStatus) {
      where.status = query.status as WithdrawalStatus;
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.withdrawal.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.withdrawal.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async getForUser(userId: string, id: string) {
    const withdrawal = await this.prisma.withdrawal.findFirst({
      where: { id, userId },
    });
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }
    return withdrawal;
  }

  async listForAdmin(query: ListWithdrawalsQuery) {
    const where: Prisma.WithdrawalWhereInput = {};
    if (query.status && query.status in WithdrawalStatus) {
      where.status = query.status as WithdrawalStatus;
    }
    if (query.search) {
      where.OR = [
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.withdrawal.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          account: { select: { id: true, accountNumberMasked: true } },
        },
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.withdrawal.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async approve(id: string, adminUserId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Only pending withdrawals can be approved');
    }

    return this.prisma.withdrawal.update({
      where: { id },
      data: {
        status: WithdrawalStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
      },
    });
  }

  async reject(id: string, adminUserId: string, reason: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Only pending withdrawals can be rejected');
    }

    return this.prisma.$transaction(async (tx) => {
      const rejected = await tx.withdrawal.update({
        where: { id },
        data: {
          status: WithdrawalStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
          rejectionReason: reason,
        },
      });

      await tx.account.update({
        where: { id: withdrawal.accountId },
        data: {
          availableBalance: {
            increment: withdrawal.amount,
          },
        },
      });

      return rejected;
    });
  }

  private async getPlatformSettings() {
    const settings = await this.prisma.platformSettings.findUnique({
      where: { id: 'singleton' },
    });
    if (settings) {
      return settings;
    }
    return this.prisma.platformSettings.create({
      data: {
        id: 'singleton',
        supportEmail: 'support@fintech.com',
        adminEmail: 'admin@fintech.com',
      },
    });
  }
}
