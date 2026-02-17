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
  createPrayerTrackingApi,
  createQuranAudioApi,
  createAllahNamesApi,
  createMosqueFinderApi,
} from '@oumoul/api';
import { SecureTokenStore } from '../storage/secure-token-store';

const tokenStore = new SecureTokenStore();

export const API_URL = 'https://backend-production-bdc1.up.railway.app/api';

const httpClient = new HttpClient({
  tokenStore,
  baseUrl: API_URL,
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
export const prayerTrackingApi = createPrayerTrackingApi(httpClient);
export const quranAudioApi = createQuranAudioApi(httpClient);
export const allahNamesApi = createAllahNamesApi(httpClient);
export const mosqueFinderApi = createMosqueFinderApi(httpClient);

export { httpClient, tokenStore };
