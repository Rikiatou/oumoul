import { Injectable, InternalServerErrorException } from '@nestjs/common';

const FETCH_TIMEOUT_MS = 10_000;

function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

interface AlQuranCloudAyah {
  numberInSurah: number;
  text: string;
}

interface AlQuranCloudResponse {
  data: { ayahs: AlQuranCloudAyah[] };
}

export interface QuranSurah {
  id: number;
  nameArabic: string;
  nameSimple: string;
  nameTranslated: string | null;
  versesCount: number;
  revelationPlace: string;
}

export interface QuranVerse {
  verseNumber: number;
  textArabic: string;
  textTranslated: string | null;
  textTransliteration: string | null;
}

@Injectable()
export class QuranService {
  private readonly baseUrl = 'https://api.quran.com/api/v4';
  private readonly alQuranCloudBaseUrl = 'https://api.alquran.cloud/v1';

  async listSurahs(language: string = 'fr'): Promise<QuranSurah[]> {
    const url = new URL(`${this.baseUrl}/chapters`);
    url.searchParams.set('language', language);

    const response = await fetchWithTimeout(url.toString());
    if (!response.ok) {
      throw new InternalServerErrorException(
        'Erreur lors de la récupération des sourates depuis Quran.com',
      );
    }

    const json = (await response.json()) as {
      chapters: Array<{
        id: number;
        name_arabic: string;
        name_simple: string;
        name_complex: string;
        translated_name?: { name: string } | null;
        verses_count: number;
        revelation_place: string;
      }>;
    };

    if (!json.chapters || !Array.isArray(json.chapters)) {
      throw new InternalServerErrorException(
        'Réponse inattendue de Quran.com pour la liste des sourates',
      );
    }

    return json.chapters.map((chapter) => ({
      id: chapter.id,
      nameArabic: chapter.name_arabic,
      nameSimple: chapter.name_simple,
      nameTranslated: chapter.translated_name?.name ?? null,
      versesCount: chapter.verses_count,
      revelationPlace: chapter.revelation_place,
    }));
  }

  async getSurahVerses(
    chapterId: number,
    language: string = 'fr',
  ): Promise<QuranVerse[]> {
    const normalizedLang = language === 'en' ? 'en' : 'fr';
    const translationEdition =
      normalizedLang === 'en' ? 'en.sahih' : 'fr.hamidullah';

    const arabicUrl = `${this.alQuranCloudBaseUrl}/surah/${chapterId}/quran-uthmani`;
    const translationUrl = `${this.alQuranCloudBaseUrl}/surah/${chapterId}/${translationEdition}`;
    const transliterationUrl = `${this.alQuranCloudBaseUrl}/surah/${chapterId}/en.transliteration`;

    const [arabicResponse, translationResponse, transliterationResponse] =
      await Promise.all([
        fetchWithTimeout(arabicUrl, {
          headers: { Accept: 'application/json' },
        }),
        fetchWithTimeout(translationUrl, {
          headers: { Accept: 'application/json' },
        }),
        fetchWithTimeout(transliterationUrl, {
          headers: { Accept: 'application/json' },
        }),
      ]);

    if (!arabicResponse.ok) {
      throw new InternalServerErrorException(
        'Erreur lors de la récupération des versets arabes depuis AlQuran Cloud',
      );
    }
    if (!translationResponse.ok) {
      throw new InternalServerErrorException(
        'Erreur lors de la récupération de la traduction depuis AlQuran Cloud',
      );
    }

    const arabicJson = (await arabicResponse.json()) as AlQuranCloudResponse;
    const translationJson =
      (await translationResponse.json()) as AlQuranCloudResponse;

    const arabicAyahs = arabicJson?.data?.ayahs;
    const translationAyahs = translationJson?.data?.ayahs;
    if (!Array.isArray(arabicAyahs) || !Array.isArray(translationAyahs)) {
      throw new InternalServerErrorException(
        'Réponse inattendue de AlQuran Cloud pour les versets',
      );
    }

    const translationByNumber = new Map<number, string>();
    for (const ayah of translationAyahs) {
      const num = Number(ayah?.numberInSurah);
      if (Number.isFinite(num)) {
        translationByNumber.set(num, String(ayah?.text ?? ''));
      }
    }

    const transliterationByNumber = new Map<number, string>();
    if (transliterationResponse.ok) {
      try {
        const transliterationJson =
          (await transliterationResponse.json()) as AlQuranCloudResponse;
        for (const ayah of transliterationJson?.data?.ayahs ?? []) {
          const num = Number(ayah?.numberInSurah);
          if (Number.isFinite(num)) {
            transliterationByNumber.set(num, String(ayah?.text ?? ''));
          }
        }
      } catch {
        // transliteration is optional — ignore failures
      }
    }

    return arabicAyahs
      .map((ayah) => {
        const verseNumber = Number(ayah?.numberInSurah);
        if (!Number.isFinite(verseNumber)) {
          return null;
        }
        const textArabic = String(ayah?.text ?? '');
        const textTranslated = translationByNumber.get(verseNumber) ?? null;
        const textTransliteration =
          transliterationByNumber.get(verseNumber) ?? null;
        return {
          verseNumber,
          textArabic,
          textTranslated,
          textTransliteration,
        } as QuranVerse;
      })
      .filter((v): v is QuranVerse => Boolean(v));
  }

  async getSurahAudioUrl(
    chapterId: number,
    reciterId: string = 'mishary',
  ): Promise<string> {
    // Mapping simple pour quelques récitateurs connus de MP3 Quran.
    // Ici, on supporte quelques récitateurs courants.
    const baseByReciter: Record<string, string> = {
      mishary: 'https://server8.mp3quran.net/afs',
      sudais: 'https://server11.mp3quran.net/sds',
      minshawi: 'https://server10.mp3quran.net/minsh',
    };

    const base = baseByReciter[reciterId];
    if (!base) {
      throw new InternalServerErrorException(`Réciteur inconnu: ${reciterId}`);
    }

    const surahNumberPadded = chapterId.toString().padStart(3, '0');
    // Format classique MP3 Quran: {base}/{NNN}.mp3
    return `${base}/${surahNumberPadded}.mp3`;
  }

  async getAyahTafsir(
    surah: number,
    ayah: number,
    tafsirId: number = 169,
  ): Promise<{ text: string }> {
    // tafsirId 169: "Ibn Kathir (Abridged)" en anglais d’après /resources/tafsirs
    const ayahKey = `${surah}:${ayah}`;
    const url = new URL(
      `${this.baseUrl}/tafsirs/${tafsirId}/by_ayah/${ayahKey}`,
    );

    const response = await fetchWithTimeout(url.toString());
    if (!response.ok) {
      throw new InternalServerErrorException(
        'Erreur lors de la récupération du tafsir depuis Quran.com',
      );
    }

    const json = (await response.json()) as {
      tafsir: {
        text: string;
      };
    };

    if (!json.tafsir || !json.tafsir.text) {
      throw new InternalServerErrorException(
        'Réponse inattendue de Quran.com pour le tafsir',
      );
    }

    return { text: json.tafsir.text };
  }
}
