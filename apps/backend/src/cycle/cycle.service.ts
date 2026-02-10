import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CycleStatus } from '@prisma/client';

@Injectable()
export class CycleService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonth(userId: string, year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const days = await this.prisma.cycleDay.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { date: 'asc' },
    });

    return days.map((day) => ({
      date: day.date.toISOString().slice(0, 10),
      status: day.status,
      notes: day.notes ?? null,
    }));
  }

  async upsertDay(userId: string, dateIso: string, status: CycleStatus, notes?: string | null) {
    const date = new Date(`${dateIso}T00:00:00.000Z`);

    const day = await this.prisma.cycleDay.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      update: {
        status,
        notes: notes ?? null,
      },
      create: {
        userId,
        date,
        status,
        notes: notes ?? null,
      },
    });

    return {
      date: day.date.toISOString().slice(0, 10),
      status: day.status,
      notes: day.notes ?? null,
    };
  }
}
