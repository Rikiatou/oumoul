import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { REMINDER_QUEUE, ReminderJobType } from './reminder.constants';
import { ReminderJobData } from './reminders.service';
import { PushService } from './push.service';

@Processor(REMINDER_QUEUE)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(private readonly pushService: PushService) {
    super();
  }

  async process(job: Job<ReminderJobData, unknown, ReminderJobType>) {
    const { userId, scheduledAt, payload } = job.data;
    const runAt = scheduledAt ?? new Date().toISOString();

    this.logger.log(
      `Executing reminder [${job.name}] for user ${userId} at ${runAt}` + (payload ? ` payload=${JSON.stringify(payload)}` : ''),
    );

    await this.deliver(job.name, job.data);
  }

  @OnWorkerEvent('failed')
  onFailed([job, err]: [Job | undefined, Error]) {
    if (job) {
      this.logger.error(`Reminder job ${job.id} failed`, err.stack);
    } else {
      this.logger.error(`Reminder job failed`, err.stack);
    }
  }

  private async deliver(type: ReminderJobType, data: ReminderJobData) {
    let title: string;
    let body: string;

    switch (type) {
      case ReminderJobType.AfterEid:
        title = 'Après Ramadan';
        body = "Pense à tes jours à rattraper in shâ Allah.";
        break;
      case ReminderJobType.WeeklyMonday:
      case ReminderJobType.WeeklyThursday:
        title = 'Jeûne surérogatoire';
        body = 'Petit rappel pour le jeûne du jour 🌙';
        break;
      case ReminderJobType.Monthly:
        title = 'Rappel mensuel';
        body = 'Prends un instant pour faire le point sur ton jeûne et ton programme.';
        break;
      case ReminderJobType.ImaneProgramDaily:
        title = 'Programme Imane';
        body = 'As-tu avancé dans ton programme Imane aujourd’hui ?';
        break;
      case ReminderJobType.RamadanDailyCheckin:
        title = 'Ramadan – check-in du jour';
        body = 'Comment s’est passée ta journée de jeûne ? Pense à compléter ton suivi.';
        break;
      case ReminderJobType.Custom:
      default:
        title = 'Rappel';
        body = 'Tu as un rappel programmé.';
        break;
    }

    await this.pushService.sendToUser(data.userId, {
      title,
      body,
      data: {
        type,
        scheduledAt: data.scheduledAt,
        payload: data.payload ?? null,
      },
    });
  }
}
