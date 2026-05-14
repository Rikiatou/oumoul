import { Module } from '@nestjs/common';
import { HifzController } from './hifz.controller';
import { HifzService } from './hifz.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HifzController],
  providers: [HifzService],
})
export class HifzModule {}
