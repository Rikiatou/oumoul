import { HttpClient } from '../http-client';
import { apiRoutes } from '@oumoul/config';
import {
  Mosque,
  MosqueReview,
  GetMosquesQuery,
  CreateMosqueReviewPayload,
} from '../types-additions';

export function createMosqueFinderApi(client: HttpClient) {
  const base = `${apiRoutes.backend.mosqueFinder ?? '/mosques'}`;

  return {
    getNearby(query: GetMosquesQuery) {
      const search = new URLSearchParams();
      if (query.latitude != null) search.set('lat', query.latitude.toString());
      if (query.longitude != null) search.set('lng', query.longitude.toString());
      if (query.radius) search.set('radius', query.radius.toString());
      if (query.city) search.set('city', query.city);
      if (query.limit) search.set('limit', query.limit.toString());
      if (query.offset) search.set('offset', query.offset.toString());
      if (query.facilities?.length) search.set('facilities', query.facilities.join(','));
      const qs = search.toString();
      return client.request<Mosque[]>(qs ? `${base}?${qs}` : base, { method: 'GET' });
    },

    getById(id: string) {
      return client.request<Mosque>(`${base}/${id}`, { method: 'GET' });
    },

    getReviews(mosqueId: string) {
      return client.request<MosqueReview[]>(`${base}/${mosqueId}/reviews`, { method: 'GET' });
    },

    createReview(payload: CreateMosqueReviewPayload) {
      return client.request<MosqueReview>(`${base}/${payload.mosqueId}/reviews`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };
}
