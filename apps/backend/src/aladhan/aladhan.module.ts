import { Module } from '@nestjs/common';
import { AladhanService } from './aladhan.service';
import { AladhanController } from './aladhan.controller';

@Module({
  providers: [AladhanService],
  controllers: [AladhanController],
  exports: [AladhanService],
})
export class AladhanModule {}
