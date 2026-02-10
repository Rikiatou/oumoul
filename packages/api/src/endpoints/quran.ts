import { apiRoutes } from '@oumoul/config';
import { HttpClient } from '../http-client';
import type {
  QuranSurahsResponse,
  QuranSurahVersesResponse,
  QuranSurahAudioResponse,
  QuranAyahTafsirResponse,
} from '../types';

export function createQuranApi(client: HttpClient) {
  const base = `${apiRoutes.backend.quran ?? '/quran'}`;

  return {
    listSurahs(language?: string) {
      const search = new URLSearchParams();
      if (language) {
        search.set('language', language);
      }
      const query = search.toString();
      const path = query ? `${base}/surahs?${query}` : `${base}/surahs`;
      return client.request<QuranSurahsResponse>(path, { method: 'GET' });
    },

    getSurah(chapterId: number, language?: string) {
      const search = new URLSearchParams();
      if (language) {
        search.set('language', language);
      }
      const query = search.toString();
      const path = query ? `${base}/surah/${chapterId}?${query}` : `${base}/surah/${chapterId}`;
      return client.request<QuranSurahVersesResponse>(path, { method: 'GET' });
    },

    getSurahAudio(chapterId: number, reciter?: string) {
      const search = new URLSearchParams();
      if (reciter) {
        search.set('reciter', reciter);
      }
      const query = search.toString();
      const path = query ? `${base}/audio/surah/${chapterId}?${query}` : `${base}/audio/surah/${chapterId}`;
      return client.request<QuranSurahAudioResponse>(path, { method: 'GET' });
    },

    getAyahTafsir(surah: number, ayah: number) {
      const path = `${base}/tafsir/${surah}/${ayah}`;
      return client.request<QuranAyahTafsirResponse>(path, { method: 'GET' });
    },
  } as const;
}
