import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CycleService } from './cycle.service';
import { CycleController } from './cycle.controller';

@Module({
  imports: [PrismaModule],
  providers: [CycleService],
  controllers: [CycleController],
})
export class CycleModule {}
