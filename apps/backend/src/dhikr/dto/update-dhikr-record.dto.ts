import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDhikrRecordDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  count?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
