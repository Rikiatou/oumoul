import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { RemindersService } from './reminders.service';
import { ReminderJobType } from './reminder.constants';
import { UpdateReminderPreferenceDto } from './dto/update-reminder-preference.dto';
import { TestPushDto } from './dto/test-push.dto';
import { PushService } from './push.service';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

@ApiTags('reminders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('reminders')
export class RemindersController {
  constructor(
    private readonly remindersService: RemindersService,
    private readonly pushService: PushService,
  ) {}

  @Get('preferences')
  @ApiOperation({ summary: 'List reminder preferences for the current user' })
  @ApiOkResponse({ description: 'Array of reminder preferences with enable flags and send times.' })
  listPreferences(@Req() req: AuthenticatedRequest) {
    return this.remindersService.listPreferences(this.getUserId(req));
  }

  @Put('preferences/:type')
  @ApiOperation({ summary: 'Update a reminder preference' })
  @ApiOkResponse({ description: 'Updated reminder preference record.' })
  updatePreference(
    @Req() req: AuthenticatedRequest,
    @Param('type', new ParseEnumPipe(ReminderJobType)) type: ReminderJobType,
    @Body() dto: UpdateReminderPreferenceDto,
  ) {
    return this.remindersService.upsertPreference(this.getUserId(req), type, dto.isEnabled, dto.sendTime);
  }

  @Post('test-push')
  @ApiOperation({ summary: 'Send a test push notification to the current user' })
  @ApiOkResponse({ description: 'Push request accepted (may still fail if Expo is not configured).' })
  async testPush(@Req() req: AuthenticatedRequest, @Body() dto: TestPushDto) {
    const userId = this.getUserId(req);

    await this.pushService.sendToUser(userId, {
      title: dto.title ?? 'Test push',
      body: dto.body ?? 'Ceci est une notification de test.',
      data: {
        type: 'TestPush',
        sentAt: new Date().toISOString(),
      },
    });

    return { ok: true };
  }

  private getUserId(req: AuthenticatedRequest) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User context missing');
    }
    return userId;
  }
}
