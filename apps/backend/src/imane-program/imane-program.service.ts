import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ImaneProgramItems {
  coranTilawa: boolean;
  dhikrMatinSoir: boolean;
  duasPersonnelles: boolean;
  sadaqa: boolean;
  autreBienfait: boolean;
}

@Injectable()
export class ImaneProgramService {
  constructor(private readonly prisma: PrismaService) {}

  async getProgramForDate(userId: string, date: Date): Promise<ImaneProgramItems> {
    const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const existing = await this.prisma.imaneProgramDay.findUnique({
      where: {
        userId_date: {
          userId,
          date: startOfDay,
        },
      },
    });

    if (!existing) {
      return {
        coranTilawa: false,
        dhikrMatinSoir: false,
        duasPersonnelles: false,
        sadaqa: false,
        autreBienfait: false,
      };
    }

    return {
      coranTilawa: existing.coranTilawa,
      dhikrMatinSoir: existing.dhikrMatinSoir,
      duasPersonnelles: existing.duasPersonnelles,
      sadaqa: existing.sadaqa,
      autreBienfait: existing.autreBienfait,
    };
  }

  async upsertProgramForDate(userId: string, date: Date, items: ImaneProgramItems) {
    const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

    await this.prisma.imaneProgramDay.upsert({
      where: {
        userId_date: {
          userId,
          date: startOfDay,
        },
      },
      create: {
        userId,
        date: startOfDay,
        ...items,
      },
      update: {
        ...items,
      },
    });

    return { date: startOfDay.toISOString(), items };
  }

  async getProgramsForMonth(userId: string, year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const rows = await this.prisma.imaneProgramDay.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lt: end,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      items: {
        coranTilawa: row.coranTilawa,
        dhikrMatinSoir: row.dhikrMatinSoir,
        duasPersonnelles: row.duasPersonnelles,
        sadaqa: row.sadaqa,
        autreBienfait: row.autreBienfait,
      } as ImaneProgramItems,
    }));
  }
}
