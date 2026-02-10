import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { FastingService } from './fasting.service';
import { CreateFastingLogDto } from './dto/create-fasting-log.dto';
import { UpdateFastingLogDto } from './dto/update-fasting-log.dto';
import { GetFastingLogsDto } from './dto/get-fasting-logs.dto';
import { CreateMakeupPlanDto } from './dto/create-makeup-plan.dto';
import { UpdatePlanEntryDto } from './dto/update-plan-entry.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

@ApiTags('fasting')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('fasting')
export class FastingController {
  constructor(private readonly fastingService: FastingService) {}

  @Post('logs')
  @ApiOkResponse({ description: 'Create or update a fasting log entry.' })
  upsertLog(@Req() req: AuthenticatedRequest, @Body() dto: CreateFastingLogDto) {
    const userId = this.extractUserId(req);
    return this.fastingService.upsertLog(userId, dto);
  }

  @Get('logs')
  @ApiOkResponse({ description: 'List fasting logs for the authenticated user.' })
  listLogs(@Req() req: AuthenticatedRequest, @Query() query: GetFastingLogsDto) {
    const userId = this.extractUserId(req);
    return this.fastingService.listLogs(userId, query);
  }

  @Patch('logs/:id')
  @ApiOkResponse({ description: 'Update a fasting log entry.' })
  updateLog(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateFastingLogDto,
  ) {
    const userId = this.extractUserId(req);
    return this.fastingService.updateLog(userId, id, dto);
  }

  @Delete('logs/:id')
  @ApiOkResponse({ description: 'Delete a fasting log entry.' })
  deleteLog(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = this.extractUserId(req);
    return this.fastingService.removeLog(userId, id);
  }

  @Get('plans/active')
  @ApiOkResponse({ description: 'Retrieve the active make-up plan.' })
  getActivePlan(@Req() req: AuthenticatedRequest) {
    const userId = this.extractUserId(req);
    return this.fastingService.getActivePlan(userId);
  }

  @Post('plans')
  @ApiOkResponse({ description: 'Create a new make-up plan.' })
  createPlan(@Req() req: AuthenticatedRequest, @Body() dto: CreateMakeupPlanDto) {
    const userId = this.extractUserId(req);
    return this.fastingService.createPlan(userId, dto);
  }

  @Patch('plans/:planId/entries/:entryId')
  @ApiOkResponse({ description: 'Update the status of a make-up plan entry.' })
  updatePlanEntry(
    @Req() req: AuthenticatedRequest,
    @Param('planId') planId: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdatePlanEntryDto,
  ) {
    const userId = this.extractUserId(req);
    return this.fastingService.updatePlanEntry(userId, planId, entryId, dto.status, dto.notes);
  }

  @Patch('plans/:planId/deactivate')
  @ApiOkResponse({ description: 'Deactivate an existing make-up plan.' })
  deactivatePlan(@Req() req: AuthenticatedRequest, @Param('planId') planId: string) {
    const userId = this.extractUserId(req);
    return this.fastingService.deactivatePlan(userId, planId);
  }

  @Get('summary')
  @ApiOkResponse({ description: 'Overview of fasting status and outstanding make-up days.' })
  summary(@Req() req: AuthenticatedRequest) {
    const userId = this.extractUserId(req);
    return this.fastingService.summary(userId);
  }

  private extractUserId(req: AuthenticatedRequest) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User context missing');
    }
    return userId;
  }
}
