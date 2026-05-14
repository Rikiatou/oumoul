import { useEffect } from 'react';
import { I18nManager, NativeModules } from 'react-native';

/**
 * F10 — RTL support with production-safe reload.
 * Enables RTL layout when locale is Arabic ('ar') and reloads so RN
 * re-renders the entire tree with the correct flex direction.
 * Safe to call multiple times — no-op if direction already matches.
 *
 * Reload chain (in order of availability):
 *   1. NativeModules.RCTRestart.restart()  — works in production builds (Android & iOS)
 *   2. NativeModules.DevSettings.reload()  — works in debug/dev server builds
 *   3. Silent — Expo Go / web where neither module is available
 */
function reloadApp() {
  try {
    const rctRestart = NativeModules.RCTRestart as { restart?: () => void } | undefined;
    if (rctRestart?.restart) {
      rctRestart.restart();
      return;
    }
    const devSettings = NativeModules.DevSettings as { reload?: () => void } | undefined;
    if (devSettings?.reload) {
      devSettings.reload();
      return;
    }
    // Expo Go / web: forceRTL will take effect on next cold start — no reload available
  } catch { /* ignore */ }
}

export function useRTL(locale: string | undefined | null) {
  useEffect(() => {
    const shouldBeRTL = locale === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      reloadApp();
    }
  }, [locale]);
}
