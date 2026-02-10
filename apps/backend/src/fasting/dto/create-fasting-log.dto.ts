import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { FastingLogStatusDto } from './fasting.enums';

export class CreateFastingLogDto {
  @Type(() => Date)
  @IsDateString()
  date!: string;

  @IsEnum(FastingLogStatusDto)
  status!: FastingLogStatusDto;

  @IsOptional()
  @IsString()
  notes?: string;
}
