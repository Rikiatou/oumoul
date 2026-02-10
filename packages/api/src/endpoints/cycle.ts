import { apiRoutes } from '@oumoul/config';
import { HttpClient } from '../http-client';
import type { CycleMonthResponse, CycleDayDto, CycleStatus } from '../types';

export function createCycleApi(client: HttpClient) {
  const base = `${apiRoutes.backend.cycle ?? '/cycle'}`;

  return {
    getMonth(year: number, month: number) {
      const search = new URLSearchParams();
      search.set('year', String(year));
      search.set('month', String(month));
      const path = `${base}/days?${search.toString()}`;
      return client.request<CycleMonthResponse>(path, { method: 'GET' });
    },

    upsertDay(payload: { date: string; status: CycleStatus; notes?: string | null }) {
      return client.request<CycleDayDto>(`${base}/day`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
  } as const;
}
