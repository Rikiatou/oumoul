import { IsEnum, IsString } from 'class-validator';

export enum PrayerNameDto {
  Fajr = 'Fajr',
  Dhuhr = 'Dhuhr',
  Asr = 'Asr',
  Maghrib = 'Maghrib',
  Isha = 'Isha',
}

export enum PrayerLogStatusDto {
  PRAYED_ON_TIME = 'PRAYED_ON_TIME',
  PRAYED_LATE = 'PRAYED_LATE',
  MISSED = 'MISSED',
  EXEMPTED = 'EXEMPTED',
}

export class UpsertPrayerLogDto {
  @IsString() date: string;
  @IsEnum(PrayerNameDto) prayer: PrayerNameDto;
  @IsEnum(PrayerLogStatusDto) status: PrayerLogStatusDto;
}
