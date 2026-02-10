import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PlanEntryStatusDto } from './fasting.enums';

export class UpdatePlanEntryDto {
  @IsEnum(PlanEntryStatusDto)
  status!: PlanEntryStatusDto;

  @IsOptional()
  @IsString()
  notes?: string;
}
