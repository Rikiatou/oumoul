import { createContext, useContext, type ReactNode } from 'react';
import { useLocation, type DetectedLocation } from '../hooks/use-location';

interface LocationContextValue {
  location: DetectedLocation;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
  refresh: () => Promise<DetectedLocation>;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const loc = useLocation();
  return <LocationContext.Provider value={loc}>{children}</LocationContext.Provider>;
}

export function useLocationContext(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationContext must be used within LocationProvider');
  return ctx;
}
