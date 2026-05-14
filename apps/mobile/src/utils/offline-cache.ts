import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'oumoul_cache_';
const CACHE_INDEX_KEY = 'oumoul_cache_index';
const MAX_CACHE_ENTRIES = 200;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
  hits: number;
}

// ── Internal index for LRU eviction ──────────────────────────────────────────
async function getIndex(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

async function updateIndex(key: string): Promise<void> {
  try {
    let index = await getIndex();
    index = [key, ...index.filter((k) => k !== key)];
    if (index.length > MAX_CACHE_ENTRIES) {
      const evict = index.splice(MAX_CACHE_ENTRIES);
      await AsyncStorage.multiRemove(evict.map((k) => CACHE_PREFIX + k));
    }
    await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch { /* ignore */ }
}

/**
 * Offline-first cache with TTL, LRU eviction, stale-while-revalidate,
 * and network-aware fallback to stale data.
 */
export const offlineCache = {
  async set<T>(key: string, data: T, ttlMs = CACHE_TTL.LONG): Promise<void> {
    try {
      const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttlMs, hits: 0 };
      await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
      await updateIndex(key);
    } catch { /* ignore */ }
  },

  async get<T>(key: string): Promise<{ data: T; stale: boolean } | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      const stale = Date.now() - entry.timestamp > entry.ttlMs;
      // Bump hit count (fire-and-forget)
      void AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ...entry, hits: entry.hits + 1 }));
      return { data: entry.data, stale };
    } catch { return null; }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
      const index = (await getIndex()).filter((k) => k !== key);
      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
    } catch { /* ignore */ }
  },

  /**
   * Stale-while-revalidate:
   * 1. If fresh cache → return immediately
   * 2. If stale cache → return stale, then refresh in background
   * 3. If no cache → fetch and store
   * 4. If offline + no cache → throw; if offline + stale → return stale
   */
  async getWithFallback<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs = CACHE_TTL.LONG,
  ): Promise<T> {
    const cached = await offlineCache.get<T>(key);

    if (cached && !cached.stale) {
      return cached.data; // fresh
    }

    // Check network with a lightweight HEAD request
    const isOnline = await fetch('https://dns.google/resolve?name=google.com', { method: 'HEAD', signal: AbortSignal.timeout(3000) })
      .then(() => true).catch(() => false);

    if (!isOnline) {
      if (cached) return cached.data; // serve stale offline
      throw new Error('Pas de connexion et aucun cache disponible.');
    }

    if (cached?.stale) {
      // Serve stale immediately, revalidate in background
      fetcher().then((fresh) => void offlineCache.set(key, fresh, ttlMs)).catch(() => {});
      return cached.data;
    }

    // No cache at all — fetch and store
    const data = await fetcher();
    await offlineCache.set(key, data, ttlMs);
    return data;
  },

  /** Purge all expired entries (call on app foreground) */
  async purgeExpired(): Promise<void> {
    try {
      const index = await getIndex();
      const toRemove: string[] = [];
      for (const key of index) {
        const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
        if (!raw) { toRemove.push(key); continue; }
        const entry: CacheEntry<unknown> = JSON.parse(raw);
        const age = Date.now() - entry.timestamp;
        if (age > entry.ttlMs * 4) toRemove.push(key); // remove if 4x expired
      }
      if (toRemove.length > 0) {
        await AsyncStorage.multiRemove(toRemove.map((k) => CACHE_PREFIX + k));
        const newIndex = index.filter((k) => !toRemove.includes(k));
        await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(newIndex));
      }
    } catch { /* ignore */ }
  },

  /** Clear entire cache */
  async clearAll(): Promise<void> {
    try {
      const index = await getIndex();
      await AsyncStorage.multiRemove([CACHE_INDEX_KEY, ...index.map((k) => CACHE_PREFIX + k)]);
    } catch { /* ignore */ }
  },
};

// Cache keys
export const CACHE_KEYS = {
  PRAYER_TIMES: 'prayer_times',
  QURAN_SURAHS: 'quran_surahs',
  DHIKR_CATEGORIES: 'dhikr_categories',
  HADITH_DAILY: 'hadith_daily',
  ALLAH_NAMES_PROGRESS: 'allah_names_progress',
  PRAYER_LOGS: 'prayer_logs',
  USER_PREFERENCES: 'user_preferences',
} as const;

// TTL constants
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,         // 5 minutes
  MEDIUM: 60 * 60 * 1000,       // 1 hour
  LONG: 24 * 60 * 60 * 1000,    // 24 hours
  WEEK: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;
