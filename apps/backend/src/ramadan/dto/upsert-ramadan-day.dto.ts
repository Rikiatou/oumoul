import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { FastingLogStatus } from '@prisma/client';

export class UpsertRamadanDayDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string; // YYYY-MM-DD

  @IsEnum(FastingLogStatus)
  fastStatus!: FastingLogStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
