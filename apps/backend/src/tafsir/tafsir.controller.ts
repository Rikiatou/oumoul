import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { TafsirService } from "./tafsir.service";

@ApiTags("tafsir")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("tafsir")
export class TafsirController {
  constructor(private readonly tafsirService: TafsirService) {}

  @Get("sources")
  @ApiOkResponse({ description: "List available tafsir sources." })
  @ApiQuery({ name: "locale", required: false, enum: ["fr", "en", "ar"] })
  async listSources(@Query("locale") locale?: "fr" | "en" | "ar") {
    const sources = await this.tafsirService.listSources(locale);
    return { sources };
  }

  @Get()
  @ApiOkResponse({ description: "Retrieve tafsir for a given surah and ayah." })
  @ApiQuery({ name: "surah", type: Number, required: true })
  @ApiQuery({ name: "ayah", type: Number, required: true })
  @ApiQuery({ name: "locale", required: false, enum: ["fr", "en", "ar"] })
  @ApiQuery({ name: "source", required: false, type: String })
  async getTafsir(
    @Query("surah") surah: string,
    @Query("ayah") ayah: string,
    @Query("locale") locale?: "fr" | "en" | "ar",
    @Query("source") source?: string,
  ) {
    const surahNumber = Number(surah);
    const ayahNumber = Number(ayah);

    if (!Number.isFinite(surahNumber) || !Number.isFinite(ayahNumber)) {
      throw new BadRequestException("Invalid surah or ayah");
    }

    return this.tafsirService.getTafsir({ surah: surahNumber, ayah: ayahNumber, locale, source });
  }
}
