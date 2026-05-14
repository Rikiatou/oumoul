import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { UpsertHifzEntryDto } from './upsert-hifz-entry.dto';

export class BulkSyncHifzDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertHifzEntryDto)
  entries: UpsertHifzEntryDto[];
}
