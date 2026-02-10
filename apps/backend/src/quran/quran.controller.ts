import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { QuranService, QuranSurah, QuranVerse } from './quran.service';

@ApiTags('quran')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('quran')
export class QuranController {
  constructor(private readonly quranService: QuranService) {}

  @Get('surahs')
  @ApiOkResponse({ description: 'Liste des sourates du Coran (via Quran.com).' })
  @ApiQuery({ name: 'language', required: false, type: String, example: 'fr' })
  async listSurahs(@Query('language') language?: string): Promise<{ language: string; surahs: QuranSurah[] }> {
    const lang = language || 'fr';
    const surahs = await this.quranService.listSurahs(lang);
    return { language: lang, surahs };
  }

  @Get('surah/:id')
  @ApiOkResponse({ description: 'Versets d’une sourate (via Quran.com).' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'language', required: false, type: String, example: 'fr' })
  async getSurah(
    @Param('id') id: string,
    @Query('language') language?: string,
  ): Promise<{ chapterId: number; language: string; verses: QuranVerse[] }> {
    const chapterId = Number(id);
    const lang = language || 'fr';
    const verses = await this.quranService.getSurahVerses(chapterId, lang);
    return { chapterId, language: lang, verses };
  }

  @Get('tafsir/:surah/:ayah')
  @ApiOkResponse({ description: 'Tafsir d’un verset (via Quran.com, Ibn Kathir abrégé par défaut).' })
  @ApiParam({ name: 'surah', type: Number })
  @ApiParam({ name: 'ayah', type: Number })
  async getTafsir(@Param('surah') surah: string, @Param('ayah') ayah: string) {
    const surahNumber = Number(surah);
    const ayahNumber = Number(ayah);
    const tafsir = await this.quranService.getAyahTafsir(surahNumber, ayahNumber);
    return { surah: surahNumber, ayah: ayahNumber, tafsir };
  }

  @Get('audio/surah/:id')
  @ApiOkResponse({ description: "URL audio d'une sourate (via MP3 Quran)." })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'reciter', required: false, type: String, example: 'mishary' })
  async getSurahAudio(@Param('id') id: string, @Query('reciter') reciter?: string) {
    const chapterId = Number(id);
    const audioUrl = await this.quranService.getSurahAudioUrl(chapterId, reciter || 'mishary');
    return { chapterId, reciter: reciter || 'mishary', audioUrl };
  }
}
