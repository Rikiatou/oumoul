import { BadRequestException, Body, Controller, Get, Put, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ImaneProgramService, ImaneProgramItems } from './imane-program.service';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

@ApiTags('imane-program')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('imane/program')
export class ImaneProgramController {
  constructor(private readonly imaneProgramService: ImaneProgramService) {}

  private extractUserId(req: AuthenticatedRequest): string {
    if (!req.user?.userId) {
      throw new UnauthorizedException();
    }
    return req.user.userId;
  }

  @Get()
  @ApiOkResponse({ description: 'Programme spirituel du jour pour la date donnée.' })
  @ApiQuery({ name: 'date', required: false, type: String, example: '2025-11-18' })
  async getProgram(@Req() req: AuthenticatedRequest, @Query('date') dateParam?: string) {
    const userId = this.extractUserId(req);
    const date = dateParam ? new Date(dateParam) : new Date();
    if (dateParam && Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date. Expected YYYY-MM-DD.');
    }
    const items = await this.imaneProgramService.getProgramForDate(userId, date);
    const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    return { date: startOfDay.toISOString().slice(0, 10), items };
  }

  @Put()
  @ApiOkResponse({ description: 'Met à jour le programme spirituel pour la date donnée.' })
  async updateProgram(
    @Req() req: AuthenticatedRequest,
    @Body() body: { date?: string; items: ImaneProgramItems },
  ) {
    const userId = this.extractUserId(req);
    const date = body.date ? new Date(body.date) : new Date();
    if (body.date && Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date. Expected YYYY-MM-DD.');
    }
    const result = await this.imaneProgramService.upsertProgramForDate(userId, date, body.items);
    return result;
  }

  @Get('month')
  @ApiOkResponse({ description: 'Programmes spirituels pour un mois donné.' })
  @ApiQuery({ name: 'year', required: true, type: Number, example: 2025 })
  @ApiQuery({ name: 'month', required: true, type: Number, example: 11, description: '1-12' })
  async getMonth(
    @Req() req: AuthenticatedRequest,
    @Query('year') yearParam: string,
    @Query('month') monthParam: string,
  ) {
    const userId = this.extractUserId(req);
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
