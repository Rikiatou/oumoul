import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FastingLogStatus } from '@prisma/client';

export interface RamadanDaySummaryDto {
  date: string; // YYYY-MM-DD
  fastStatus: FastingLogStatus | null;
  cycleStatus: string | null;
  notes: string | null;
}

export interface UpsertRamadanDayDto {
  date: string; // YYYY-MM-DD
  fastStatus: FastingLogStatus;
  notes?: string | null;
}

@Injectable()
export class RamadanService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string, year: number): Promise<RamadanDaySummaryDto[]> {
    const { start, end } = this.getRamadanRangeUtc(year);

    const [fastingLogs, cycleDays] = await this.prisma.$transaction([
      this.prisma.fastingLog.findMany({
        where: {
          userId,
          date: {
            gte: start,
            lt: end,
          },
        },
      }),
      this.prisma.cycleDay.findMany({
        where: {
          userId,
          date: {
            gte: start,
            lt: end,
          },
        },
      }),
    ]);

    const fastingByDate = new Map<string, { status: FastingLogStatus; notes: string | null }>();
    for (const log of fastingLogs) {
      const iso = log.date.toISOString().slice(0, 10);
      fastingByDate.set(iso, { status: log.status, notes: log.notes ?? null });
    }

    const cycleByDate = new Map<string, string>();
    for (const day of cycleDays) {
      const iso = day.date.toISOString().slice(0, 10);
      cycleByDate.set(iso, day.status);
    }

    const days: RamadanDaySummaryDto[] = [];
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      const fasting = fastingByDate.get(iso) ?? null;
      const cycleStatus = cycleByDate.get(iso) ?? null;

      days.push({
        date: iso,
        fastStatus: fasting ? fasting.status : null,
        cycleStatus,
        notes: fasting ? fasting.notes : null,
      });
    }

    return days;
  }

  async upsertDay(userId: string, dto: UpsertRamadanDayDto) {
    const date = this.parseDate(dto.date, 'date');

    const log = await this.prisma.fastingLog.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      update: {
        status: dto.fastStatus,
        notes: dto.notes ?? null,
      },
      create: {
        userId,
        date,
        status: dto.fastStatus,
        notes: dto.notes ?? null,
      },
    });

    return {
      id: log.id,
      date: log.date.toISOString().slice(0, 10),
      fastStatus: log.status,
      notes: log.notes ?? null,
    };
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private getRamadanRangeUtc(year: number): { start: Date; end: Date } {
    // Real Ramadan ranges (approx, civil calendar) for a few years, in UTC.
    // These can be extended/adjusted as needed.
    const ranges: Record<number, { start: string; end: string }> = {
      2024: { start: '2024-03-11', end: '2024-04-09' },
      2025: { start: '2025-03-01', end: '2025-03-29' },
      2026: { start: '2026-02-18', end: '2026-03-19' },
      2027: { start: '2027-02-07', end: '2027-03-08' },
      2028: { start: '2028-01-28', end: '2028-02-26' },
      2029: { start: '2029-01-17', end: '2029-02-14' },
      2030: { start: '2030-01-06', end: '2030-02-04' },
    };

    const range = ranges[year];
    if (!range) {
      throw new BadRequestException(`Ramadan range not configured for year ${year}`);
    }

    // end is exclusive, so add 1 day
    const start = new Date(`${range.start}T00:00:00.000Z`);
    const dayAfterEnd = new Date(`${range.end}T00:00:00.000Z`);
    dayAfterEnd.setUTCDate(dayAfterEnd.getUTCDate() + 1);

    return { start, end: dayAfterEnd };
  }
}
