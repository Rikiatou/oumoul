import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AuthUser, HijriCalendarDay, HijriCalendarResponse } from '@oumoul/api';
import * as SecureStore from 'expo-secure-store';
import { hijriApi } from '../api';
import { cancelReminder, scheduleDateReminder } from '../push-notifications';
import { useLocationContext } from '../context/location-context';
import { palette } from '../theme';

type IslamicEventKey =
  | 'ramadan_start'
  | 'laylat_al_qadr'
  | 'eid_al_fitr'
  | 'arafah'
  | 'eid_al_adha'
  | 'ashura'
  | 'mawlid';

type IslamicEvent = {
  key: IslamicEventKey;
  title: string;
  hijriMonth: number;
  hijriDay: number;
  defaultHour: number;
  defaultMinute: number;
};

const ISLAMIC_EVENTS: IslamicEvent[] = [
  { key: 'ramadan_start', title: 'Début de Ramadan', hijriMonth: 9, hijriDay: 1, defaultHour: 8, defaultMinute: 0 },
  { key: 'laylat_al_qadr', title: 'Laylat al-Qadr (27)', hijriMonth: 9, hijriDay: 27, defaultHour: 18, defaultMinute: 0 },
  { key: 'eid_al_fitr', title: 'Aïd al-Fitr', hijriMonth: 10, hijriDay: 1, defaultHour: 8, defaultMinute: 0 },
  { key: 'arafah', title: 'Jour de Arafah', hijriMonth: 12, hijriDay: 9, defaultHour: 8, defaultMinute: 0 },
  { key: 'eid_al_adha', title: 'Aïd al-Adha', hijriMonth: 12, hijriDay: 10, defaultHour: 8, defaultMinute: 0 },
  { key: 'ashura', title: 'Ashura', hijriMonth: 1, hijriDay: 10, defaultHour: 8, defaultMinute: 0 },
  { key: 'mawlid', title: 'Mawlid (12 Rabiʿ al-Awwal)', hijriMonth: 3, hijriDay: 12, defaultHour: 8, defaultMinute: 0 },
];

function getCurrentHijriYearMonth(): { year: number; month: number } {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric' });
    const parts = formatter.formatToParts(now);
    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
      return { year, month };
    }
  } catch {
    // ignore
  }
  return { year: now.getUTCFullYear(), month: 9 };
}

