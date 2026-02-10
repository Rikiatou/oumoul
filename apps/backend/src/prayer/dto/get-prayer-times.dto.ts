import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum CalculationMethodOption {
  MuslimWorldLeague = 'MuslimWorldLeague',
  Egyptian = 'Egyptian',
  Karachi = 'Karachi',
  UmmAlQura = 'UmmAlQura',
  Dubai = 'Dubai',
  Kuwait = 'Kuwait',
  Qatar = 'Qatar',
  Singapore = 'Singapore',
  Turkey = 'Turkey',
  NorthAmerica = 'NorthAmerica',
  Other = 'Other',
}

export enum MadhabOption {
  Shafi = 'Shafi',
  Hanafi = 'Hanafi',
}

export enum HighLatitudeRuleOption {
  MiddleOfTheNight = 'MiddleOfTheNight',
  SeventhOfTheNight = 'SeventhOfTheNight',
  AngleBased = 'AngleBased',
}

export class GetPrayerTimesDto {
  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(CalculationMethodOption)
  method?: CalculationMethodOption;

  @IsOptional()
  @IsEnum(MadhabOption)
  madhab?: MadhabOption;

  @IsOptional()
  @IsEnum(HighLatitudeRuleOption)
  highLatitudeRule?: HighLatitudeRuleOption;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fajrAdjustment?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dhuhrAdjustment?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  asrAdjustment?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maghribAdjustment?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ishaAdjustment?: number;

  @IsOptional()
  @IsString()
  timeZone?: string;
}
