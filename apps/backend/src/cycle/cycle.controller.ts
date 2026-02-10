import { Body, Controller, Get, Put, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { CycleStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { CycleService } from './cycle.service';

interface JwtRequest extends Request {
  user?: { userId: string };
}

class UpsertCycleDayDto {
  @IsDateString()
  date!: string; // YYYY-MM-DD

  @IsEnum(CycleStatus)
  status!: CycleStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('cycle')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('cycle')
export class CycleController {
  constructor(private readonly cycleService: CycleService) {}

  @Get('days')
  @ApiOkResponse({ description: 'Retourne les jours du mois avec leur statut de cycle.' })
  @ApiQuery({ name: 'year', type: Number })
  @ApiQuery({ name: 'month', type: Number })
  async getMonth(@Req() req: JwtRequest, @Query('year') year: string, @Query('month') month: string) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    
    const yearNum = Number(year);
    const monthNum = Number(month);
    
    if (Number.isNaN(yearNum) || Number.isNaN(monthNum)) {
      throw new Error('Invalid year or month parameters');
    }
    
    if (yearNum < 2020 || yearNum > 2030 || monthNum < 1 || monthNum > 12) {
      throw new Error('Year must be between 2020-2030 and month must be between 1-12');
    }
    
    const days = await this.cycleService.getMonth(userId, yearNum, monthNum);
    return { year: yearNum, month: monthNum, days };
  }

  @Put('day')
  @ApiOkResponse({ description: 'Crée ou met à jour un jour de cycle pour une date donnée.' })
  async upsertDay(@Req() req: JwtRequest, @Body() body: UpsertCycleDayDto) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    
    try {
      const { date, status, notes } = body;
      const updated = await this.cycleService.upsertDay(userId, date, status, notes);
      return updated;
    } catch (error) {
      console.error('Error upserting cycle day:', error);
      throw new Error('Failed to save cycle day. Please try again.');
    }
  }
}
