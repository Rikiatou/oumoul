import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertHifzEntryDto {
  @IsInt() @Min(1) surahId: number;
  @IsString() surahName: string;
  @IsInt() @Min(1) ayahFrom: number;
  @IsInt() @Min(1) ayahTo: number;
  @IsInt() @Min(1) interval: number;
  @IsNumber() ease: number;
  @IsInt() @Min(0) repetitions: number;
  @IsOptional() @IsInt() lastScore?: number | null;
  @IsString() nextReview: string;
}
