import { HttpClient } from '../http-client';
import { apiRoutes } from '@oumoul/config';
import { Qari, AudioRecitation } from '../types-additions';

export function createQuranAudioApi(client: HttpClient) {
  const base = `${apiRoutes.backend.quranAudio ?? '/quran-audio'}`;

  return {
    // Get all available Qaris
    getQaris() {
      return client.request<Qari[]>(`${base}/qaris`, {
        method: 'GET',
      });
    },

    // Get audio for specific ayah
    getAyahAudio(surahId: number, ayahNumber: number, qariId: string) {
      return client.request<AudioRecitation>(
        `${base}/ayah/${surahId}/${ayahNumber}?qari=${qariId}`,
        {
          method: 'GET',
        }
      );
    },

    // Get full surah audio URLs
    getSurahAudio(surahId: number, qariId: string) {
      return client.request<{ ayahs: AudioRecitation[] }>(
        `${base}/surah/${surahId}?qari=${qariId}`,
        {
          method: 'GET',
        }
      );
    },

    // Get download URL for offline use
    getDownloadUrl(surahId: number, ayahNumber: number, qariId: string) {
      return client.request<{ url: string; expiresAt: string }>(
        `${base}/download/${surahId}/${ayahNumber}?qari=${qariId}`,
        {
          method: 'GET',
        }
      );
    },
  };
}
