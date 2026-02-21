import { Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DhikrService } from './dhikr.service';

const SEED_SECRET = process.env.SEED_SECRET ?? 'oumoul-seed-2026';

@ApiTags('dhikr-admin')
@Controller('dhikr/admin')
export class DhikrAdminController {
  constructor(private readonly dhikrService: DhikrService) {}

  @Post('seed')
  @ApiOkResponse({ description: 'Upsert all seed categories (idempotent, no auth required but needs secret header).' })
  seedCategories(@Headers('x-seed-secret') secret: string) {
    if (secret !== SEED_SECRET) throw new UnauthorizedException('Invalid seed secret');
    return this.dhikrService.seedCategories();
  }
}
