import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async sendToUser(userId: string, payload: PushPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true, pushPlatform: true },
    });

    if (!user?.pushToken) {
      this.logger.debug(`No pushToken for user ${userId}, skipping push`);
      return;
    }

    const expoAccessToken = this.configService.get<string>('EXPO_ACCESS_TOKEN');
    const expoEnabled = this.configService.get<string>('EXPO_PUSH_ENABLED') === 'true';

    // If Expo is not configured, just log so we do not break reminders.
    if (!expoEnabled || !expoAccessToken) {
      this.logger.log(
        `Push (dry-run, Expo disabled) to user ${userId} token=${user.pushToken}: ${payload.title} - ${payload.body}`,
      );
      return;
    }

    try {
      const body = {
        to: user.pushToken,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${expoAccessToken}`,
        },
        body: JSON.stringify(body),
      });

      const json = (await response.json()) as unknown;

      if (!response.ok) {
        this.logger.error(`Expo push failed for user ${userId}: ${JSON.stringify(json)}`);
        return;
      }

      this.logger.log(`Expo push sent to user ${userId}: ${JSON.stringify(json)}`);
    } catch (error) {
      this.logger.error(`Error while sending Expo push to user ${userId}: ${(error as Error).message}`);
    }
  }
}
