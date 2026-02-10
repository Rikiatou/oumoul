import { Module } from '@nestjs/common';
import { ImaneProgramService } from './imane-program.service';
import { ImaneProgramController } from './imane-program.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ImaneProgramService],
  controllers: [ImaneProgramController],
})
export class ImaneProgramModule {}
