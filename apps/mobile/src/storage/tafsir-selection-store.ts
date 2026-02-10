import * as SecureStore from 'expo-secure-store';
import type { Locale } from '@oumoul/api';

const KEY = 'oumoul_tafsir_selection';

export interface StoredTafsirSelection {
  surah: string;
  ayah: string;
  locale: Locale;
  source?: string;
}

export async function loadTafsirSelection(): Promise<StoredTafsirSelection | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTafsirSelection;
    if (!parsed?.surah || !parsed?.ayah || !parsed?.locale) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveTafsirSelection(selection: StoredTafsirSelection): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(selection));
  } catch {
    // ignore persistence errors
  }
}
