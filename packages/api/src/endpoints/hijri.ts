import { apiRoutes } from '@oumoul/config';
import { HttpClient } from '../http-client';
import type { HijriCalendarResponse } from '../types';

export function createHijriApi(client: HttpClient) {
  const base = `${apiRoutes.backend.hijri ?? '/hijri'}`;

  return {
    calendar(params: {
      hijriYear?: number;
      hijriMonth?: number;
      city?: string;
      country?: string;
      method?: number;
    }) {
      const search = new URLSearchParams();
      if (params.hijriYear) search.set('hijriYear', String(params.hijriYear));
      if (params.hijriMonth) search.set('hijriMonth', String(params.hijriMonth));
      if (params.city) search.set('city', params.city);
      if (params.country) search.set('country', params.country);
      if (typeof params.method === 'number') search.set('method', String(params.method));

      const query = search.toString();
      const path = query ? `${base}/calendar?${query}` : `${base}/calendar`;
      return client.request<HijriCalendarResponse>(path, { method: 'GET' });
    },

    ramadan(params: { hijriYear?: number; city?: string; country?: string; method?: number }) {
      const search = new URLSearchParams();
      if (params.hijriYear) search.set('hijriYear', String(params.hijriYear));
      if (params.city) search.set('city', params.city);
      if (params.country) search.set('country', params.country);
      if (typeof params.method === 'number') search.set('method', String(params.method));

      const query = search.toString();
      const path = query ? `${base}/ramadan?${query}` : `${base}/ramadan`;
      return client.request<{ year: number; city: string; country: string; days: Array<{ day: number; gregorianDate: string; hijriDate: string }> }>(path, {
        method: 'GET',
      });
    },
  } as const;
}
