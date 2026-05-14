import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { HifzService } from './hifz.service';
import { UpsertHifzEntryDto } from './dto/upsert-hifz-entry.dto';
import { BulkSyncHifzDto } from './dto/bulk-sync-hifz.dto';

@ApiTags('hifz')
@Controller('hifz')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class HifzController {
  constructor(private readonly hifzService: HifzService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.hifzService.findAll(user.userId);
  }

  @Get('stats')
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.hifzService.getStats(user.userId);
  }

  @Post()
  upsert(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertHifzEntryDto) {
    return this.hifzService.upsert(user.userId, dto);
  }

  @Post('bulk-sync')
  bulkSync(@CurrentUser() user: AuthenticatedUser, @Body() dto: BulkSyncHifzDto) {
    return this.hifzService.bulkSync(user.userId, dto);
  }

  @Delete(':surahId/:ayahFrom/:ayahTo')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('surahId') surahId: string,
    @Param('ayahFrom') ayahFrom: string,
    @Param('ayahTo') ayahTo: string,
  ) {
    return this.hifzService.remove(
      user.userId,
      parseInt(surahId, 10),
      parseInt(ayahFrom, 10),
      parseInt(ayahTo, 10),
    );
  }
}
