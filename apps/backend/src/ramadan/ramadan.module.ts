import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RamadanService } from './ramadan.service';
import { RamadanController } from './ramadan.controller';

@Module({
  imports: [PrismaModule],
  providers: [RamadanService],
  controllers: [RamadanController],
})
export class RamadanModule {}
