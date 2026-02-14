import {
  HttpClient,
  createAuthApi,
  createPrayerApi,
  createFastingApi,
  createRemindersApi,
  createDhikrApi,
  createTafsirApi,
  createQuranApi,
  createRamadanApi,
  createHijriApi,
  createImaneProgramApi,
  createCycleApi,
} from '@oumoul/api';
import { SecureTokenStore } from '../storage/secure-token-store';
import Constants from 'expo-constants';

const tokenStore = new SecureTokenStore();

const PRODUCTION_API_URL = 'https://backend-production-bdc1.up.railway.app/api';

function deriveBackendBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_OU_MOUL_API_URL;
  if (explicit) {
    return explicit;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra?.expoClient
      ?.hostUri ??
    (Constants as unknown as { manifest?: { hostUri?: string } }).manifest?.hostUri;

  const host = hostUri?.split(':')[0];
  if (host) {
    return `http://${host}:3333/api`;
  }

  return PRODUCTION_API_URL;
}

const httpClient = new HttpClient({
  tokenStore,
  baseUrl: deriveBackendBaseUrl(),
});

export const authApi = createAuthApi(httpClient);
export const prayerApi = createPrayerApi(httpClient);
export const fastingApi = createFastingApi(httpClient);
export const remindersApi = createRemindersApi(httpClient);
export const dhikrApi = createDhikrApi(httpClient);
export const tafsirApi = createTafsirApi(httpClient);
export const quranApi = createQuranApi(httpClient);
export const ramadanApi = createRamadanApi(httpClient);
export const hijriApi = createHijriApi(httpClient);
export const imaneProgramApi = createImaneProgramApi(httpClient);
export const cycleApi = createCycleApi(httpClient);

export { httpClient, tokenStore };
