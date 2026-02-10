import { IsOptional, IsString } from 'class-validator';

export class GetDhikrRecordsDto {
  @IsOptional()
  @IsString()
  entryId?: string;
}
