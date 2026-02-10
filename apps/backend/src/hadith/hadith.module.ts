import { Module } from '@nestjs/common';
import { HadithService } from './hadith.service';
import { HadithController } from './hadith.controller';

@Module({
  providers: [HadithService],
  controllers: [HadithController],
})
export class HadithModule {}
