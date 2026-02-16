import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'oumoul.detectedLocation';

export interface DetectedLocation {
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
  timeZone: string | null;
  timestamp: number;
}

const FALLBACK: DetectedLocation = {
  latitude: 4.0511,
  longitude: 9.7679,
  city: 'Douala',
  country: 'Cameroon',
  timeZone: 'Africa/Douala',
  timestamp: 0,
};

// Cache duration: 30 minutes
const CACHE_MS = 30 * 60 * 1000;

/**
 * Shared hook that auto-detects GPS location, reverse-geocodes to city/country,
 * and resolves timezone. Caches results in SecureStore.
 */
export function useLocation() {
  const [location, setLocation] = useState<DetectedLocation>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const locationRef = useRef(FALLBACK);
  locationRef.current = location;

  const detect = useCallback(async (force = false): Promise<DetectedLocation> => {
    setLoading(true);
    setError(null);

    // Try cached first
    if (!force) {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as DetectedLocation;
          if (cached.timestamp && Date.now() - cached.timestamp < CACHE_MS) {
            setLocation(cached);
            setLoading(false);
            return cached;
          }
        }
      } catch {
        // ignore cache errors
      }
    }

    // Request permission
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setError('Permission de localisation refusée');
        setLoading(false);
        return locationRef.current;
      }
    } catch {
      setError('Impossible de demander la permission');
      setLoading(false);
      return locationRef.current;
    }

    // Get GPS position
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = pos.coords;

      // Reverse geocode
      let city: string | null = null;
      let country: string | null = null;
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo) {
          city = geo.city ?? geo.subregion ?? geo.region ?? null;
          country = geo.country ?? null;
        }
      } catch {
        // geocoding may fail, continue with coords
      }

      // Resolve timezone from Intl
      let timeZone: string | null = null;
      try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
      } catch {
        // fallback
      }

      const detected: DetectedLocation = {
        latitude,
        longitude,
        city,
        country,
        timeZone,
        timestamp: Date.now(),
      };

      setLocation(detected);

      // Cache
      try {
        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(detected));
      } catch {
        // ignore
      }

      setLoading(false);
      return detected;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de détecter la position';
      setError(message);
      setLoading(false);
      return locationRef.current;
    }
  }, []);

  useEffect(() => {
    void detect();
  }, []);

  return {
    location,
    loading,
    error,
    permissionDenied,
    refresh: () => detect(true),
  };
}
