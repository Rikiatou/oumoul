import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AiService } from './ai.service';

class AnalyzeDto {
  @IsOptional()
  @IsEnum(['focused', 'relaxed', 'tired', 'energetic'])
  mood?: string;
}

@ApiTags('ai')
@Controller('ai')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze')
  analyze(@CurrentUser() user: AuthenticatedUser, @Body() dto: AnalyzeDto) {
    return this.aiService.analyze(user.userId, dto.mood ?? 'focused');
  }

  @Get('recommendations')
  getRecommendations(@CurrentUser() user: AuthenticatedUser) {
    return this.aiService.analyze(user.userId, 'focused');
  }
}
