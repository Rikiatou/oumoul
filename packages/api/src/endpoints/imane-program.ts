import { apiRoutes } from '@oumoul/config';
import { HttpClient } from '../http-client';
import type {
  ImaneProgramItems,
  ImaneProgramDayResponse,
  ImaneProgramMonthResponse,
} from '../types';

export function createImaneProgramApi(client: HttpClient) {
  const base = `${apiRoutes.backend.imaneProgram ?? '/imane/program'}`;

  return {
    getProgram(date?: string) {
      const search = new URLSearchParams();
      if (date) {
        search.set('date', date);
      }
      const query = search.toString();
      const path = query ? `${base}?${query}` : base;
      return client.request<ImaneProgramDayResponse>(path, { method: 'GET' });
    },

    updateProgram(payload: { date?: string; items: ImaneProgramItems }) {
      return client.request<ImaneProgramDayResponse>(base, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    getMonth(year: number, month: number) {
      const search = new URLSearchParams();
      search.set('year', String(year));
      search.set('month', String(month));
      const path = `${base}/month?${search.toString()}`;
      return client.request<ImaneProgramMonthResponse>(path, { method: 'GET' });
    },
  } as const;
}
