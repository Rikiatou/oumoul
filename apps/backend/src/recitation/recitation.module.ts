import { Module } from '@nestjs/common';
import { RecitationController } from './recitation.controller';
import { RecitationService } from './recitation.service';

@Module({
  controllers: [RecitationController],
  providers: [RecitationService],
})
export class RecitationModule {}
