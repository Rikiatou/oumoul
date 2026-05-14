import * as SecureStore from 'expo-secure-store';

const WIDGET_DATA_KEY = 'oumoul_widget_data';

/**
 * Widget data provider.
 * Stores prayer times and next prayer info for home screen widgets.
 * On iOS this would use App Groups / WidgetKit, on Android SharedPreferences.
 * This data is automatically synced when prayer times are updated.
 */
export interface WidgetPrayerData {
  nextPrayer: string;
  nextPrayerTime: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  hijriDate: string;
  location: string;
  updatedAt: string;
}

export async function updateWidgetData(data: WidgetPrayerData): Promise<void> {
  try {
    await SecureStore.setItemAsync(WIDGET_DATA_KEY, JSON.stringify(data));
  } catch {}
}

export async function getWidgetData(): Promise<WidgetPrayerData | null> {
  try {
    const raw = await SecureStore.getItemAsync(WIDGET_DATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WidgetPrayerData;
  } catch {
    return null;
  }
}

/**
 * Call this after prayer times are fetched to keep widget data fresh.
 */
export async function syncWidgetPrayerTimes(params: {
  times: Record<string, string>;
  nextPrayer: string;
  nextPrayerTime: string;
  hijriDate: string;
  location: string;
}): Promise<void> {
  const data: WidgetPrayerData = {
    nextPrayer: params.nextPrayer,
    nextPrayerTime: params.nextPrayerTime,
    fajr: params.times['Fajr'] ?? '',
    dhuhr: params.times['Dhuhr'] ?? '',
    asr: params.times['Asr'] ?? '',
    maghrib: params.times['Maghrib'] ?? '',
    isha: params.times['Isha'] ?? '',
    hijriDate: params.hijriDate,
    location: params.location,
    updatedAt: new Date().toISOString(),
  };
  await updateWidgetData(data);
}
