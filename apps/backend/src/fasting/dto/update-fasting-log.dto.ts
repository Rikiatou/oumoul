import { PartialType } from '@nestjs/swagger';
import { CreateFastingLogDto } from './create-fasting-log.dto';

export class UpdateFastingLogDto extends PartialType(CreateFastingLogDto) {}
