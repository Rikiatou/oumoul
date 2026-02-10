import { Module } from '@nestjs/common';
import { FastingService } from './fasting.service';
import { FastingController } from './fasting.controller';
import { RemindersModule } from '../reminders/reminders.module';

@Module({
  imports: [RemindersModule],
  controllers: [FastingController],
  providers: [FastingService],
  exports: [FastingService],
})
export class FastingModule {}
