import { Module } from '@nestjs/common';
import { QuranService } from './quran.service';
import { QuranController } from './quran.controller';

@Module({
  providers: [QuranService],
  controllers: [QuranController],
})
export class QuranModule {}
