import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrayerModule } from './prayer/prayer.module';
import { FastingModule } from './fasting/fasting.module';
import { DhikrModule } from './dhikr/dhikr.module';
import { TafsirModule } from './tafsir/tafsir.module';
import { AladhanModule } from './aladhan/aladhan.module';
import { QuranModule } from './quran/quran.module';
import { ImaneProgramModule } from './imane-program/imane-program.module';
import { HadithModule } from './hadith/hadith.module';
import { CycleModule } from './cycle/cycle.module';
import appConfig from './config/app.config';
import { RamadanModule } from './ramadan/ramadan.module';
import { EmailModule } from './email/email.module';
import { PlacesModule } from './places/places.module';
import { CommunityModule } from './community/community.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env'],
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    PrayerModule,
    FastingModule,
    DhikrModule,
    TafsirModule,
    AladhanModule,
    QuranModule,
    ImaneProgramModule,
    HadithModule,
    CycleModule,
    RamadanModule,
    PlacesModule,
    CommunityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
