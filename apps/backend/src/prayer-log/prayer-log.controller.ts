import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrayerLogService } from './prayer-log.service';
import { UpsertPrayerLogDto } from './dto/upsert-prayer-log.dto';
import { BulkSyncPrayerLogDto } from './dto/bulk-sync-prayer-log.dto';

@ApiTags('prayer-log')
@Controller('prayer-log')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PrayerLogController {
  constructor(private readonly prayerLogService: PrayerLogService) {}

  @Get()
  findByRange(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const toDate = to ?? new Date().toISOString().slice(0, 10);
    return this.prayerLogService.findByDateRange(user.userId, fromDate, toDate);
  }

  @Get('stats')
  getStats(@CurrentUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.prayerLogService.getStats(user.userId, days ? parseInt(days, 10) : 30);
  }

  @Post()
  upsert(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertPrayerLogDto) {
    return this.prayerLogService.upsert(user.userId, dto);
  }

  @Post('bulk-sync')
  bulkSync(@CurrentUser() user: AuthenticatedUser, @Body() dto: BulkSyncPrayerLogDto) {
    return this.prayerLogService.bulkSync(user.userId, dto);
  }
}
