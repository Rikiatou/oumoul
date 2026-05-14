import { BadRequestException, Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ImaneProgramService, ImaneProgramItems } from './imane-program.service';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('imane-program')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('imane/program')
export class ImaneProgramController {
  constructor(private readonly imaneProgramService: ImaneProgramService) {}

  @Get()
  @ApiOkResponse({ description: 'Programme spirituel du jour pour la date donnée.' })
  @ApiQuery({ name: 'date', required: false, type: String, example: '2025-11-18' })
  async getProgram(@CurrentUser() user: AuthenticatedUser, @Query('date') dateParam?: string) {
    const date = dateParam ? new Date(dateParam) : new Date();
    if (dateParam && Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date. Expected YYYY-MM-DD.');
    }
    const items = await this.imaneProgramService.getProgramForDate(user.userId, date);
    const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    return { date: startOfDay.toISOString().slice(0, 10), items };
  }

  @Put()
  @ApiOkResponse({ description: 'Met à jour le programme spirituel pour la date donnée.' })
  async updateProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { date?: string; items: ImaneProgramItems },
  ) {
    const date = body.date ? new Date(body.date) : new Date();
    if (body.date && Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date. Expected YYYY-MM-DD.');
    }
    return this.imaneProgramService.upsertProgramForDate(user.userId, date, body.items);
  }

  @Get('month')
  @ApiOkResponse({ description: 'Programmes spirituels pour un mois donné.' })
  @ApiQuery({ name: 'year', required: true, type: Number, example: 2025 })
  @ApiQuery({ name: 'month', required: true, type: Number, example: 11, description: '1-12' })
  async getMonth(
    @CurrentUser() user: AuthenticatedUser,
    @Query('year') yearParam: string,
    @Query('month') monthParam: string,
  ) {
    const userId = user.userId;
    const year = Number(yearParam);
    const month = Number(monthParam);
    const rows = await this.imaneProgramService.getProgramsForMonth(userId, year, month);

    const days = rows.map((row) => {
      const items = row.items;
      const completedCount =
        Number(items.coranTilawa) +
        Number(items.dhikrMatinSoir) +
        Number(items.duasPersonnelles) +
        Number(items.sadaqa) +
        Number(items.autreBienfait);
      return {
        date: row.date,
        completedCount,
      };
    });

    return { year, month, days };
  }
}
