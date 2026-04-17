import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListTransactionsQuery } from './dto/list-transactions.query';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, query: ListTransactionsQuery) {
    const where = this.buildWhere(query, userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: this.buildOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async listForAdmin(query: ListTransactionsQuery) {
    const where = this.buildWhere(query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: this.buildOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async getForUser(userId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  private buildWhere(query: ListTransactionsQuery, userId?: string) {
    const where: Prisma.TransactionWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
        { reference: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.accountId) {
      where.accountId = query.accountId;
    }

    if (query.type && query.type in TransactionType) {
      where.type = query.type as TransactionType;
    }

    if (query.status && query.status in TransactionStatus) {
      where.status = query.status as TransactionStatus;
    }

    if (query.dateFrom || query.dateTo) {
      where.postedAt = {};
      if (query.dateFrom) {
        where.postedAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.postedAt.lte = new Date(query.dateTo);
      }
    }

    return where;
  }

  private buildOrderBy(
    query: ListTransactionsQuery,
  ): Prisma.TransactionOrderByWithRelationInput {
    const sortOrder = query.sortOrder ?? 'desc';
    switch (query.sortBy) {
      case 'amount':
        return { amount: sortOrder };
      case 'date':
      default:
        return { postedAt: sortOrder };
    }
  }
}
