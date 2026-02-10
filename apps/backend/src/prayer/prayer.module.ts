import { Module } from '@nestjs/common';
import { PrayerController } from './prayer.controller';
import { PrayerService } from './prayer.service';
import { AladhanModule } from '../aladhan/aladhan.module';

@Module({
  imports: [AladhanModule],
  controllers: [PrayerController],
  providers: [PrayerService],
})
export class PrayerModule {}
