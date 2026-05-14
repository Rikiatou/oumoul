import { HttpClient } from '../http-client';
import { apiRoutes } from '@oumoul/config';

export type PrayerNameCloud = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
export type PrayerLogStatusCloud = 'PRAYED_ON_TIME' | 'PRAYED_LATE' | 'MISSED' | 'EXEMPTED';

export interface PrayerLogEntry {
  id: string;
  date: string;
  prayer: PrayerNameCloud;
  status: PrayerLogStatusCloud;
  createdAt: string;
  updatedAt: string;
}

export interface PrayerLogCloudStats {
  total: number;
  onTime: number;
  late: number;
  missed: number;
  streak: number;
}

export interface UpsertPrayerLogCloudPayload {
  date: string;
  prayer: PrayerNameCloud;
  status: PrayerLogStatusCloud;
}

export interface BulkSyncPrayerLogPayload {
  logs: UpsertPrayerLogCloudPayload[];
}

export function createPrayerLogApi(client: HttpClient) {
  const base = apiRoutes.backend.prayerLog;

  return {
    getLogs(from?: string, to?: string) {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return client.request<PrayerLogEntry[]>(`${base}${qs ? `?${qs}` : ''}`, { method: 'GET' });
    },

    getStats(days?: number) {
      const qs = days ? `?days=${days}` : '';
      return client.request<PrayerLogCloudStats>(`${base}/stats${qs}`, { method: 'GET' });
    },

    upsert(payload: UpsertPrayerLogCloudPayload) {
      return client.request<PrayerLogEntry>(`${base}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    bulkSync(payload: BulkSyncPrayerLogPayload) {
      return client.request<{ synced: number }>(`${base}/bulk-sync`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };
}
