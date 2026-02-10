import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { RemindersController } from './reminders.controller';
import { ReminderProcessor } from './reminder.processor';
import { RemindersService } from './reminders.service';
import { PushService } from './push.service';
import { REMINDER_QUEUE } from './reminder.constants';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
        },
      }),
    }),
    BullModule.registerQueue({
      name: REMINDER_QUEUE,
    }),
  ],
  controllers: [RemindersController],
  providers: [RemindersService, ReminderProcessor, PushService],
  exports: [RemindersService],
})
export class RemindersModule {}
