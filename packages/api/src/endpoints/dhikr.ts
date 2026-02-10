import { HttpClient } from '../http-client';
import { apiRoutes } from '@oumoul/config';
import {
  DhikrCategory,
  DhikrRecord,
  UpdateDhikrRecordPayload,
  UpsertDhikrRecordPayload,
} from '../types';

export function createDhikrApi(client: HttpClient) {
  const base = `${apiRoutes.backend.dhikr ?? '/dhikr'}`;

  return {
    listCategories() {
      return client.request<DhikrCategory[]>(`${base}/categories`, {
        method: 'GET',
      });
    },
    listRecords(params?: { entryId?: string }) {
      const search = new URLSearchParams();
      if (params?.entryId) {
        search.set('entryId', params.entryId);
      }
      const query = search.toString();
      const url = query ? `${base}/records?${query}` : `${base}/records`;
      return client.request<DhikrRecord[]>(url, {
        method: 'GET',
      });
    },
    upsertRecord(payload: UpsertDhikrRecordPayload) {
      return client.request<DhikrRecord>(`${base}/records`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateRecord(id: string, payload: UpdateDhikrRecordPayload) {
      return client.request<DhikrRecord>(`${base}/records/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    deleteRecord(id: string) {
      return client.request<{ deleted: true }>(`${base}/records/${id}`, {
        method: 'DELETE',
      });
    },
  } as const;
}
