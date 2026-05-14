import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ReportReasonDto {
  INAPPROPRIATE = 'INAPPROPRIATE',
  SPAM = 'SPAM',
  HATE_SPEECH = 'HATE_SPEECH',
  MISINFORMATION = 'MISINFORMATION',
  OTHER = 'OTHER',
}

export class ReportPostDto {
  @IsEnum(ReportReasonDto)
  reason: ReportReasonDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}
