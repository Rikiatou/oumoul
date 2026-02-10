import { Body, Controller, Get, Put, Query, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { RamadanService } from './ramadan.service';
import { UpsertRamadanDayDto } from './dto/upsert-ramadan-day.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

@ApiTags('ramadan')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('ramadan')
export class RamadanController {
  constructor(private readonly ramadanService: RamadanService) {}

  @Get('summary')
  @ApiOkResponse({ description: 'Retourne le résumé des jours de Ramadan pour une année donnée.' })
  @ApiQuery({ name: 'year', type: Number })
  async getSummary(@Req() req: AuthenticatedRequest, @Query('year') year: string) {
    const userId = this.extractUserId(req);
    const yearNum = Number(year);
    const days = await this.ramadanService.getSummary(userId, yearNum);
    return { year: yearNum, days };
  }

  @Put('day')
  @ApiOkResponse({ description: 'Crée ou met à jour un jour de jeûne pour Ramadan.' })
  async upsertDay(@Req() req: AuthenticatedRequest, @Body() body: UpsertRamadanDayDto) {
    const userId = this.extractUserId(req);
    const updated = await this.ramadanService.upsertDay(userId, body);
    return updated;
  }

  private extractUserId(req: AuthenticatedRequest) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User context missing');
    }
    return userId;
  }
}
