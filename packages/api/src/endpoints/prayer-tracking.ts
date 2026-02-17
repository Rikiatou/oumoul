import { HttpClient } from '../http-client';
import { apiRoutes } from '@oumoul/config';
import {
  PrayerLog,
  PrayerStats,
  UpsertPrayerLogPayload,
  GetPrayerLogsQuery,
} from '../types-additions';

export function createPrayerTrackingApi(client: HttpClient) {
  const base = `${apiRoutes.backend.prayerTracking ?? '/prayer-tracking'}`;

  return {
    // Get prayer logs
    getLogs(query?: GetPrayerLogsQuery) {
      const search = new URLSearchParams();
      if (query?.fromDate) search.set('fromDate', query.fromDate);
      if (query?.toDate) search.set('toDate', query.toDate);
      if (query?.limit) search.set('limit', query.limit.toString());
      if (query?.offset) search.set('offset', query.offset.toString());
      
      const queryString = search.toString();
      const url = queryString ? `${base}/logs?${queryString}` : `${base}/logs`;
      
      return client.request<PrayerLog[]>(url, {
        method: 'GET',
      });
    },

    // Get or create today's prayer log
    getTodayLog() {
      return client.request<PrayerLog>(`${base}/logs/today`, {
        method: 'GET',
      });
    },

    // Upsert prayer log
    upsertLog(payload: UpsertPrayerLogPayload) {
      return client.request<PrayerLog>(`${base}/logs`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    // Get prayer statistics
    getStats(period?: 'week' | 'month' | 'year' | 'all') {
      const url = period ? `${base}/stats?period=${period}` : `${base}/stats`;
      return client.request<PrayerStats>(url, {
        method: 'GET',
      });
    },

    // Get prayer streak
    getStreak() {
      return client.request<{ current: number; longest: number }>(`${base}/streak`, {
        method: 'GET',
      });
    },
  };
}
