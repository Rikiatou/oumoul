import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { REMINDER_QUEUE, ReminderJobType } from './reminder.constants';
import { PrismaService } from '../prisma/prisma.service';
import { ReminderType } from '@prisma/client';

export interface ReminderJobData {
  userId: string;
  type: ReminderJobType;
  payload?: Record<string, unknown>;
  scheduledAt: string;
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectQueue(REMINDER_QUEUE) private readonly reminderQueue: Queue<ReminderJobData>,
    private readonly prisma: PrismaService,
  ) {}

  async scheduleAfterEid(userId: string, date: Date) {
    if (!(await this.isEnabled(userId, ReminderJobType.AfterEid))) return;

    const target = this.applySendTime(new Date(date), await this.getSendTime(userId, ReminderJobType.AfterEid));
    const scheduledAt = this.toIso(target);

    await this.reminderQueue.add(
      ReminderJobType.AfterEid,
      { userId, type: ReminderJobType.AfterEid, scheduledAt },
      {
        jobId: this.jobId(userId, ReminderJobType.AfterEid),
        delay: Math.max(target.getTime() - Date.now(), 0),
      },
    );

    this.logger.log(`Scheduled After-Eid reminder for user ${userId} at ${scheduledAt}`);
  }

  async scheduleWeekly(
    userId: string,
    type: ReminderJobType.WeeklyMonday | ReminderJobType.WeeklyThursday,
    baseDate: Date,
    weekday: number,
  ) {
    if (!(await this.isEnabled(userId, type))) {
      await this.removeReminder(userId, type);
      return;
    }

    const sendTime = await this.getSendTime(userId, type);
    const firstRun = this.nextWeekdayWithTime(baseDate, weekday, sendTime);
    const scheduledAt = this.toIso(firstRun);

    await this.reminderQueue.add(
      type,
      { userId, type, scheduledAt },
      {
        jobId: this.jobId(userId, type),
        delay: Math.max(firstRun.getTime() - Date.now(), 0),
        repeat: { every: 7 * 24 * 60 * 60 * 1000 },
      },
    );

    this.logger.log(`Scheduled ${type} reminder for user ${userId} starting ${scheduledAt}`);
  }

  async scheduleMonthly(userId: string, baseDate: Date) {
    if (!(await this.isEnabled(userId, ReminderJobType.Monthly))) {
      await this.removeReminder(userId, ReminderJobType.Monthly);
      return;
    }

    const sendTime = await this.getSendTime(userId, ReminderJobType.Monthly);
    const firstRun = this.nextMonthlyOccurrence(baseDate, sendTime);
    const scheduledAt = this.toIso(firstRun);

    await this.reminderQueue.add(
      ReminderJobType.Monthly,
      { userId, type: ReminderJobType.Monthly, scheduledAt },
      {
        jobId: this.jobId(userId, ReminderJobType.Monthly),
        delay: Math.max(firstRun.getTime() - Date.now(), 0),
        repeat: { every: 30 * 24 * 60 * 60 * 1000 },
      },
    );

    this.logger.log(`Scheduled monthly reminder for user ${userId} starting ${scheduledAt}`);
  }

  async scheduleCustom(userId: string, date: Date, payload?: Record<string, unknown>) {
    if (!(await this.isEnabled(userId, ReminderJobType.Custom))) return;

    const target = this.applySendTime(new Date(date), await this.getSendTime(userId, ReminderJobType.Custom));
    const scheduledAt = this.toIso(target);
    await this.reminderQueue.add(ReminderJobType.Custom, {
      userId,
      type: ReminderJobType.Custom,
      payload,
      scheduledAt,
    });
  }

  async upsertPreference(
    userId: string,
    type: ReminderJobType,
    isEnabled: boolean,
    sendTime?: string,
  ) {
    const prismaType = type as unknown as ReminderType;

    const preference = await this.prisma.reminderPreference.upsert({
      where: {
        id: `${userId}:${type}`,
      },
      update: { isEnabled, sendTime },
      create: { id: `${userId}:${type}`, userId, type: prismaType, isEnabled, sendTime },
    });

    await this.rescheduleForPreference(userId, type);
    return preference;
  }

  async listPreferences(userId: string) {
    const preferences = await this.prisma.reminderPreference.findMany({ where: { userId } });
    const map = new Map<ReminderJobType, { isEnabled: boolean; sendTime: string | null }>();

    preferences.forEach((pref) => {
      map.set(pref.type as ReminderJobType, {
        isEnabled: pref.isEnabled,
        sendTime: pref.sendTime,
      });
    });

    return (Object.values(ReminderJobType) as ReminderJobType[]).map((type) => {
      const pref = map.get(type);
      return {
        type,
        isEnabled: pref?.isEnabled ?? true,
        sendTime: pref?.sendTime ?? null,
      };
    });
  }

  private async rescheduleForPreference(userId: string, type: ReminderJobType) {
    switch (type) {
      case ReminderJobType.WeeklyMonday:
        await this.scheduleWeekly(userId, type, new Date(), 1);
        break;
      case ReminderJobType.WeeklyThursday:
        await this.scheduleWeekly(userId, type, new Date(), 4);
        break;
      case ReminderJobType.Monthly:
        await this.scheduleMonthly(userId, new Date());
        break;
      case ReminderJobType.ImaneProgramDaily:
      case ReminderJobType.RamadanDailyCheckin:
        await this.scheduleDaily(userId, type, new Date());
        break;
      case ReminderJobType.Custom:
      case ReminderJobType.AfterEid:
      default:
        if (!(await this.isEnabled(userId, type))) {
          await this.removeReminder(userId, type);
        }
        break;
    }
  }

  private toIso(date: Date) {
    return date.toISOString();
  }

  private jobId(userId: string, type: ReminderJobType) {
    return `${type}:${userId}`;
  }

  private async removeReminder(userId: string, type: ReminderJobType) {
    const jobId = this.jobId(userId, type);
    try {
      await this.reminderQueue.remove(jobId);
    } catch (error) {
      this.logger.warn(`Failed removing job ${jobId}: ${(error as Error).message}`);
    }
  }

  private async isEnabled(userId: string, type: ReminderJobType) {
    const pref = await this.prisma.reminderPreference.findUnique({
      where: { id: `${userId}:${type}` },
      select: { isEnabled: true },
    });

    return pref?.isEnabled ?? true;
  }

  private async getSendTime(userId: string, type: ReminderJobType) {
    const pref = await this.prisma.reminderPreference.findUnique({
      where: { id: `${userId}:${type}` },
      select: { sendTime: true },
    });

    return pref?.sendTime ?? undefined;
  }

  private applySendTime(date: Date, sendTime?: string) {
    if (!sendTime) return date;

    const [hours, minutes] = sendTime.split(':').map((value) => Number.parseInt(value, 10));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return date;

    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private nextWeekdayWithTime(base: Date, weekday: number, sendTime?: string) {
    const candidate = new Date(base);
    candidate.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i += 1) {
      if (candidate.getDay() === weekday) {
        this.applySendTime(candidate, sendTime);
        if (candidate.getTime() > Date.now()) {
          return candidate;
        }
      }
      candidate.setDate(candidate.getDate() + 1);
    }
    return this.applySendTime(new Date(base), sendTime);
  }

  private nextMonthlyOccurrence(base: Date, sendTime?: string) {
    const target = new Date(base);
    target.setHours(0, 0, 0, 0);
    this.applySendTime(target, sendTime);
    if (target.getTime() <= Date.now()) {
      target.setMonth(target.getMonth() + 1);
    }
    return target;
  }

  private async scheduleDaily(
    userId: string,
    type: ReminderJobType.ImaneProgramDaily | ReminderJobType.RamadanDailyCheckin,
    baseDate: Date,
  ) {
    if (!(await this.isEnabled(userId, type))) {
      await this.removeReminder(userId, type);
      return;
    }

    const sendTime = await this.getSendTime(userId, type);
    let firstRun: Date;

    if (type === ReminderJobType.RamadanDailyCheckin) {
      const ramadanRange = this.getRamadanRangeUtc(baseDate.getUTCFullYear());
      if (!ramadanRange) {
        this.logger.warn(`Ramadan range not configured for year ${baseDate.getUTCFullYear()}, disabling ${type} for user ${userId}`);
        await this.removeReminder(userId, type);
        return;
      }

      const { start, end } = ramadanRange;

      const now = new Date();
      const base = new Date(Math.max(now.getTime(), start.getTime()));
      firstRun = this.nextDailyOccurrence(base, sendTime);

      if (firstRun.getTime() > end.getTime()) {
        // Ramadan is already over for this year: no scheduling
        await this.removeReminder(userId, type);
        return;
      }

      const scheduledAt = this.toIso(firstRun);

      await this.reminderQueue.add(
        type,
        { userId, type, scheduledAt },
        {
          jobId: this.jobId(userId, type),
          delay: Math.max(firstRun.getTime() - Date.now(), 0),
          repeat: {
            every: 24 * 60 * 60 * 1000,
            endDate: end.getTime(),
          },
        },
      );

      this.logger.log(`Scheduled Ramadan daily check-in for user ${userId} starting ${scheduledAt} until ${end.toISOString()}`);
      return;
    }

    // Generic daily scheduling (ImaneProgramDaily and any future daily types)
    firstRun = this.nextDailyOccurrence(baseDate, sendTime);
    const scheduledAt = this.toIso(firstRun);

    await this.reminderQueue.add(
      type,
      { userId, type, scheduledAt },
      {
        jobId: this.jobId(userId, type),
        delay: Math.max(firstRun.getTime() - Date.now(), 0),
        repeat: { every: 24 * 60 * 60 * 1000 },
      },
    );

    this.logger.log(`Scheduled daily reminder (${type}) for user ${userId} starting ${scheduledAt}`);
  }

  private nextDailyOccurrence(base: Date, sendTime?: string) {
    const target = new Date(base);
    target.setHours(0, 0, 0, 0);
    this.applySendTime(target, sendTime);
    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1);
      this.applySendTime(target, sendTime);
    }
    return target;
  }

  private getRamadanRangeUtc(year: number): { start: Date; end: Date } | null {
    const ranges: Record<number, { start: string; end: string }> = {
      2024: { start: '2024-03-11', end: '2024-04-10' },
      2025: { start: '2025-03-01', end: '2025-03-30' },
      2026: { start: '2026-02-18', end: '2026-03-19' },
      2027: { start: '2027-02-08', end: '2027-03-09' },
      2028: { start: '2028-01-28', end: '2028-02-26' },
    };

    const range = ranges[year];
    if (!range) return null;

    const start = new Date(`${range.start}T00:00:00.000Z`);
    const dayAfterEnd = new Date(`${range.end}T00:00:00.000Z`);
    dayAfterEnd.setUTCDate(dayAfterEnd.getUTCDate() + 1);

    return { start, end: dayAfterEnd };
  }
}
