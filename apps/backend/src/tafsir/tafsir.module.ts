import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TafsirService } from "./tafsir.service";
import { TafsirController } from "./tafsir.controller";

@Module({
  imports: [PrismaModule],
  controllers: [TafsirController],
  providers: [TafsirService],
  exports: [TafsirService],
})
export class TafsirModule {}
