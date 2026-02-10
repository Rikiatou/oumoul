import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ArrayUnique,
} from 'class-validator';
import { MakeupStrategyDto } from './fasting.enums';

export class CreateMakeupPlanDto {
  @IsEnum(MakeupStrategyDto)
  strategy!: MakeupStrategyDto;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  targetDays!: number;

  @IsOptional()
  @ArrayUnique()
  @IsArray()
  @IsDateString({}, { each: true })
  scheduledDates?: string[];
}
