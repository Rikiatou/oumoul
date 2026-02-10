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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { DhikrService } from './dhikr.service';
import { CreateDhikrRecordDto } from './dto/create-dhikr-record.dto';
import { UpdateDhikrRecordDto } from './dto/update-dhikr-record.dto';
import { GetDhikrRecordsDto } from './dto/get-dhikr-records.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

@ApiTags('dhikr')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dhikr')
export class DhikrController {
  constructor(private readonly dhikrService: DhikrService) {}

  @Get('categories')
  @ApiOkResponse({ description: 'Liste des catégories de dhikr avec leurs entrées.' })
  listCategories() {
    return this.dhikrService.listCategories();
  }

  @Get('records')
  @ApiOkResponse({ description: 'Récupère les enregistrements de dhikr de la personne authentifiée.' })
  listRecords(@Req() req: AuthenticatedRequest, @Query() query: GetDhikrRecordsDto) {
    const userId = this.extractUserId(req);
    return this.dhikrService.listRecords(userId, query.entryId);
  }

  @Post('records')
  @ApiOkResponse({ description: 'Crée ou met à jour un enregistrement de dhikr pour une entrée donnée.' })
  upsertRecord(@Req() req: AuthenticatedRequest, @Body() dto: CreateDhikrRecordDto) {
    const userId = this.extractUserId(req);
    return this.dhikrService.upsertRecord(userId, dto);
  }

  @Patch('records/:id')
  @ApiOkResponse({ description: 'Met à jour un enregistrement de dhikr existant.' })
  updateRecord(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDhikrRecordDto,
  ) {
    const userId = this.extractUserId(req);
    return this.dhikrService.updateRecord(userId, id, dto);
  }

  @Delete('records/:id')
  @ApiOkResponse({ description: 'Supprime un enregistrement de dhikr.' })
  deleteRecord(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = this.extractUserId(req);
    return this.dhikrService.deleteRecord(userId, id);
  }

  private extractUserId(req: AuthenticatedRequest) {
    if (!req.user?.userId) {
      throw new UnauthorizedException();
    }
    return req.user.userId;
  }
}
