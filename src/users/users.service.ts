import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersQuery } from './dto/list-users.query';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {
      role: { in: ['CLIENT', 'ADMIN', 'SUPER_ADMIN'] },
    };
    if (query.status && query.status in UserStatus) {
      where.status = query.status as UserStatus;
    }
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          accounts: {
            select: {
              availableBalance: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map((u) => ({
        ...u,
        totalBalance: u.accounts.reduce(
          (sum, account) => sum + Number(account.availableBalance),
          0,
        ),
      })),
      page,
      pageSize,
      total,
    };
  }

  async getById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        accounts: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(userId: string, dto: UpdateAdminUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        accounts: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const nextEmail = dto.email?.toLowerCase();
    if (nextEmail && nextEmail !== existingUser.email) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      });
      if (emailTaken) {
        throw new BadRequestException('Email already exists');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.amount !== undefined) {
        if (existingUser.accounts.length === 0) {
          throw new BadRequestException(
            'Cannot update amount because this user has no account',
          );
        }

        if (existingUser.accounts.length > 1) {
          throw new BadRequestException(
            'Cannot update amount for users with multiple accounts',
          );
        }

        await tx.account.update({
          where: { id: existingUser.accounts[0].id },
          data: {
            availableBalance: new Prisma.Decimal(dto.amount),
            ledgerBalance: new Prisma.Decimal(dto.amount),
          },
        });
      }

      const user = await tx.user.update({
        where: { id: userId },
        data: {
          fullName: dto.fullName,
          email: nextEmail,
          phone: dto.phone,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          updatedAt: true,
          accounts: {
            select: {
              id: true,
              availableBalance: true,
              ledgerBalance: true,
              currency: true,
            },
          },
        },
      });

      return {
        ...user,
        amount:
          user.accounts.length === 1 ? user.accounts[0].availableBalance : null,
      };
    });
  }

  async updateStatus(userId: string, dto: UpdateUserStatusDto) {
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status: dto.status,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
      },
    });
  }
}
