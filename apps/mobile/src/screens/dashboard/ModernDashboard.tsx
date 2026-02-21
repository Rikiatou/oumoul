import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LocalRemindersSection } from "./LocalRemindersSection";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { Locale } from "@oumoul/api";
import { useTheme } from "../../context/theme-context";
import { useForceUpdate } from "../../hooks/use-force-update";
import { syncWidgetPrayerTimes } from "../../utils/widget-data";
import { getRamadanInfo, getCurrentHijriDate } from "../../utils/hijri-calendar";
import { Header } from "./Header";
import { NextPrayerCard } from "./NextPrayerCard";
import { RamadanPriorityCard } from "./RamadanPriorityCard";
import { ImanProgramCard } from "./ImanProgramCard";
import { DailyInspirationCard } from "./DailyInspirationCard";
import { WordOfDayCard } from "./WordOfDayCard";
import { AllahNameOfDayCard } from "./AllahNameOfDayCard";
import { useLocationContext } from "../../context/location-context";
import { prayerApi } from "../../api";
import type { PrayerTimesResponse } from "@oumoul/api";
import * as SecureStore from "expo-secure-store";
import { getWordOfDay } from '../../utils/word-of-day';
import { getTodayAllahName } from '../../utils/allah-name-of-day';
import {
  cancelReminder,
  scheduleAdhanReminder,
  scheduleDhikrMorningReminder,
  scheduleDhikrEveningReminder,
  scheduleIftarReminder,
  scheduleSuhoorReminder,
  scheduleJumuahReminder,
} from '../../push-notifications';

const { width } = Dimensions.get("window");

type LocalReminderType =
  | "AdhanFajr" | "AdhanDhuhr" | "AdhanAsr" | "AdhanMaghrib" | "AdhanIsha"
  | "SuhoorLocal" | "IftarLocal" | "DhikrMorning" | "DhikrEvening" | "JumuahReminder";

const ALL_REMINDER_TYPES: LocalReminderType[] = [
  "AdhanFajr", "AdhanDhuhr", "AdhanAsr", "AdhanMaghrib", "AdhanIsha",
  "SuhoorLocal", "IftarLocal", "DhikrMorning", "DhikrEvening", "JumuahReminder",
];

function createRecord<T>(val: T): Record<LocalReminderType, T> {
  return Object.fromEntries(ALL_REMINDER_TYPES.map(k => [k, val])) as Record<LocalReminderType, T>;
}

const LOCAL_REMINDERS_KEY = "oumoul.localReminders";

interface Props {
  user: any;
  locale: Locale;
  onSearch?: () => void;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}


