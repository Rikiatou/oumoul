import { apiRoutes } from '@oumoul/config';
import { HttpClient } from '../http-client';
import type { HadithRandomResponse } from '../types';

export function createHadithApi(client: HttpClient) {
  const base = `${apiRoutes.backend.hadith ?? '/hadith'}`;

  return {
    random(topic?: string) {
      const search = new URLSearchParams();
      if (topic) {
        search.set('topic', topic);
      }
      const query = search.toString();
      const path = query ? `${base}/random?${query}` : `${base}/random`;
      return client.request<HadithRandomResponse>(path, { method: 'GET' });
    },
  } as const;
}
