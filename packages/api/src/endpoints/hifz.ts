import { HttpClient } from '../http-client';
import { apiRoutes } from '@oumoul/config';

export interface HifzEntryRemote {
  id: string;
  surahId: number;
  surahName: string;
  ayahFrom: number;
  ayahTo: number;
  interval: number;
  ease: number;
  repetitions: number;
  lastScore: number | null;
  nextReview: string;
  addedAt: string;
  updatedAt: string;
}

export interface UpsertHifzEntryPayload {
  surahId: number;
  surahName: string;
  ayahFrom: number;
  ayahTo: number;
  interval: number;
  ease: number;
  repetitions: number;
  lastScore?: number | null;
  nextReview: string;
}

export interface HifzStats {
  total: number;
  due: number;
  mastered: number;
}

export interface BulkSyncHifzPayload {
  entries: UpsertHifzEntryPayload[];
}

export function createHifzApi(client: HttpClient) {
  const base = apiRoutes.backend.hifz;

  return {
    getAll() {
      return client.request<HifzEntryRemote[]>(`${base}`, { method: 'GET' });
    },

    getStats() {
      return client.request<HifzStats>(`${base}/stats`, { method: 'GET' });
    },

    upsert(payload: UpsertHifzEntryPayload) {
      return client.request<HifzEntryRemote>(`${base}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    bulkSync(payload: BulkSyncHifzPayload) {
      return client.request<{ synced: number }>(`${base}/bulk-sync`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    remove(surahId: number, ayahFrom: number, ayahTo: number) {
      return client.request<{ deleted: boolean }>(
        `${base}/${surahId}/${ayahFrom}/${ayahTo}`,
        { method: 'DELETE' },
      );
    },
  };
}