export function ModernDashboard({ user, locale, onSearch, onRefresh, refreshing = false }: Props) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { location: detectedLoc, loading: locLoading } = useLocationContext();
  const [prayerResult, setPrayerResult] = useState<PrayerTimesResponse | null>(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [quranLastSurah, setQuranLastSurah] = useState<string | null>(null);
  const [localEnabled, setLocalEnabled] = useState<Record<LocalReminderType, boolean>>(createRecord(false));
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigation = useNavigation<any>();
  const { palette } = useTheme();
  const { forceUpdate } = useForceUpdate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const LAST_READ_KEY = 'oumoul_quran_last_read';
    SecureStore.getItemAsync(LAST_READ_KEY).then((lrRaw) => {
      if (lrRaw) {
        try {
          const lr = JSON.parse(lrRaw);
          if (lr?.surahId) setQuranLastSurah(`S.${lr.surahId}`);
        } catch {}
      }
    }).catch(() => {});
  }, []);


  // Load prayer times — use GPS if available, fallback to default coords
  useEffect(() => {
    if (prayerLoading) return;
    const lat = detectedLoc.latitude ?? 4.0511;
    const lng = detectedLoc.longitude ?? 9.7679;

    const fetchPrayerTimes = async () => {
      try {
        setPrayerLoading(true);
        const result = await prayerApi.getPrayerTimes({ latitude: lat, longitude: lng });
        console.log('[Prayer] result times:', JSON.stringify(result?.times));
        setPrayerResult(result);
      } catch (e) {
        console.log('[Prayer] fetch error:', e);
      } finally {
        setPrayerLoading(false);
      }
    };

    fetchPrayerTimes();
  }, [detectedLoc.latitude, detectedLoc.longitude]);

  // ── Local reminders: load persisted state ──────────────────────────────────
  useEffect(() => {
    SecureStore.getItemAsync(LOCAL_REMINDERS_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<LocalReminderType, boolean>;
          setLocalEnabled((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
    }).catch(() => {}).finally(() => setLocalLoading(false));
  }, []);

  const persistLocal = useCallback(async (state: Record<LocalReminderType, boolean>) => {
    try { await SecureStore.setItemAsync(LOCAL_REMINDERS_KEY, JSON.stringify(state)); } catch {}
  }, []);

  // adhanTimes derived from prayerResult — reuses parsePrayerTime defined below
  const adhanTimes = useMemo(() => {
    if (!prayerResult?.times) return null;
    const t = prayerResult.times;
    // Find keys case-insensitively
    const find = (name: string) => {
      const key = Object.keys(t).find(k => k.toLowerCase() === name.toLowerCase());
      return key ? t[key] : undefined;
    };
    const parse = (v?: string) => {
      if (!v) return null;
      try {
        if (v.includes('T')) { const d = new Date(v); return { hour: d.getHours(), minute: d.getMinutes() }; }
        const [h, m] = v.split(':').map(Number);
        return Number.isNaN(h) || Number.isNaN(m) ? null : { hour: h, minute: m };
      } catch { return null; }
    };
    const result = {
      Fajr: parse(t['fajr'] ?? t['Fajr']),
      Dhuhr: parse(t['dhuhr'] ?? t['Dhuhr']),
      Asr: parse(t['asr'] ?? t['Asr']),
      Maghrib: parse(t['maghrib'] ?? t['Maghrib']),
      Isha: parse(t['isha'] ?? t['Isha']),
    };
    console.log('[adhanTimes] keys=', Object.keys(t), 'parsed=', JSON.stringify(result));
    return result;
  }, [prayerResult]);

  const subtractMinutes = useCallback((t: { hour: number; minute: number }, delta: number) => {
    const total = ((t.hour * 60 + t.minute - delta) % (24 * 60) + 24 * 60) % (24 * 60);
    return { hour: Math.floor(total / 60), minute: total % 60 };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const toggleLocalReminder = useCallback(async (type: LocalReminderType) => {
    const isOn = localEnabled[type];
    console.log('[Adhan] toggle', type, 'isOn=', isOn, 'adhanTimes=', JSON.stringify(adhanTimes));
    const id = type === "SuhoorLocal" ? "suhoor"
      : type === "IftarLocal" ? "iftar"
      : type === "DhikrMorning" ? "dhikr-morning"
      : type === "DhikrEvening" ? "dhikr-evening"
      : type === "JumuahReminder" ? "jumuah-reminder"
      : `adhan-${type.replace("Adhan", "")}`;

    if (isOn) {
      await cancelReminder(id);
      setLocalEnabled((prev) => { const next = { ...prev, [type]: false }; void persistLocal(next); return next; });
      showToast("Rappel désactivé");
      return;
    }

    try {
      if (type.startsWith("Adhan")) {
        const key = type.replace("Adhan", "") as keyof NonNullable<typeof adhanTimes>;
        const slot = adhanTimes?.[key];
        if (!slot) { showToast("⏳ Horaires de prière non encore chargés."); return; }
        await scheduleAdhanReminder(key, slot.hour, slot.minute);
      } else if (type === "SuhoorLocal") {
        const fajr = adhanTimes?.Fajr;
        if (!fajr) { showToast("⏳ Horaires non chargés."); return; }
        const s = subtractMinutes(fajr, 30);
        await scheduleSuhoorReminder(s.hour, s.minute);
      } else if (type === "IftarLocal") {
        const maghrib = adhanTimes?.Maghrib;
        if (!maghrib) { showToast("⏳ Horaires non chargés."); return; }
        await scheduleIftarReminder(maghrib.hour, maghrib.minute);
      } else if (type === "DhikrMorning") {
        await scheduleDhikrMorningReminder();
      } else if (type === "DhikrEvening") {
        await scheduleDhikrEveningReminder();
      } else if (type === "JumuahReminder") {
        await scheduleJumuahReminder();
      }
      setLocalEnabled((prev) => { const next = { ...prev, [type]: true }; void persistLocal(next); return next; });
      showToast("✅ Rappel activé");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Impossible d'activer le rappel.");
    }
  }, [localEnabled, adhanTimes, persistLocal, subtractMinutes, showToast]);

  // Auto-reschedule when prayer times update
  useEffect(() => {
    if (!adhanTimes) return;
    const tasks: Array<Promise<unknown>> = [];
    if (localEnabled.AdhanFajr && adhanTimes.Fajr) tasks.push(scheduleAdhanReminder("Fajr", adhanTimes.Fajr.hour, adhanTimes.Fajr.minute));
    if (localEnabled.AdhanDhuhr && adhanTimes.Dhuhr) tasks.push(scheduleAdhanReminder("Dhuhr", adhanTimes.Dhuhr.hour, adhanTimes.Dhuhr.minute));
    if (localEnabled.AdhanAsr && adhanTimes.Asr) tasks.push(scheduleAdhanReminder("Asr", adhanTimes.Asr.hour, adhanTimes.Asr.minute));
    if (localEnabled.AdhanMaghrib && adhanTimes.Maghrib) tasks.push(scheduleAdhanReminder("Maghrib", adhanTimes.Maghrib.hour, adhanTimes.Maghrib.minute));
    if (localEnabled.AdhanIsha && adhanTimes.Isha) tasks.push(scheduleAdhanReminder("Isha", adhanTimes.Isha.hour, adhanTimes.Isha.minute));
    Promise.all(tasks).catch(() => {});
  }, [adhanTimes]);

  // ── Parse prayer time from either "HH:MM" or ISO datetime "2026-02-19T12:36:00"
  const parsePrayerTime = (raw: string | undefined): { hour: number; minute: number } | null => {
    if (!raw) return null;
    try {
      if (raw.includes('T')) {
        const d = new Date(raw);
        return { hour: d.getHours(), minute: d.getMinutes() };
      }
      const parts = raw.split(':');
      if (parts.length < 2) return null;
      return { hour: Number(parts[0]), minute: Number(parts[1]) };
    } catch {
      return null;
    }
  };

  // Calculate next prayer
  const getNextPrayer = () => {
    if (!prayerResult?.times) return null;
    
    const now = currentTime;
    const prayers = [
      { name: 'Fajr', time: prayerResult.times['fajr'] },
      { name: 'Dhuhr', time: prayerResult.times['dhuhr'] },
      { name: 'Asr', time: prayerResult.times['asr'] },
      { name: 'Maghrib', time: prayerResult.times['maghrib'] },
      { name: 'Isha', time: prayerResult.times['isha'] },
    ];
    
    const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    const formatCountdown = (diffSec: number) => {
      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      const s = diffSec % 60;
      if (h > 0) return `dans ${h}h ${String(m).padStart(2,'0')}min ${String(s).padStart(2,'0')}s`;
      if (m > 0) return `dans ${m}min ${String(s).padStart(2,'0')}s`;
      return `dans ${s}s`;
    };

    // Find next prayer
    for (const prayer of prayers) {
      const parsed = parsePrayerTime(prayer.time);
      if (!parsed) continue;
      const prayerSeconds = parsed.hour * 3600 + parsed.minute * 60;
      if (prayerSeconds > nowSeconds) {
        const diffSec = prayerSeconds - nowSeconds;
        const displayTime = `${String(parsed.hour).padStart(2,'0')}:${String(parsed.minute).padStart(2,'0')}`;
        return { name: prayer.name, time: displayTime, countdown: formatCountdown(diffSec) };
      }
    }

    // All prayers passed — countdown to tomorrow's Fajr
    const fajrParsed = parsePrayerTime(prayerResult.times['fajr']);
    if (!fajrParsed) return null;
    const fajrSeconds = fajrParsed.hour * 3600 + fajrParsed.minute * 60;
    const diffSec = 24 * 3600 + fajrSeconds - nowSeconds;
    const displayTime = `${String(fajrParsed.hour).padStart(2,'0')}:${String(fajrParsed.minute).padStart(2,'0')}`;
    return { name: 'Fajr', time: displayTime, countdown: formatCountdown(diffSec) };
  };
  
  const nextPrayer = getNextPrayer();

  // Sync widget data when prayer times are updated
  useEffect(() => {
    if (prayerResult && detectedLoc.city) {
      syncWidgetPrayerTimes({
        times: prayerResult.times,
        nextPrayer: nextPrayer?.name || 'Fajr',
        nextPrayerTime: nextPrayer?.time || '06:00',
        hijriDate: new Date().toLocaleDateString('fr-FR'),
        location: detectedLoc.city,
      }).catch(() => {});
    }
  }, [prayerResult, detectedLoc.city]);

  // Force update when theme changes
  useEffect(() => {
    forceUpdate();
  }, [palette]);

  // Check Ramadan status
  const ramadanInfo = getRamadanInfo();
  const isRamadan = ramadanInfo.status === 'during';

  // Navigation handlers
  const handleNavigateToPrayers = () => {
    navigation.navigate('Plus', { screen: 'PrayerTracking' });
  };

  const handleNavigateToDhikr = () => {
    navigation.navigate('Dhikr');
  };

  const handleNavigateToQuran = () => {
    navigation.navigate('Coran');
  };

  const handleNavigateToCycle = () => {
    navigation.navigate('ImaneCycle');
  };

  const handleNavigateToQuranAudio = () => {
    navigation.navigate('Plus', { screen: 'QuranAudio' });
  };

  const handleNavigateToMosque = () => {
    navigation.navigate('Plus', { screen: 'MosqueFinder' });
  };

  const handleNavigateToZakat = () => {
    navigation.navigate('Plus', { screen: 'ZakatCalculator' });
  };

  const handleNavigateToQibla = () => {
    navigation.navigate('Plus', { screen: 'Qibla' });
  };

  const handleNavigateToCalendar = () => {
    navigation.navigate('Plus', { screen: 'HijriCalendar' });
  };

  const locationLabel = detectedLoc.city && detectedLoc.country
    ? `${detectedLoc.city}, ${detectedLoc.country}`
    : detectedLoc.city ?? "Détection...";

  // Build all 5 prayer rows (backend returns lowercase keys: fajr, dhuhr, asr, maghrib, isha)
  const allPrayers = prayerResult?.times ? [
    { name: 'Fajr',    key: 'fajr',    icon: 'sunny-outline'  as const, raw: prayerResult.times['fajr'] },
    { name: 'Dhuhr',   key: 'dhuhr',   icon: 'partly-sunny'   as const, raw: prayerResult.times['dhuhr'] },
    { name: 'Asr',     key: 'asr',     icon: 'sunny'          as const, raw: prayerResult.times['asr'] },
    { name: 'Maghrib', key: 'maghrib', icon: 'moon-outline'   as const, raw: prayerResult.times['maghrib'] },
    { name: 'Isha',    key: 'isha',    icon: 'moon'           as const, raw: prayerResult.times['isha'] },
  ].map(p => ({ ...p, display: (() => { const parsed = parsePrayerTime(p.raw); return parsed ? `${String(parsed.hour).padStart(2,'0')}:${String(parsed.minute).padStart(2,'0')}` : '--:--'; })() })) : [];

  // Eid al-Fitr countdown (Hijri 10/1)
  const eidInfo = (() => {
    try {
      const h = getCurrentHijriDate();
      // Shawwal = month 10. Days until Eid al-Fitr
      let daysLeft: number | null = null;
      if (h.month === 9) daysLeft = 30 - h.day + 1; // in Ramadan
      else if (h.month === 10 && h.day === 1) daysLeft = 0; // Eid today
      return daysLeft !== null && daysLeft <= 30 ? daysLeft : null;
    } catch { return null; }
  })();

  return (
    <ScrollView
      style={[s.container, { backgroundColor: palette.bg }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        ) : undefined
      }
    >
      {/* Header */}
      <Header
        user={user}
        todayLabel={currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        hijriLabel={(() => { const h = getCurrentHijriDate(); return `${h.day} ${h.monthName} ${h.year}`; })()}
        locationLabel={locationLabel}
        isLocationLoading={locLoading}
        onSearch={onSearch}
      />

      {/* ═══ BLOC 1 : PRIÈRES DU JOUR ═══ */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: palette.text }]}>🕌 Prières du jour</Text>
          <TouchableOpacity onPress={handleNavigateToPrayers} style={[s.seeAllBtn, { backgroundColor: palette.accentLight }]}>
            <Text style={[s.seeAllText, { color: palette.primaryDark }]}>Suivi →</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 12, color: palette.muted, marginBottom: 8 }}>
          {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>

        {/* Prochaine prière highlight */}
        <NextPrayerCard
          isLoading={prayerLoading}
          nextPrayerInfo={nextPrayer ? { name: nextPrayer.name, time: nextPrayer.time } : null}
          countdown={nextPrayer?.countdown || null}
        />

        {/* Toutes les 5 prières */}
        {allPrayers.length > 0 && (
          <View style={[s.prayerGrid, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {allPrayers.map((p) => {
              const isNext = nextPrayer?.name === p.name;
              const isPassed = (() => {
                const parsed = parsePrayerTime(p.raw);
                if (!parsed) return false;
                const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
                return parsed.hour * 60 + parsed.minute < nowMin;
              })();
              return (
                <View key={p.key} style={[s.prayerRow, { borderBottomColor: palette.border }, isNext && { backgroundColor: palette.primary }]}>
                  <Ionicons name={p.icon} size={16} color={isNext ? '#fff' : isPassed ? palette.primaryDark : palette.textSoft} />
                  <Text style={[s.prayerName, { color: isNext ? '#fff' : isPassed ? palette.primaryDark : palette.text }, isPassed && !isNext && { opacity: 0.6 }]}>{p.name}</Text>
                  <Text style={[s.prayerTime, { color: isNext ? '#fff' : isPassed ? palette.primaryDark : palette.text }, isPassed && !isNext && { opacity: 0.6 }]}>{p.display}</Text>
                  {isPassed && !isNext && <Ionicons name="checkmark-circle" size={14} color={palette.primaryDark} />}
                  {isNext && <Ionicons name="time" size={14} color="rgba(255,255,255,0.8)" />}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ═══ BLOC 2 : COUNTDOWN RAMADAN / EID ═══ */}
      {isRamadan ? (
        <View style={s.section}>
          <TouchableOpacity
            style={[s.countdownBanner, { backgroundColor: '#1A237E', marginHorizontal: 0, marginBottom: 12 }]}
            onPress={() => navigation.navigate('Ramadan')}
            activeOpacity={0.85}
          >
            <Ionicons name="moon" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={s.countdownTitle}>🌙 Ramadan {new Date().getFullYear()}</Text>
              <Text style={s.countdownSub}>Jour {ramadanInfo.dayNumber}/{ramadanInfo.totalDays} · Qu'Allah accepte ton jeûne</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <RamadanPriorityCard locale={locale} />
        </View>
      ) : ramadanInfo.status === 'before' && ramadanInfo.daysUntil !== undefined && ramadanInfo.daysUntil <= 90 ? (
        <TouchableOpacity style={[s.countdownBanner, { backgroundColor: '#1565C0' }]} onPress={() => navigation.navigate('Ramadan')} activeOpacity={0.85}>
          <Ionicons name="moon" size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={s.countdownTitle}>Ramadan approche 🌙</Text>
            <Text style={s.countdownSub}>Dans {ramadanInfo.daysUntil} jour{ramadanInfo.daysUntil > 1 ? 's' : ''} · Prépare-toi dès maintenant</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      ) : eidInfo !== null ? (
        <View style={[s.countdownBanner, { backgroundColor: '#E65100' }]}>
          <Ionicons name="gift" size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={s.countdownTitle}>{eidInfo === 0 ? 'Aïd Moubarak ! 🎉' : `Aïd al-Fitr dans ${eidInfo} jour${eidInfo > 1 ? 's' : ''}`}</Text>
            <Text style={s.countdownSub}>Qu'Allah accepte notre jeûne et nos bonnes actions</Text>
          </View>
        </View>
      ) : null}

      {/* ═══ BLOC 3 : PROGRAMME IMANE ═══ */}
      <View style={s.section}>
        <TouchableOpacity onPress={() => navigation.navigate('Plus', { screen: 'ImaneProgram' })} activeOpacity={0.9}>
          <ImanProgramCard locale={locale} />
        </TouchableOpacity>
      </View>

      {/* ═══ BLOC 4 : MOT DU CORAN ═══ */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: palette.text }]}>🔤 Mot du Coran du jour</Text>
        <WordOfDayCard onPress={() => navigation.navigate('Plus', { screen: 'QuranWords', params: { initialWordId: getWordOfDay().id } })} />
      </View>

      {/* ═══ BLOC 4b : NOM D'ALLAH DU JOUR ═══ */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: palette.text }]}>✨ Nom d'Allah du jour</Text>
        <AllahNameOfDayCard onPress={() => navigation.navigate('Plus', { screen: 'AllahNames', params: { initialNameId: getTodayAllahName().id } })} />
      </View>

      {/* ═══ BLOC 5 : MÉMORISATION & APPRENTISSAGE ═══ */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: palette.text }]}>📖 Mémorisation & Apprentissage</Text>
        <View style={s.memGrid}>
          <TouchableOpacity style={[s.memCard, { backgroundColor: palette.primary }]} onPress={handleNavigateToQuran} activeOpacity={0.85}>
            <Ionicons name="book" size={24} color="#fff" />
            <Text style={s.memCardTitle}>Lire le Coran</Text>
            <Text style={s.memCardSub}>{quranLastSurah ? `Reprendre ${quranLastSurah}` : 'Commencer maintenant'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.memCard, { backgroundColor: palette.accent }]} onPress={() => navigation.navigate('Plus', { screen: 'QuranWords' })} activeOpacity={0.85}>
            <Ionicons name="language" size={24} color="#fff" />
            <Text style={s.memCardTitle}>Vocabulaire</Text>
            <Text style={s.memCardSub}>Apprendre les mots du Coran</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.memCard, { backgroundColor: palette.secondary }]} onPress={handleNavigateToQuranAudio} activeOpacity={0.85}>
            <Ionicons name="musical-note" size={24} color="#fff" />
            <Text style={s.memCardTitle}>Écouter</Text>
            <Text style={s.memCardSub}>Coran audio par récitateur</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.memCard, { backgroundColor: '#7B1FA2' }]} onPress={() => navigation.navigate('Plus', { screen: 'AllahNames' })} activeOpacity={0.85}>
            <Ionicons name="heart" size={24} color="#fff" />
            <Text style={s.memCardTitle}>99 Noms</Text>
            <Text style={s.memCardSub}>Mémoriser les noms d'Allah</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ BLOC 5 : ACCÈS RAPIDE ═══ */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: palette.text }]}>⚡ Accès rapide</Text>
        <View style={s.quickRow}>
          {[
            { label: 'Dhikr',     icon: 'radio'      as const, onPress: handleNavigateToDhikr,    color: palette.primary },
            { label: 'Mosquées',  icon: 'business'   as const, onPress: handleNavigateToMosque,   color: palette.secondary },
            { label: 'Qibla',     icon: 'compass'    as const, onPress: handleNavigateToQibla,    color: palette.accent },
            { label: 'Zakat',     icon: 'calculator' as const, onPress: handleNavigateToZakat,    color: '#388E3C' },
            { label: 'Calendrier',icon: 'calendar'   as const, onPress: handleNavigateToCalendar, color: '#7B1FA2' },
            { label: 'Cycle',     icon: 'heart'      as const, onPress: handleNavigateToCycle,    color: '#C62828' },
          ].map(item => (
            <TouchableOpacity key={item.label} style={s.quickItem} onPress={item.onPress} activeOpacity={0.8}>
              <View style={[s.quickIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={[s.quickLabel, { color: palette.textSoft }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ═══ BLOC 6 : INSPIRATION DU JOUR ═══ */}
      <View style={s.section}>
        <DailyInspirationCard locale={locale} />
      </View>

      {/* ═══ BLOC 7 : NOTIFICATIONS LOCALES (ADHAN) ═══ */}
      <View style={s.section}>
        <LocalRemindersSection
          isLoading={localLoading}
          error={localError}
          enabled={localEnabled}
          onToggle={(type) => void toggleLocalReminder(type)}
          locale={locale}
        />
      </View>

      {/* Toast */}
      {toast ? (
        <View style={{ backgroundColor: '#1A2332', borderRadius: 12, marginHorizontal: 20, marginBottom: 16, padding: 14 }}>
          <Text style={{ color: '#fff', fontSize: 13, textAlign: 'center' }}>{toast}</Text>
        </View>
      ) : null}

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  seeAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Prayer grid
  prayerGrid: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  prayerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  prayerTime: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Countdown banners
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  countdownTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  countdownSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  // Memorization grid
  memGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  memCard: {
    width: (width - 50) / 2,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  memCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  memCardSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 15,
  },
  // Quick access row
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickItem: {
    alignItems: 'center',
    width: (width - 64) / 6,
    minWidth: 52,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
});
