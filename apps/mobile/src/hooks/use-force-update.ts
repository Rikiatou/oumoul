import { useEffect, useState } from 'react';

/**
 * Hook to force component re-render when theme changes
 * This ensures components update properly when dark/light mode toggles
 */
export function useForceUpdate() {
  const [, setTick] = useState(0);
  
  const forceUpdate = () => {
    setTick(tick => tick + 1);
  };
  
  return { forceUpdate };
}
