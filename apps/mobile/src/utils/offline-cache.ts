import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'oumoul_cache_';
const CACHE_TTL_KEY = 'oumoul_cache_ttl_';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Simple offline cache using SecureStore.
 * Stores JSON-serializable data with optional TTL.
 */
export const offlineCache = {
  async set<T>(key: string, data: T, ttlMs?: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = { data, timestamp: Date.now() };
      await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
      if (ttlMs) {
        await AsyncStorage.setItem(CACHE_TTL_KEY + key, String(ttlMs));
      }
    } catch {}
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);

      // Check TTL
      const ttlRaw = await AsyncStorage.getItem(CACHE_TTL_KEY + key);
      if (ttlRaw) {
        const ttl = parseInt(ttlRaw, 10);
        if (Date.now() - entry.timestamp > ttl) {
          await offlineCache.remove(key);
          return null;
        }
      }

      return entry.data;
    } catch {
      return null;
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
      await AsyncStorage.removeItem(CACHE_TTL_KEY + key);
    } catch {}
  },

  async getWithFallback<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 24 * 60 * 60 * 1000
  ): Promise<T> {
    // Try cache first
    const cached = await offlineCache.get<T>(key);
    if (cached !== null) return cached;

    // Fetch fresh data
    try {
      const data = await fetcher();
      await offlineCache.set(key, data, ttlMs);
      return data;
    } catch (err) {
      // If fetch fails, try stale cache (ignore TTL)
      try {
        const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
        if (raw) {
          const entry: CacheEntry<T> = JSON.parse(raw);
          return entry.data;
        }
      } catch {}
      throw err;
    }
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
