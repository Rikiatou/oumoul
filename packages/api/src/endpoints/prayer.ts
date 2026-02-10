import { apiRoutes } from '@oumoul/config';
import { HttpClient } from '../http-client';
import type { PrayerTimesRequest, PrayerTimesResponse } from '../types';
import { buildQuery } from '../utils';

export function createPrayerApi(client: HttpClient) {
  const base = `${apiRoutes.backend.prayer}`;

  return {
    getPrayerTimes(params: PrayerTimesRequest) {
      const query = buildQuery(params);
      return client.request<PrayerTimesResponse>(`${base}${query}`, {
        method: 'GET',
      });
    },
  } as const;
}
