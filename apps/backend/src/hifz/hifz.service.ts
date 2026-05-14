import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertHifzEntryDto } from './dto/upsert-hifz-entry.dto';
import { BulkSyncHifzDto } from './dto/bulk-sync-hifz.dto';

@Injectable()
export class HifzService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.hifzEntry.findMany({
      where: { userId },
      orderBy: { nextReview: 'asc' },
    });
  }

  async upsert(userId: string, dto: UpsertHifzEntryDto) {
    return this.prisma.hifzEntry.upsert({
      where: {
        userId_surahId_ayahFrom_ayahTo: {
          userId,
          surahId: dto.surahId,
          ayahFrom: dto.ayahFrom,
          ayahTo: dto.ayahTo,
        },
      },
      update: {
        interval: dto.interval,
        ease: dto.ease,
        repetitions: dto.repetitions,
        lastScore: dto.lastScore ?? null,
        nextReview: new Date(dto.nextReview),
        surahName: dto.surahName,
      },
      create: {
        userId,
        surahId: dto.surahId,
        surahName: dto.surahName,
        ayahFrom: dto.ayahFrom,
        ayahTo: dto.ayahTo,
        interval: dto.interval,
        ease: dto.ease,
        repetitions: dto.repetitions,
        lastScore: dto.lastScore ?? null,
        nextReview: new Date(dto.nextReview),
      },
    });
  }

  async bulkSync(userId: string, dto: BulkSyncHifzDto) {
    const results = await Promise.all(
      dto.entries.map((entry) => this.upsert(userId, entry)),
    );
    return { synced: results.length };
  }

  async remove(userId: string, surahId: number, ayahFrom: number, ayahTo: number) {
    await this.prisma.hifzEntry.deleteMany({
      where: { userId, surahId, ayahFrom, ayahTo },
    });
    return { deleted: true };
  }

  async getStats(userId: string) {
    const entries = await this.prisma.hifzEntry.findMany({ where: { userId } });
    const now = new Date();
    const due = entries.filter((e) => new Date(e.nextReview) <= now).length;
    const total = entries.length;
    const mastered = entries.filter((e) => e.repetitions >= 5).length;
    return { total, due, mastered };
  }
}
