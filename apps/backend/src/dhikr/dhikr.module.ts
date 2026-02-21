import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DhikrService } from './dhikr.service';
import { DhikrController } from './dhikr.controller';
import { DhikrAdminController } from './dhikr-admin.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DhikrController, DhikrAdminController],
  providers: [DhikrService],
  exports: [DhikrService],
})
export class DhikrModule {}
