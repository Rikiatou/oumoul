import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateDhikrRecordDto {
  @IsString()
  entryId!: string;

  @IsInt()
  @Min(0)
  count!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
