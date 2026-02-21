import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DhikrService } from './dhikr.service';
import { CreateDhikrRecordDto } from './dto/create-dhikr-record.dto';
import { UpdateDhikrRecordDto } from './dto/update-dhikr-record.dto';
import { GetDhikrRecordsDto } from './dto/get-dhikr-records.dto';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

const SEED_SECRET = process.env.SEED_SECRET ?? 'oumoul-seed-2026';

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
  listRecords(@CurrentUser() user: AuthenticatedUser, @Query() query: GetDhikrRecordsDto) {
    return this.dhikrService.listRecords(user.userId, query.entryId);
  }

  @Post('records')
  @ApiOkResponse({ description: 'Crée ou met à jour un enregistrement de dhikr pour une entrée donnée.' })
  upsertRecord(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDhikrRecordDto) {
    return this.dhikrService.upsertRecord(user.userId, dto);
  }

  @Patch('records/:id')
  @ApiOkResponse({ description: 'Met à jour un enregistrement de dhikr existant.' })
  updateRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDhikrRecordDto,
  ) {
    return this.dhikrService.updateRecord(user.userId, id, dto);
  }

  @Delete('records/:id')
  @ApiOkResponse({ description: 'Supprime un enregistrement de dhikr.' })
  deleteRecord(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dhikrService.deleteRecord(user.userId, id);
  }

}
