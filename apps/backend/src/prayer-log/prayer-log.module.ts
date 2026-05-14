import { Module } from '@nestjs/common';
import { PrayerLogController } from './prayer-log.controller';
import { PrayerLogService } from './prayer-log.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrayerLogController],
  providers: [PrayerLogService],
})
export class PrayerLogModule {}
