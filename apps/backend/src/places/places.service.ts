import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const FETCH_TIMEOUT_MS = 10_000;

function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

export interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  rating?: number;
  reviewCount?: number;
  isOpen?: boolean;
  phone?: string;
  website?: string;
  types: string[];
}

export interface HalalPlace extends NearbyPlace {
  category: 'mosque' | 'restaurant' | 'butcher' | 'grocery' | 'school';
  facilities: string[];
  communityAdded: boolean;
}

@Injectable()
export class PlacesService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY') ?? '';
  }

  async findNearbyMosques(lat: number, lng: number, radius = 5000): Promise<HalalPlace[]> {
    if (!this.apiKey) return this.getFallbackMosques(lat, lng);

    try {
      const url = `${this.baseUrl}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=mosque&key=${this.apiKey}`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) return this.getFallbackMosques(lat, lng);

      const json = (await res.json()) as {
        results: Array<{
          place_id: string;
          name: string;
          vicinity: string;
          geometry: { location: { lat: number; lng: number } };
          rating?: number;
          user_ratings_total?: number;
          opening_hours?: { open_now: boolean };
          types: string[];
        }>;
      };

      return (json.results ?? []).map((p) => ({
        id: p.place_id,
        name: p.name,
        address: p.vicinity,
        latitude: p.geometry.location.lat,
        longitude: p.geometry.location.lng,
        distance: this.calcDistance(lat, lng, p.geometry.location.lat, p.geometry.location.lng),
        rating: p.rating,
        reviewCount: p.user_ratings_total,
        isOpen: p.opening_hours?.open_now,
        types: p.types,
        category: 'mosque' as const,
        facilities: [],
        communityAdded: false,
      })).sort((a, b) => a.distance - b.distance);
    } catch {
      return this.getFallbackMosques(lat, lng);
    }
  }

  async findNearbyHalal(lat: number, lng: number, radius = 3000, category?: string): Promise<HalalPlace[]> {
    if (!this.apiKey) return [];

    const typeMap: Record<string, string> = {
      restaurant: 'restaurant',
      butcher: 'store',
      grocery: 'supermarket',
      school: 'school',
    };

    const type = category ? (typeMap[category] ?? 'establishment') : 'restaurant';
    const keyword = category === 'butcher' ? 'halal+boucherie' : 'halal';

    try {
      const url = `${this.baseUrl}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&keyword=${keyword}&key=${this.apiKey}`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) return [];

      const json = (await res.json()) as {
        results: Array<{
          place_id: string;
          name: string;
          vicinity: string;
          geometry: { location: { lat: number; lng: number } };
          rating?: number;
          user_ratings_total?: number;
          opening_hours?: { open_now: boolean };
          types: string[];
        }>;
      };

      return (json.results ?? []).map((p) => ({
        id: p.place_id,
        name: p.name,
        address: p.vicinity,
        latitude: p.geometry.location.lat,
        longitude: p.geometry.location.lng,
        distance: this.calcDistance(lat, lng, p.geometry.location.lat, p.geometry.location.lng),
        rating: p.rating,
        reviewCount: p.user_ratings_total,
        isOpen: p.opening_hours?.open_now,
        types: p.types,
        category: (category as HalalPlace['category']) ?? 'restaurant',
        facilities: [],
        communityAdded: false,
      })).sort((a, b) => a.distance - b.distance);
    } catch {
      return [];
    }
  }

  private calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private getFallbackMosques(lat: number, lng: number): HalalPlace[] {
    // Returns empty list when no API key — mobile handles fallback UI
    return [];
  }
}
