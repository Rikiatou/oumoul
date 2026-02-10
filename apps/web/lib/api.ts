import {
  HttpClient,
  createAuthApi,
  createPrayerApi,
  createFastingApi,
  createRemindersApi,
  createDhikrApi,
  createTafsirApi,
  createRamadanApi,
  createQuranApi,
  createImaneProgramApi,
  createHadithApi,
  createCycleApi,
} from '@oumoul/api';
import { MemoryTokenStore } from './memory-token-store';

function deriveWebBackendBaseUrl(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const protocol = window.location.protocol;
  const host = window.location.hostname;
  if (!host) {
    return undefined;
  }

  return `${protocol}//${host}:3333/api`;
}

export const tokenStore = new MemoryTokenStore();
export const httpClient = new HttpClient({
  tokenStore,
  baseUrl: deriveWebBackendBaseUrl(),
  refreshHandler: async () => {
    const response = await fetch('/api/session/me', { method: 'GET' });
    if (!response.ok) {
      return null;
    }
    const data = await response.json().catch(() => null);
    if (!data?.accessToken) {
      return null;
    }
    return { accessToken: data.accessToken };
  },
});

export const authApi = createAuthApi(httpClient);
export const prayerApi = createPrayerApi(httpClient);
export const fastingApi = createFastingApi(httpClient);
export const remindersApi = createRemindersApi(httpClient);
export const dhikrApi = createDhikrApi(httpClient);
export const tafsirApi = createTafsirApi(httpClient);
export const ramadanApi = createRamadanApi(httpClient);
export const quranApi = createQuranApi(httpClient);
export const imaneProgramApi = createImaneProgramApi(httpClient);
export const hadithApi = createHadithApi(httpClient);
export const cycleApi = createCycleApi(httpClient);
