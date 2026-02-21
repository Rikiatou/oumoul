import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DhikrService } from './dhikr.service';
import { DhikrController } from './dhikr.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DhikrController],
  providers: [DhikrService],
  exports: [DhikrService],
})
export class DhikrModule {}
