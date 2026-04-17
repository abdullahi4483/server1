import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TicketCategory, TicketStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ListMessagesQuery } from './dto/list-messages.query';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateMessageDto) {
    const category = dto.category.toUpperCase() as TicketCategory;
    return this.prisma.supportThread.create({
      data: {
        userId,
        category,
        subject: dto.subject,
        status: TicketStatus.PENDING,
        messages: {
          create: {
            senderUserId: userId,
            senderRole: UserRole.CLIENT,
            body: dto.message,
          },
        },
      },
      include: {
        messages: true,
      },
    });
  }

  async listForUser(userId: string, query: ListMessagesQuery) {
    const where: Prisma.SupportThreadWhereInput = { userId };
    if (query.status && query.status in TicketStatus) {
      where.status = query.status as TicketStatus;
    }
    if (query.category && query.category in TicketCategory) {
      where.category = query.category as TicketCategory;
    }
    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        {
          messages: {
            some: { body: { contains: query.search, mode: 'insensitive' } },
          },
        },
      ];
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.supportThread.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.supportThread.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async getForUser(userId: string, threadId: string) {
    const thread = await this.prisma.supportThread.findFirst({
      where: { id: threadId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!thread) {
      throw new NotFoundException('Message thread not found');
    }
    return thread;
  }

  async listForAdmin(query: ListMessagesQuery) {
    const where: Prisma.SupportThreadWhereInput = {};
    if (query.status && query.status in TicketStatus) {
      where.status = query.status as TicketStatus;
    }
    if (query.category && query.category in TicketCategory) {
      where.category = query.category as TicketCategory;
    }
    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        {
          user: { fullName: { contains: query.search, mode: 'insensitive' } },
        },
        {
          user: { email: { contains: query.search, mode: 'insensitive' } },
        },
      ];
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.supportThread.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          messages: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.supportThread.count({ where }),
    ]);

    return { data, page, pageSize, total };
  }

  async reply(threadId: string, adminUserId: string, body: string) {
    await this.ensureThread(threadId);
    return this.prisma.supportThread.update({
      where: { id: threadId },
      data: {
        status: TicketStatus.REPLIED,
        messages: {
          create: {
            senderUserId: adminUserId,
            senderRole: UserRole.ADMIN,
            body,
          },
        },
      },
      include: {
        messages: true,
      },
    });
  }

  async resolve(threadId: string) {
    await this.ensureThread(threadId);
    return this.prisma.supportThread.update({
      where: { id: threadId },
      data: { status: TicketStatus.RESOLVED },
    });
  }

  private async ensureThread(threadId: string) {
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId },
      select: { id: true },
    });
    if (!thread) {
      throw new NotFoundException('Message thread not found');
    }
  }
}
