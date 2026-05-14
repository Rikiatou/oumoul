import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrayerName, PrayerLogStatus } from '@prisma/client';
import { UpsertPrayerLogDto } from './dto/upsert-prayer-log.dto';
import { BulkSyncPrayerLogDto } from './dto/bulk-sync-prayer-log.dto';

@Injectable()
export class PrayerLogService {
  constructor(private readonly prisma: PrismaService) {}

  async findByDateRange(userId: string, from: string, to: string) {
    const fromDate = new Date(from + 'T00:00:00.000Z');
    const toDate = new Date(to + 'T23:59:59.999Z');
    return this.prisma.prayerLog.findMany({
      where: { userId, date: { gte: fromDate, lte: toDate } },
      orderBy: [{ date: 'asc' }, { prayer: 'asc' }],
    });
  }

  async upsert(userId: string, dto: UpsertPrayerLogDto) {
    const date = new Date(dto.date + 'T00:00:00.000Z');
    return this.prisma.prayerLog.upsert({
      where: {
        userId_date_prayer: {
          userId,
          date,
          prayer: dto.prayer as PrayerName,
        },
      },
      update: { status: dto.status as PrayerLogStatus },
      create: {
        userId,
        date,
        prayer: dto.prayer as PrayerName,
        status: dto.status as PrayerLogStatus,
      },
    });
  }

  async bulkSync(userId: string, dto: BulkSyncPrayerLogDto) {
    const results = await Promise.all(
      dto.logs.map((log) => this.upsert(userId, log)),
    );
    return { synced: results.length };
  }

  async getStats(userId: string, days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const logs = await this.prisma.prayerLog.findMany({
      where: { userId, date: { gte: from } },
    });

    const total = logs.length;
    const onTime = logs.filter((l) => l.status === PrayerLogStatus.PRAYED_ON_TIME).length;
    const late = logs.filter((l) => l.status === PrayerLogStatus.PRAYED_LATE).length;
    const missed = logs.filter((l) => l.status === PrayerLogStatus.MISSED).length;

    // Streak: consecutive days with all 5 prayers prayed
    const byDate = new Map<string, typeof logs>();
    for (const log of logs) {
      const key = log.date.toISOString().slice(0, 10);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(log);
    }

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayLogs = byDate.get(key) ?? [];
      const prayedCount = dayLogs.filter(
        (l) => l.status === PrayerLogStatus.PRAYED_ON_TIME || l.status === PrayerLogStatus.PRAYED_LATE,
      ).length;
      if (prayedCount === 5) streak++;
      else if (i > 0) break;
    }

    return { total, onTime, late, missed, streak };
  }
}
