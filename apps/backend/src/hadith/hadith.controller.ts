import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { HadithService } from './hadith.service';

@ApiTags('hadith')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('hadith')
export class HadithController {
  constructor(private readonly hadithService: HadithService) {}

  @Get('random')
  @ApiOkResponse({ description: 'Retourne un hadith aléatoire pour un thème donné.' })
  @ApiQuery({ name: 'topic', required: false, type: String, example: 'patience' })
  async getRandom(@Query('topic') topic?: string) {
    const hadith = await this.hadithService.getRandomHadith(topic);
    return { topic: topic ?? 'patience', hadith };
  }
}
