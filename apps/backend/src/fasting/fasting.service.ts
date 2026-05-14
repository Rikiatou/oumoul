import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, FastingLogStatus, MakeupStrategy, PlanEntryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RemindersService } from '../reminders/reminders.service';
import { ReminderJobType } from '../reminders/reminder.constants';
import { CreateFastingLogDto } from './dto/create-fasting-log.dto';
import { UpdateFastingLogDto } from './dto/update-fasting-log.dto';
import { GetFastingLogsDto } from './dto/get-fasting-logs.dto';
import { CreateMakeupPlanDto } from './dto/create-makeup-plan.dto';
import { PlanEntryStatusDto } from './dto/fasting.enums';

@Injectable()
export class FastingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reminders: RemindersService,
  ) {}

  async upsertLog(userId: string, dto: CreateFastingLogDto) {
    const date = this.parseDate(dto.date, 'date');

    const status = dto.status as FastingLogStatus;

    const log = await this.prisma.fastingLog.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      update: {
        status,
        notes: dto.notes,
      },
      create: {
        userId,
        date,
        status,
        notes: dto.notes,
      },
    });

    return log;
  }

  async listLogs(userId: string, query: GetFastingLogsDto) {
    const where: Prisma.FastingLogWhereInput = {
      userId,
    };

    if (query.startDate || query.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.startDate) {
        dateFilter.gte = this.parseDate(query.startDate, 'startDate');
      }
      if (query.endDate) {
        const end = this.parseDate(query.endDate, 'endDate');
        dateFilter.lte = end;
      }
      where.date = dateFilter;
    }

    return this.prisma.fastingLog.findMany({
      where,
      orderBy: { date: 'asc' },
      take: query.limit ?? 100,
      skip: query.offset ?? 0,
    });
  }

  async updateLog(userId: string, logId: string, dto: UpdateFastingLogDto) {
    const existing = await this.prisma.fastingLog.findFirst({
      where: { id: logId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Fasting log not found');
    }

    return this.prisma.fastingLog.update({
      where: { id: logId },
      data: {
        status: dto.status ? (dto.status as FastingLogStatus) : undefined,
        notes: dto.notes,
        date: dto.date ? this.parseDate(dto.date, 'date') : undefined,
      },
    });
  }

  async removeLog(userId: string, logId: string) {
    const existing = await this.prisma.fastingLog.findFirst({
      where: { id: logId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Fasting log not found');
    }

    await this.prisma.fastingLog.delete({ where: { id: logId } });

    return { deleted: true };
  }

  async createPlan(userId: string, dto: CreateMakeupPlanDto) {
    const strategy = dto.strategy as MakeupStrategy;
    const startDate = dto.startDate ? this.parseDate(dto.startDate, 'startDate') : new Date();
    const scheduledDates = this.generateSchedule(strategy, startDate, dto.targetDays, dto.scheduledDates);

    return this.prisma.$transaction(async (tx) => {
      // deactivate existing active plans
      await tx.makeupPlan.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });

      const plan = await tx.makeupPlan.create({
        data: {
          userId,
          strategy,
          title: dto.title,
          startDate,
          targetDays: dto.targetDays,
          entries: {
            create: scheduledDates.map((date) => ({
              scheduledDate: date,
            })),
          },
        },
        include: {
          entries: { orderBy: { scheduledDate: 'asc' } },
        },
      });

      await this.scheduleRemindersForPlan(userId, plan.strategy, startDate);

      return plan;
    });
  }

  async getActivePlan(userId: string) {
    return this.prisma.makeupPlan.findFirst({
      where: { userId, isActive: true },
      include: { entries: { orderBy: { scheduledDate: 'asc' } } },
    });
  }

  async updatePlanEntry(userId: string, planId: string, entryId: string, statusDto: PlanEntryStatusDto, notes?: string) {
    const status = statusDto as PlanEntryStatus;

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.makeupPlanEntry.findFirst({
        where: { id: entryId, planId, plan: { userId } },
      });

      if (!entry) {
        throw new NotFoundException('Plan entry not found');
      }

      const updatedEntry = await tx.makeupPlanEntry.update({
        where: { id: entryId },
        data: {
          status,
          notes,
          completedAt: status === PlanEntryStatus.Completed ? new Date() : null,
        },
      });

      const completedCount = await tx.makeupPlanEntry.count({
        where: { planId, status: PlanEntryStatus.Completed },
      });

      await tx.makeupPlan.update({ where: { id: planId }, data: { completedDays: completedCount } });

      if (status === PlanEntryStatus.Completed) {
        await this.reminders.scheduleCustom(userId, new Date(), {
          planId,
          entryId,
          status,
        });
      }

      return updatedEntry;
    });
  }

  async deactivatePlan(userId: string, planId: string) {
    const existing = await this.prisma.makeupPlan.findFirst({ where: { id: planId, userId } });
    if (!existing) {
      throw new NotFoundException('Plan not found');
    }

    return this.prisma.makeupPlan.update({
      where: { id: planId },
      data: { isActive: false },
    });
  }

  async summary(userId: string) {
    const [counts, plans] = await this.prisma.$transaction([
      this.prisma.fastingLog.groupBy({
        by: ['status'],
        where: { userId },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.makeupPlan.findMany({
        where: { userId },
        select: {
          id: true,
          strategy: true,
          targetDays: true,
          completedDays: true,
          isActive: true,
        },
      }),
    ]);

    const statusCounts = counts.reduce<Partial<Record<FastingLogStatus, number>>>((acc, item) => {
      const total = typeof item._count === 'object' && item._count && '_all' in item._count
        ? (item._count as { _all?: number })._all ?? 0
        : 0;
      acc[item.status as FastingLogStatus] = total;
      return acc;
    }, {});

    const missed = statusCounts[FastingLogStatus.MISSED] ?? 0;
    const madeUp = statusCounts[FastingLogStatus.MADE_UP] ?? 0;
    const outstandingMakeupDays = Math.max(0, missed - madeUp);

    return {
      statusCounts,
      outstandingMakeupDays,
      plans,
    };
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private generateSchedule(
    strategy: MakeupStrategy,
    startDate: Date,
    targetDays: number,
    scheduledDates?: string[],
  ): Date[] {
    if (scheduledDates?.length) {
      return scheduledDates.map((value) => this.parseDate(value, 'scheduledDates')).slice(0, targetDays);
    }

    const dates: Date[] = [];
    const cursor = new Date(startDate);

    switch (strategy) {
      case MakeupStrategy.SixDaysAfterEid: {
        for (let i = 0; i < targetDays; i += 1) {
          dates.push(new Date(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }
        break;
      }
      case MakeupStrategy.MondaysThursdays: {
        while (dates.length < targetDays) {
          const day = cursor.getDay();
          if (day === 1 || day === 4) {
            dates.push(new Date(cursor));
          }
          cursor.setDate(cursor.getDate() + 1);
        }
        break;
      }
      case MakeupStrategy.WhiteDays: {
        throw new BadRequestException('WhiteDays strategy requires an explicit scheduledDates list.');
      }
      case MakeupStrategy.Custom:
      default: {
        throw new BadRequestException('Custom strategy requires an explicit scheduledDates list.');
      }
    }

    return dates;
  }

  private async scheduleRemindersForPlan(userId: string, strategy: MakeupStrategy, startDate: Date) {
    switch (strategy) {
      case MakeupStrategy.MondaysThursdays: {
        await this.reminders.scheduleWeekly(userId, ReminderJobType.WeeklyMonday, startDate, 1);
        await this.reminders.scheduleWeekly(userId, ReminderJobType.WeeklyThursday, startDate, 4);
        break;
      }
      case MakeupStrategy.SixDaysAfterEid: {
        await this.reminders.scheduleAfterEid(userId, startDate);
        break;
      }
      case MakeupStrategy.WhiteDays: {
        await this.reminders.scheduleMonthly(userId, startDate);
        break;
      }
      case MakeupStrategy.Custom:
      default:
        break;
    }
  }

}