function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function HijriCalendarScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const initial = useMemo(() => getCurrentHijriYearMonth(), []);
  const [hijriYear, setHijriYear] = useState<number>(initial.year);
  const [hijriMonth, setHijriMonth] = useState<number>(initial.month);

  const [data, setData] = useState<HijriCalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [eventReminders, setEventReminders] = useState<Record<IslamicEventKey, boolean>>({
    ramadan_start: false,
    laylat_al_qadr: false,
    eid_al_fitr: false,
    arafah: false,
    eid_al_adha: false,
    ashura: false,
    mawlid: false,
  });

  const title = useMemo(() => {
    const monthName = data?.days?.[0]?.hijriMonth?.en;
    const monthLabel = monthName ? `${monthName} (${hijriMonth})` : `Mois ${hijriMonth}`;
    return `${monthLabel} · ${hijriYear}`;
  }, [data, hijriMonth, hijriYear]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const { location: detectedLoc } = useLocationContext();
  const locLabel = detectedLoc.city && detectedLoc.country
    ? `${detectedLoc.city}, ${detectedLoc.country}`
    : detectedLoc.city ?? 'Localisation détectée';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await hijriApi.calendar({
        hijriYear,
        hijriMonth,
        city: detectedLoc.city ?? 'Douala',
        country: detectedLoc.country ?? 'Cameroon',
        method: 2,
      });
      setData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de charger le calendrier Hijri.';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [hijriMonth, hijriYear, detectedLoc.city, detectedLoc.country]);

  useEffect(() => {
    const loadEventToggles = async () => {
      try {
        const raw = await SecureStore.getItemAsync('oumoul.islamicEventReminders');
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<Record<IslamicEventKey, boolean>>;
        setEventReminders((prev) => ({ ...prev, ...parsed }));
      } catch {
        // ignore
      }
    };
    void loadEventToggles();
  }, []);

  const persistEventToggles = useCallback(async (next: Record<IslamicEventKey, boolean>) => {
    try {
      await SecureStore.setItemAsync('oumoul.islamicEventReminders', JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const findGregorianDateForHijriDay = useCallback((days: HijriCalendarDay[], targetHijriDay: number) => {
    for (const d of days) {
      const parts = d.hijriDate.split('-');
      const dayPart = Number(parts[2]);
      if (dayPart === targetHijriDay) {
        return d.gregorianDate;
      }
    }
    return null;
  }, []);

  const getNextEventGregorianDate = useCallback(
    async (event: IslamicEvent): Promise<Date | null> => {
      const tryYears = [hijriYear, hijriYear + 1];
      for (const yearCandidate of tryYears) {
        const cal = await hijriApi.calendar({
          hijriYear: yearCandidate,
          hijriMonth: event.hijriMonth,
          city: detectedLoc.city ?? 'Douala',
          country: detectedLoc.country ?? 'Cameroon',
          method: 2,
        });

        const gregIso = findGregorianDateForHijriDay(cal.days, event.hijriDay);
        if (!gregIso) continue;

        const dt = new Date(
          `${gregIso}T${String(event.defaultHour).padStart(2, '0')}:${String(event.defaultMinute).padStart(2, '0')}:00.000`,
        );
        if (dt.getTime() > Date.now()) {
          return dt;
        }
      }
      return null;
    },
    [findGregorianDateForHijriDay, hijriYear, detectedLoc.city, detectedLoc.country],
  );

  const toggleEventReminder = useCallback(
    async (event: IslamicEvent) => {
      const isEnabled = eventReminders[event.key];
      const id = `event-${event.key}`;

      if (isEnabled) {
        await cancelReminder(id);
        setEventReminders((prev) => {
          const next = { ...prev, [event.key]: false };
          void persistEventToggles(next);
          return next;
        });
        return;
      }

      try {
        const dt = await getNextEventGregorianDate(event);
        if (!dt) {
          throw new Error('Date indisponible');
        }
        await scheduleDateReminder({
          id,
          title: event.title,
          body: `Rappel: ${event.title}`,
          date: dt,
        });
        setEventReminders((prev) => {
          const next = { ...prev, [event.key]: true };
          void persistEventToggles(next);
          return next;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Impossible d’activer le rappel.';
        setError(message);
      }
    },
    [eventReminders, getNextEventGregorianDate, persistEventToggles],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const goPrev = useCallback(() => {
    setData(null);
    setHijriMonth((prev) => {
      if (prev <= 1) {
        setHijriYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  }, []);

  const goNext = useCallback(() => {
    setData(null);
    setHijriMonth((prev) => {
      if (prev >= 12) {
        setHijriYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  }, []);

  const days = data?.days ?? [];

  const formatGregorian = useCallback(
    (iso: string) => {
      const d = parseIsoDate(iso);
      try {
        return d.toLocaleDateString(user.locale ?? 'fr', { weekday: 'short', day: '2-digit', month: 'short' });
      } catch {
        return iso;
      }
    },
    [user.locale],
  );

  const insets = useSafeAreaInsets();

  return (
    <View style={[hc.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={hc.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={hc_c.accent} />
        </TouchableOpacity>
        <Text style={hc.topTitle}>Calendrier Hijri</Text>
        <Ionicons name="moon-outline" size={20} color={hc_c.muted} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={hc_c.accent} />}>
        {/* Location badge */}
        <View style={hc.locBadge}>
          <Ionicons name="location-outline" size={14} color={hc_c.accent} />
          <Text style={hc.locText}>{locLabel}</Text>
        </View>

        {/* Month navigation + calendar */}
        <View style={hc.card}>
          <View style={hc.monthNav}>
            <TouchableOpacity onPress={goPrev} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={20} color={hc_c.muted} />
            </TouchableOpacity>
            <Text style={hc.monthTitle}>{title}</Text>
            <TouchableOpacity onPress={goNext} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-forward" size={20} color={hc_c.muted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator size="large" color={hc_c.accent} />
            </View>
          ) : error ? (
            <Text style={hc.errorText}>{error}</Text>
          ) : days.length === 0 ? (
            <Text style={hc.mutedText}>Aucun jour trouvé.</Text>
          ) : (
            <View style={{ gap: 4, marginTop: 8 }}>
              {days.map((day: HijriCalendarDay) => {
                const isToday = day.gregorianDate === todayIso;
                return (
                  <View
                    key={day.gregorianDate}
                    style={[hc.dayRow, isToday && hc.dayRowToday]}
                  >
                    <View style={[hc.dayNum, isToday && { backgroundColor: hc_c.accent }]}>
                      <Text style={[hc.dayNumText, isToday && { color: '#fff' }]}>{day.day}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={hc.dayHijri}>{day.hijriDate}</Text>
                      <Text style={hc.dayGreg}>{formatGregorian(day.gregorianDate)}</Text>
                    </View>
                    {isToday && (
                      <View style={hc.todayBadge}>
                        <Text style={hc.todayBadgeText}>Aujourd'hui</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Islamic events */}
        <View style={hc.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="calendar-outline" size={18} color={hc_c.accent} />
            <Text style={hc.sectionTitle}>Événements islamiques</Text>
          </View>
          <Text style={hc.sectionSub}>Active des rappels locaux pour les prochaines dates.</Text>
          <View style={{ gap: 6, marginTop: 10 }}>
            {ISLAMIC_EVENTS.map((event) => (
              <View key={event.key} style={hc.eventRow}>
                <View style={hc.eventIcon}>
                  <Ionicons name="star-outline" size={16} color={hc_c.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={hc.eventTitle}>{event.title}</Text>
                  <Text style={hc.eventDate}>{`${event.hijriDay}/${event.hijriMonth} Hijri`}</Text>
                </View>
                <Switch
                  value={eventReminders[event.key]}
                  onValueChange={() => void toggleEventReminder(event)}
                  trackColor={{ true: hc_c.accent, false: 'rgba(0,0,0,0.1)' }}
                  thumbColor={eventReminders[event.key] ? '#fff' : '#ccc'}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const hc_c = {
  bg: palette.bgAlt,
  card: palette.card,
  border: palette.border,
  text: palette.text,
  textSoft: palette.textSoft,
  muted: palette.muted,
  accent: palette.primaryDark,
  accentLight: palette.accentLight,
};

const hc = StyleSheet.create({
  screen: { flex: 1, backgroundColor: hc_c.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: hc_c.border },
  topTitle: { fontSize: 20, fontWeight: '700', color: hc_c.text },

  locBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: hc_c.accentLight, marginHorizontal: 16, marginTop: 12, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  locText: { fontSize: 12, fontWeight: '600', color: hc_c.text },

  card: { backgroundColor: hc_c.card, marginHorizontal: 16, marginTop: 14, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: hc_c.border },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthTitle: { fontSize: 16, fontWeight: '700', color: hc_c.text },

  errorText: { color: '#C62828', fontSize: 13 },
  mutedText: { color: hc_c.muted, fontSize: 13 },

  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10 },
  dayRowToday: { backgroundColor: hc_c.accentLight, borderWidth: 1, borderColor: hc_c.accent + '30' },
  dayNum: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' },
  dayNumText: { fontSize: 13, fontWeight: '700', color: hc_c.text },
  dayHijri: { fontSize: 13, fontWeight: '600', color: hc_c.text },
  dayGreg: { fontSize: 11, color: hc_c.muted },
  todayBadge: { backgroundColor: hc_c.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  todayBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: hc_c.text },
  sectionSub: { fontSize: 12, color: hc_c.muted },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: hc_c.border },
  eventIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: hc_c.accentLight, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontSize: 13, fontWeight: '600', color: hc_c.text },
  eventDate: { fontSize: 11, color: hc_c.muted },
});
