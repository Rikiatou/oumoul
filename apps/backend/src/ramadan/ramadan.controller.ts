import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RamadanService } from './ramadan.service';
import { UpsertRamadanDayDto } from './dto/upsert-ramadan-day.dto';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('ramadan')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('ramadan')
export class RamadanController {
  constructor(private readonly ramadanService: RamadanService) {}

  @Get('summary')
  @ApiOkResponse({ description: 'Retourne le résumé des jours de Ramadan pour une année donnée.' })
  @ApiQuery({ name: 'year', type: Number })
  async getSummary(@CurrentUser() user: AuthenticatedUser, @Query('year') year: string) {
    const yearNum = Number(year);
    const days = await this.ramadanService.getSummary(user.userId, yearNum);
    return { year: yearNum, days };
  }

  @Put('day')
  @ApiOkResponse({ description: 'Crée ou met à jour un jour de jeûne pour Ramadan.' })
  async upsertDay(@CurrentUser() user: AuthenticatedUser, @Body() body: UpsertRamadanDayDto) {
    return this.ramadanService.upsertDay(user.userId, body);
  }
}
