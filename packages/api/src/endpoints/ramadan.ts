import { apiRoutes } from '@oumoul/config';
import type { FastingLogStatus, RamadanSummaryResponse } from '../types';
import { HttpClient } from '../http-client';

export function createRamadanApi(client: HttpClient) {
  const base = `${apiRoutes.backend.ramadan ?? '/ramadan'}`;

  return {
    summary(year: number) {
      const search = new URLSearchParams();
      search.set('year', String(year));
      const query = search.toString();
      const path = query ? `${base}/summary?${query}` : `${base}/summary`;
      return client.request<RamadanSummaryResponse>(path, {
        method: 'GET',
      });
    },

    upsertDay(payload: { date: string; fastStatus: FastingLogStatus; notes?: string | null }) {
      return client.request<{ id: string; date: string; fastStatus: FastingLogStatus; notes: string | null }>(`${base}/day`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
  } as const;
}
