import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TestPushDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  body?: string;
}
