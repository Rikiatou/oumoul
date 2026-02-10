import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@oumoul/ui';
import type { AuthUser, HijriCalendarDay, HijriCalendarResponse } from '@oumoul/api';
import * as SecureStore from 'expo-secure-store';
import { hijriApi } from '../api';
import { cancelReminder, scheduleDateReminder } from '../push-notifications';

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

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <ScrollView contentContainerStyle={{ paddingVertical: 32, paddingHorizontal: 20 }}>
        <View className="mb-xl">
          <Text className="text-neutral-100 text-xs tracking-[4px] uppercase">{user.firstName || user.email}</Text>
          <Text className="text-neutral-100 text-3xl font-bold mt-sm">Calendrier Hijri</Text>
          <Text className="text-neutral-100/80 text-base leading-6 mt-xs">Douala, Cameroun</Text>
          <View className="flex-row gap-sm mt-md">
            <TouchableOpacity className="border border-white/60 rounded-md px-md py-xs" onPress={onBack}>
              <Text style={{ color: colors.neutral100, fontWeight: '600' }}>Retour au tableau de bord</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl gap-sm">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity className="border border-white/40 rounded-md px-md py-xs" onPress={goPrev}>
              <Text style={{ color: colors.neutral100, fontWeight: '700' }}>◀</Text>
            </TouchableOpacity>
            <Text className="text-neutral-100 text-lg font-semibold">{title}</Text>
            <TouchableOpacity className="border border-white/40 rounded-md px-md py-xs" onPress={goNext}>
              <Text style={{ color: colors.neutral100, fontWeight: '700' }}>▶</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="items-center mt-md">
              <ActivityIndicator color={colors.neutral100} />
              <Text className="text-neutral-100 mt-sm">Chargement…</Text>
            </View>
          ) : error ? (
            <Text className="text-[#ffb4ab]">{error}</Text>
          ) : days.length === 0 ? (
            <Text className="text-neutral-100/80">Aucun jour trouvé.</Text>
          ) : (
            <View className="gap-xs mt-sm">
              {days.map((day: HijriCalendarDay) => {
                const isToday = day.gregorianDate === todayIso;
                return (
                  <View
                    key={day.gregorianDate}
                    className={`rounded-lg px-md py-sm flex-row justify-between ${isToday ? 'bg-white/15' : 'bg-white/5'}`}
                  >
                    <View className="gap-1">
                      <Text className="text-neutral-100 font-semibold">
                        Jour {day.day} · {day.hijriDate}
                      </Text>
                      <Text className="text-neutral-100/70 text-sm">{formatGregorian(day.gregorianDate)}</Text>
                    </View>
                    {isToday ? <Text className="text-neutral-100/80 font-semibold">Aujourd’hui</Text> : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl gap-sm">
          <Text className="text-neutral-100 text-lg font-semibold">Événements islamiques</Text>
          <Text className="text-neutral-100/70 text-sm">
            Active des rappels locaux (sur cet appareil) pour les prochaines dates à Douala.
          </Text>
          <View className="gap-sm mt-sm">
            {ISLAMIC_EVENTS.map((event) => (
              <View key={event.key} className="bg-white/10 rounded-lg px-md py-sm flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-neutral-100 font-semibold">{event.title}</Text>
                  <Text className="text-neutral-100/70 text-xs">{`${event.hijriDay}/${event.hijriMonth} Hijri`}</Text>
                </View>
                <Switch
                  value={eventReminders[event.key]}
                  onValueChange={() => void toggleEventReminder(event)}
                  trackColor={{ true: colors.neutral100, false: 'rgba(255,255,255,0.2)' }}
                  thumbColor={eventReminders[event.key] ? colors.primary : colors.neutral100}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
