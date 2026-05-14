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

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-production-bdc1.up.railway.app/api';

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

// ── Community API (direct) ────────────────────────────────────────────────────
async function communityFetch(path: string, options: RequestInit = {}) {
  const session = await tokenStore.getTokens();
  const token = session?.accessToken;
  const res = await fetch(`${API_URL}/community${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(err);
  }
  return res.json();
}

export const communityApi = {
  getPosts: (page = 1) => communityFetch(`/posts?page=${page}&limit=20`) as Promise<{
    posts: Array<{ id: string; author: string; initials: string; type: string; content: string; tags: string[]; likes: number; likedByMe: boolean; createdAt: string }>;
    total: number; page: number; hasMore: boolean;
  }>,
  createPost: (body: { type: string; content: string; tags?: string }) =>
    communityFetch('/posts', { method: 'POST', body: JSON.stringify(body) }),
  deletePost: (id: string) => communityFetch(`/posts/${id}`, { method: 'DELETE' }),
  toggleLike: (id: string) => communityFetch(`/posts/${id}/like`, { method: 'POST' }) as Promise<{ liked: boolean; likes: number }>,
  getChallenges: () => communityFetch('/challenges') as Promise<Array<{ id: string; title: string; description: string; icon: string; color: string; durationDays: number; participants: number; joined: boolean }>>,
  toggleChallenge: (id: string) => communityFetch(`/challenges/${id}/join`, { method: 'POST' }) as Promise<{ joined: boolean; participants: number }>,
};
