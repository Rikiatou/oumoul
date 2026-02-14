import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@oumoul/ui';
import type { AuthUser, HijriCalendarDay, HijriCalendarResponse } from '@oumoul/api';
import * as SecureStore from 'expo-secure-store';
import { hijriApi } from '../api';
import { cancelReminder, scheduleDateReminder } from '../push-notifications';
import { sc, ss } from '../ui/theme';

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await hijriApi.calendar({
        hijriYear,
        hijriMonth,
        city: 'Douala',
        country: 'Cameroon',
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
  }, [hijriMonth, hijriYear]);

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
          city: 'Douala',
          country: 'Cameroon',
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
    [findGregorianDateForHijriDay, hijriYear],
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
    <View style={[ss.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={ss.mb20}>
          <TouchableOpacity onPress={onBack} style={[ss.row, ss.gap4, ss.mb12]}>
            <Ionicons name="chevron-back" size={20} color={sc.accent} />
            <Text style={{ color: sc.accent, fontWeight: '600', fontSize: 14 }}>Retour</Text>
          </TouchableOpacity>
          <Text style={ss.title}>Calendrier Hijri</Text>
          <Text style={ss.subtitle}>Douala, Cameroun</Text>
        </View>

        {/* Month navigation + calendar */}
        <View style={ss.card}>
          <View style={[ss.row, { justifyContent: 'space-between' }]}>
            <TouchableOpacity onPress={goPrev} style={ss.outlineBtn}>
              <Ionicons name="chevron-back" size={16} color={sc.text} />
            </TouchableOpacity>
            <Text style={ss.sectionTitle}>{title}</Text>
            <TouchableOpacity onPress={goNext} style={ss.outlineBtn}>
              <Ionicons name="chevron-forward" size={16} color={sc.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator color={sc.accent} />
              <Text style={[ss.muted, { marginTop: 8 }]}>Chargement…</Text>
            </View>
          ) : error ? (
            <Text style={ss.errorText}>{error}</Text>
          ) : days.length === 0 ? (
            <Text style={ss.muted}>Aucun jour trouvé.</Text>
          ) : (
            <View style={{ gap: 6, marginTop: 8 }}>
              {days.map((day: HijriCalendarDay) => {
                const isToday = day.gregorianDate === todayIso;
                return (
                  <View
                    key={day.gregorianDate}
                    style={[
                      ss.infoRow,
                      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
                      isToday && { backgroundColor: 'rgba(0,0,0,0.06)', borderWidth: 1, borderColor: sc.accent },
                    ]}
                  >
                    <View style={{ gap: 2 }}>
                      <Text style={{ color: sc.text, fontWeight: '600', fontSize: 13 }}>
                        Jour {day.day} · {day.hijriDate}
                      </Text>
                      <Text style={{ color: sc.textSoft, fontSize: 12 }}>{formatGregorian(day.gregorianDate)}</Text>
                    </View>
                    {isToday && (
                      <View style={[ss.chip, ss.chipActive, { paddingHorizontal: 10, paddingVertical: 3 }]}>
                        <Text style={[ss.chipTextActive, { fontSize: 10 }]}>Aujourd'hui</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Islamic events */}
        <View style={ss.card}>
          <Text style={ss.sectionTitle}>Événements islamiques</Text>
          <Text style={ss.muted}>Active des rappels locaux pour les prochaines dates à Douala.</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {ISLAMIC_EVENTS.map((event) => (
              <View key={event.key} style={[ss.infoRow, ss.row, { justifyContent: 'space-between' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: sc.text, fontWeight: '600', fontSize: 13 }}>{event.title}</Text>
                  <Text style={{ color: sc.muted, fontSize: 11 }}>{`${event.hijriDay}/${event.hijriMonth} Hijri`}</Text>
                </View>
                <Switch
                  value={eventReminders[event.key]}
                  onValueChange={() => void toggleEventReminder(event)}
                  trackColor={{ true: sc.accent, false: 'rgba(0,0,0,0.1)' }}
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
