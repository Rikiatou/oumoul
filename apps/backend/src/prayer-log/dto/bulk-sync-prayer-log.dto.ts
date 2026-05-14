import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { UpsertPrayerLogDto } from './upsert-prayer-log.dto';

export class BulkSyncPrayerLogDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertPrayerLogDto)
  logs: UpsertPrayerLogDto[];
}
