import { IsDateString, IsOptional } from 'class-validator';

export class GetFastingLogsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
