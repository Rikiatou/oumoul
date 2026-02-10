import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TafsirLanguage } from "@prisma/client";

export interface TafsirResponse {
  source: string;
  locale: "fr" | "en" | "ar";
  surah: number;
  ayah: number;
  text: string;
}

export interface GetTafsirParams {
  surah: number;
  ayah: number;
  locale?: "fr" | "en" | "ar";
  source?: string;
}

export interface TafsirSourceDto {
  key: string;
  name: string;
  author: string | null;
  locale: "fr" | "en" | "ar" | null;
}

@Injectable()
export class TafsirService {
  constructor(private readonly prisma: PrismaService) {}

  async getTafsir(params: GetTafsirParams): Promise<TafsirResponse> {
    const language = this.mapLocaleToLanguage(params.locale ?? "fr");

    // 1) Essayer d'abord dans la base locale (FR/EN/AR)
    const entries = await this.prisma.tafsirEntry.findMany({
      where: {
        surah: params.surah,
        language,
        ayahFrom: { lte: params.ayah },
        OR: [
          { ayahTo: null },
          { ayahTo: { gte: params.ayah } },
        ],
        source: params.source
          ? {
              key: params.source,
            }
          : undefined,
      },
      include: {
        source: true,
      },
      orderBy: [{ ayahFrom: "asc" }],
      take: 1,
    });

    const entry = entries[0];
    if (entry && (!params.source && entry.source.key === "fr_simple")) {
      // Source brouillon seedée (placeholder) : on l'ignore tant que l'appelant ne demande pas explicitement cette source.
      // Cela permet d'utiliser QuranEnc pour fournir un vrai résumé.
    } else if (entry) {
      return {
        source: entry.source.name,
        locale: params.locale ?? "fr",
        surah: entry.surah,
        ayah: params.ayah,
        text: entry.text,
      } as const;
    }

    // 2) Si rien en base et locale FR/EN, récupérer le résumé depuis QuranEnc (pas de fallback de langue)
    if (params.locale === "fr" || params.locale === "en") {
      const summary = await this.fetchSummaryFromQuranEnc(params);
      if (summary) {
        return summary;
      }
    }

    // 3) Si rien en base et locale AR, fallback vers Quran.com v4
    if (params.locale === "ar") {
      const fallback = await this.fetchFromQuranCom(params);
      if (fallback) {
        return fallback;
      }
    }

    // 4) Sinon, pas de tafsir disponible
    throw new NotFoundException(
      `Aucun tafsir trouvé pour la sourate ${params.surah}, verset ${params.ayah} (${params.locale ?? "fr"}).`,
    );
  }

  async listSources(locale?: "fr" | "en" | "ar"): Promise<TafsirSourceDto[]> {
    const language = locale ? this.mapLocaleToLanguage(locale) : null;

    const sources = await this.prisma.tafsirSource.findMany({
      where: {
        ...(language ? { language } : {}),
      },
      orderBy: [{ name: "asc" }],
    });

    return sources.map((source) => ({
      key: source.key,
      name: source.name,
      author: source.author ?? null,
      locale: source.language === TafsirLanguage.FR ? "fr" : source.language === TafsirLanguage.EN ? "en" : source.language === TafsirLanguage.AR ? "ar" : null,
    }));
  }

  private async fetchFromQuranCom(params: GetTafsirParams) {
    const tafsirId = params.source ? Number(params.source) : undefined;
    const ayahKey = `${params.surah}:${params.ayah}`;

    // Si la source n'est pas fournie ou pas numerique, on utilise un tafsir par defaut
    const effectiveTafsirId = Number.isFinite(tafsirId) && tafsirId ? tafsirId : 169; // ex : Ibn Kathir EN

    const url = `https://api.quran.com/api/v4/tafsirs/${effectiveTafsirId}/by_ayah/${encodeURIComponent(ayahKey)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as any;
    if (!data || !data.tafsir) {
      return null;
    }

    return {
      source: data.tafsir.resource_name ?? "quran.com",
      locale: params.locale ?? "en",
      surah: params.surah,
      ayah: params.ayah,
      text: data.tafsir.text ?? "",
    } as const;
  }

  private async fetchSummaryFromQuranEnc(params: GetTafsirParams): Promise<TafsirResponse | null> {
    const locale = params.locale ?? "fr";
    const translationKeyCandidates =
      locale === "fr"
        ? ["french_mokhtasar"]
        : locale === "en"
          ? ["english_mokhtasar", "english_saheeh"]
          : [];

    for (const translationKey of translationKeyCandidates) {
      const url = `https://quranenc.com/api/v1/translation/aya/${encodeURIComponent(translationKey)}/${params.surah}/${params.ayah}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as any;
      const translationText = data?.result?.translation;
      if (!translationText || typeof translationText !== "string") {
        continue;
      }

      return {
        source: `QuranEnc (${translationKey})`,
        locale,
        surah: params.surah,
        ayah: params.ayah,
        text: translationText,
      } as const;
    }

    return null;
  }

  private mapLocaleToLanguage(locale: "fr" | "en" | "ar"): TafsirLanguage {
    switch (locale) {
      case "en":
        return TafsirLanguage.EN;
      case "ar":
        return TafsirLanguage.AR;
      case "fr":
      default:
        return TafsirLanguage.FR;
    }
  }
}
