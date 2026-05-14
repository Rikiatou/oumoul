import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FastingService } from './fasting.service';
import { CreateFastingLogDto } from './dto/create-fasting-log.dto';
import { UpdateFastingLogDto } from './dto/update-fasting-log.dto';
import { GetFastingLogsDto } from './dto/get-fasting-logs.dto';
import { CreateMakeupPlanDto } from './dto/create-makeup-plan.dto';
import { UpdatePlanEntryDto } from './dto/update-plan-entry.dto';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('fasting')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('fasting')
export class FastingController {
  constructor(private readonly fastingService: FastingService) {}

  @Post('logs')
  @ApiOkResponse({ description: 'Create or update a fasting log entry.' })
  upsertLog(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFastingLogDto) {
    return this.fastingService.upsertLog(user.userId, dto);
  }

  @Get('logs')
  @ApiOkResponse({ description: 'List fasting logs for the authenticated user.' })
  listLogs(@CurrentUser() user: AuthenticatedUser, @Query() query: GetFastingLogsDto) {
    return this.fastingService.listLogs(user.userId, query);
  }

  @Patch('logs/:id')
  @ApiOkResponse({ description: 'Update a fasting log entry.' })
  updateLog(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFastingLogDto,
  ) {
    return this.fastingService.updateLog(user.userId, id, dto);
  }

  @Delete('logs/:id')
  @ApiOkResponse({ description: 'Delete a fasting log entry.' })
  deleteLog(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.fastingService.removeLog(user.userId, id);
  }

  @Get('plans/active')
  @ApiOkResponse({ description: 'Retrieve the active make-up plan.' })
  getActivePlan(@CurrentUser() user: AuthenticatedUser) {
    return this.fastingService.getActivePlan(user.userId);
  }

  @Post('plans')
  @ApiOkResponse({ description: 'Create a new make-up plan.' })
  createPlan(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMakeupPlanDto) {
    return this.fastingService.createPlan(user.userId, dto);
  }

  @Patch('plans/:planId/entries/:entryId')
  @ApiOkResponse({ description: 'Update the status of a make-up plan entry.' })
  updatePlanEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdatePlanEntryDto,
  ) {
    return this.fastingService.updatePlanEntry(user.userId, planId, entryId, dto.status, dto.notes);
  }

  @Patch('plans/:planId/deactivate')
  @ApiOkResponse({ description: 'Deactivate an existing make-up plan.' })
  deactivatePlan(@CurrentUser() user: AuthenticatedUser, @Param('planId') planId: string) {
    return this.fastingService.deactivatePlan(user.userId, planId);
  }

  @Get('summary')
  @ApiOkResponse({ description: 'Overview of fasting status and outstanding make-up days.' })
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.fastingService.summary(user.userId);
  }
}
