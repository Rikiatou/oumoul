import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FastingLogStatus } from '@oumoul/api';
import type {
  AuthUser,
  CycleStatus,
  RamadanDaySummary,
  RamadanSummaryResponse,
} from '@oumoul/api';
import { cycleApi, ramadanApi, prayerApi } from '../api';
import { palette } from '../theme';
import { getRamadanInfo } from '../utils/hijri-calendar';
import { useLocationContext } from '../context/location-context';
import * as SecureStore from 'expo-secure-store';
import { offlineCache, CACHE_TTL } from '../utils/offline-cache';
import { HelpTip } from '../components/HelpTip';
import {
  scheduleRamadanFastingReminder,
  scheduleMakeupDayReminder,
  cancelMakeupReminders,
  cancelReminder,
} from '../push-notifications';

const FASTING_STATUS_LABELS: Record<FastingLogStatus, string> = {
  FASTED: 'Jeûné',
  EXEMPTION: 'Exemptée',
  MISSED: 'Raté',
  MADE_UP: 'Rattrapé',
};

const FASTING_STATUS_ORDER: FastingLogStatus[] = [
  FastingLogStatus.FASTED,
  FastingLogStatus.EXEMPTION,
  FastingLogStatus.MISSED,
  FastingLogStatus.MADE_UP,
];

const FASTING_ICONS: Record<FastingLogStatus, string> = {
  FASTED: 'checkmark-circle',
  EXEMPTION: 'heart-circle',
  MISSED: 'close-circle',
  MADE_UP: 'refresh-circle',
};

const FASTING_ICON_COLORS: Record<FastingLogStatus, string> = {
  FASTED: '#2E7D32',
  EXEMPTION: '#7B1FA2',
  MISSED: '#C62828',
  MADE_UP: '#1565C0',
};

const FASTING_BG_COLORS: Record<FastingLogStatus, string> = {
  FASTED: '#E8F5E9',
  EXEMPTION: '#F3E5F5',
  MISSED: '#FFEBEE',
  MADE_UP: '#E3F2FD',
};

const CYCLE_LABELS: Record<CycleStatus, string> = {
  PURE: 'Pure',
  MENSES: 'Règles',
  SPOTTING: 'Spotting',
  POSTPARTUM: 'Post-partum',
};

const CYCLE_BADGE_COLORS: Record<CycleStatus, string> = {
  PURE: 'rgba(0,0,0,0.05)',
  MENSES: '#FFCDD2',
  SPOTTING: '#FFE0B2',
  POSTPARTUM: '#E1BEE7',
};

const CYCLE_ICON_COLORS: Record<CycleStatus, string> = {
  PURE: '#9E9E9E',
  MENSES: '#C62828',
  SPOTTING: '#E65100',
  POSTPARTUM: '#7B1FA2',
};

const CYCLE_STATUSES: CycleStatus[] = ['PURE', 'MENSES', 'SPOTTING', 'POSTPARTUM'];

export function ImaneRamadanScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const navigation = useNavigation<any>();
  const { location: detectedLoc } = useLocationContext();
  const [maghribTime, setMaghribTime] = useState<{ hour: number; minute: number } | null>(null);
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [data, setData] = useState<RamadanSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingFasting, setSavingFasting] = useState(false);
  const [savingCycle, setSavingCycle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [fastStatusDraft, setFastStatusDraft] = useState<FastingLogStatus | null>(null);
  const [cycleStatusDraft, setCycleStatusDraft] = useState<CycleStatus | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  // ── Makeup planner & reminders ──
  const [makeupPlan, setMakeupPlan] = useState<string[]>([]);
  const [makeupPlanLoaded, setMakeupPlanLoaded] = useState(false);
  const [fastingReminderOn, setFastingReminderOn] = useState(false);
  const [reminderLoaded, setReminderLoaded] = useState(false);
  const [showMakeupPlanner, setShowMakeupPlanner] = useState(false);
  const [makeupPreference, setMakeupPreference] = useState<'mon_thu' | 'mon_only' | 'thu_only' | 'custom'>('mon_thu');
  const [showYearStats, setShowYearStats] = useState(false);
  const [yearStats, setYearStats] = useState<Array<{ year: number; fasted: number; missed: number; exemption: number; total: number }>>([]);
  const [yearStatsLoading, setYearStatsLoading] = useState(false);

  const loadYearStats = useCallback(async () => {
    setYearStatsLoading(true);
    const currentYear = new Date().getFullYear();
    const results: typeof yearStats = [];
    for (let y = currentYear; y >= currentYear - 4; y--) {
      try {
        const resp = await offlineCache.getWithFallback<RamadanSummaryResponse>(
          `ramadan_summary_${y}`,
          () => ramadanApi.summary(y),
          CACHE_TTL.LONG,
        );
        const fasted = resp.days.filter((d) => d.fastStatus === FastingLogStatus.FASTED).length;
        const missed = resp.days.filter((d) => d.fastStatus === FastingLogStatus.MISSED).length;
        const exemption = resp.days.filter((d) => d.fastStatus === FastingLogStatus.EXEMPTION).length;
        results.push({ year: y, fasted, missed, exemption, total: resp.days.length });
      } catch { results.push({ year: y, fasted: 0, missed: 0, exemption: 0, total: 0 }); }
    }
    setYearStats(results);
    setYearStatsLoading(false);
  }, []);

  const MAKEUP_PLAN_KEY = `oumoul_makeup_plan_${year}`;
  const FASTING_REMINDER_KEY = 'oumoul_ramadan_fasting_reminder';

  // Load makeup plan & reminder preference
  useEffect(() => {
    SecureStore.getItemAsync(MAKEUP_PLAN_KEY).then((raw: string | null) => {
      if (raw) { try { setMakeupPlan(JSON.parse(raw) as string[]); } catch {} }
      setMakeupPlanLoaded(true);
    }).catch(() => setMakeupPlanLoaded(true));
    SecureStore.getItemAsync(FASTING_REMINDER_KEY).then((raw: string | null) => {
      setFastingReminderOn(raw === 'true');
      setReminderLoaded(true);
    }).catch(() => setReminderLoaded(true));
  }, [MAKEUP_PLAN_KEY]);

  // Persist makeup plan
  useEffect(() => {
    if (!makeupPlanLoaded) return;
    SecureStore.setItemAsync(MAKEUP_PLAN_KEY, JSON.stringify(makeupPlan)).catch(() => {});
  }, [makeupPlan, makeupPlanLoaded, MAKEUP_PLAN_KEY]);

  const days = data?.days ?? [];

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<FastingLogStatus, number>> = {};
    for (const day of days) {
      if (!day.fastStatus) continue;
      counts[day.fastStatus] = (counts[day.fastStatus] ?? 0) + 1;
    }
    return counts;
  }, [days]);

  const outstandingMakeupDays = useMemo(() => {
    const missed = statusCounts.MISSED ?? 0;
    const madeUp = statusCounts.MADE_UP ?? 0;
    return Math.max(0, missed - madeUp);
  }, [statusCounts]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const ramadanDayInfo = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return getRamadanInfo(currentYear);
  }, []);

  // ── Fetch real Maghrib time from GPS ──
  useEffect(() => {
    if (!detectedLoc.latitude || !detectedLoc.longitude) return;
    prayerApi
      .getPrayerTimes({ latitude: detectedLoc.latitude, longitude: detectedLoc.longitude })
      .then((res) => {
        // res.times.maghrib is an ISO-like string e.g. "2025-03-15T18:47:00"
        const raw: string = (res as any).times?.maghrib ?? '';
        if (raw) {
          const timePart = raw.includes('T') ? raw.split('T')[1] : raw;
          const [hStr, mStr] = timePart.split(':');
          const hour = parseInt(hStr, 10);
          const minute = parseInt(mStr, 10);
          if (!isNaN(hour) && !isNaN(minute)) {
            setMaghribTime({ hour, minute });
          }
        }
      })
      .catch(() => {
        // Fallback already handled in tick() below
      });
  }, [detectedLoc.latitude, detectedLoc.longitude]);

  // ── Live iftar countdown using real Maghrib time ──
  const [iftarCountdown, setIftarCountdown] = useState<string | null>(null);
  const iftarTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (ramadanDayInfo.status !== 'during') return;
    function tick() {
      const now = new Date();
      const target = new Date();
      // Use real GPS-based Maghrib; fallback to 18:30 if not yet loaded
      const mHour = maghribTime?.hour ?? 18;
      const mMin = maghribTime?.minute ?? 30;
      target.setHours(mHour, mMin, 0, 0);
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) { setIftarCountdown('🌙 Iftar !'); return; }
      const h = Math.floor(diff / 3600000);
      const mn = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setIftarCountdown(`${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }
    tick();
    iftarTimerRef.current = setInterval(tick, 1000);
    return () => { if (iftarTimerRef.current) clearInterval(iftarTimerRef.current); };
  }, [ramadanDayInfo.status, maghribTime]);

  const todayDay = useMemo(() => days.find((d) => d.date === todayIso) ?? null, [days, todayIso]);

  const progressPercent = useMemo(() => {
    if (days.length === 0) return 0;
    const logged = days.filter((d) => d.fastStatus).length;
    return Math.round((logged / days.length) * 100);
  }, [days]);

  const fastedPercent = useMemo(() => {
    if (days.length === 0) return 0;
    return Math.round(((statusCounts.FASTED ?? 0) / days.length) * 100);
  }, [days.length, statusCounts]);

  const guidanceMessage = useMemo(() => {
    if (days.length === 0) return null;
    const unlogged = days.filter((d) => !d.fastStatus && d.date <= todayIso).length;
    if (unlogged > 3) return `${unlogged} jours non renseignés. Mets à jour ton suivi pour rester organisée.`;
    if (outstandingMakeupDays > 0) return `${outstandingMakeupDays} jour${outstandingMakeupDays > 1 ? 's' : ''} à rattraper. Tu peux jeûner les lundis et jeudis.`;
    const fasted = statusCounts.FASTED ?? 0;
    if (fasted > 0 && fasted === days.filter((d) => d.date <= todayIso).length) return 'Masha Allah ! Tu as jeûné tous les jours jusqu\'à présent.';
    return null;
  }, [days, todayIso, outstandingMakeupDays, statusCounts]);

  const selectedDay = useMemo(() => {
    if (!selectedDate) return null;
    return days.find((d) => d.date === selectedDate) ?? null;
  }, [days, selectedDate]);

  const formatDate = useCallback(
    (value: string) => {
      const d = new Date(`${value}T00:00:00.000Z`);
      try {
        return d.toLocaleDateString(user.locale ?? 'fr', { weekday: 'long', day: '2-digit', month: 'long' });
      } catch {
        return value;
      }
    },
    [user.locale],
  );

  const formatShortDate = useCallback(
    (value: string) => {
      const d = new Date(`${value}T00:00:00.000Z`);
      try {
        return d.toLocaleDateString(user.locale ?? 'fr', { weekday: 'short', day: 'numeric' });
      } catch {
        return value;
      }
    },
    [user.locale],
  );

  const loadYear = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cacheKey = `ramadan_summary_${year}`;
      const response = await offlineCache.getWithFallback<RamadanSummaryResponse>(
        cacheKey,
        () => ramadanApi.summary(year),
        CACHE_TTL.MEDIUM,
      );
      setData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de charger le calendrier de Ramadan.';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void loadYear();
  }, [loadYear]);

  const handleSelectDay = useCallback(
    (day: RamadanDaySummary) => {
      setSelectedDate(day.date);
      setFastStatusDraft(day.fastStatus ?? null);
      setCycleStatusDraft(day.cycleStatus ?? null);
      setNotesDraft(day.notes ?? '');
      setInfo(null);
    },
    [],
  );

  const handleQuickFast = useCallback(async (date: string, status: FastingLogStatus) => {
    setSavingFasting(true);
    setError(null);
    try {
      const updated = await ramadanApi.upsertDay({ date, fastStatus: status, notes: null });
      await offlineCache.remove(`ramadan_summary_${year}`);
      setData((prev) => {
        if (!prev) return prev;
        const nextDays = prev.days.map((day) =>
          day.date === updated.date ? { ...day, fastStatus: updated.fastStatus, notes: updated.notes } : day,
        );
        return { ...prev, days: nextDays };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible d\'enregistrer.';
      setError(message);
    } finally {
      setSavingFasting(false);
    }
  }, [year]);

  const handleSaveFasting = useCallback(async () => {
    if (!selectedDate || !fastStatusDraft) return;
    setSavingFasting(true);
    setError(null);
    try {
      const updated = await ramadanApi.upsertDay({
        date: selectedDate,
        fastStatus: fastStatusDraft,
        notes: notesDraft.trim() ? notesDraft.trim() : null,
      });
      await offlineCache.remove(`ramadan_summary_${year}`);
      setData((prev) => {
        if (!prev) return prev;
        const nextDays = prev.days.map((day) =>
          day.date === updated.date
            ? { ...day, fastStatus: updated.fastStatus, notes: updated.notes }
            : day,
        );
        return { ...prev, days: nextDays };
      });
      setInfo('Enregistré avec succès');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible d\'enregistrer ce jour de Ramadan.';
      setError(message);
    } finally {
      setSavingFasting(false);
    }
  }, [fastStatusDraft, notesDraft, selectedDate, year]);

  const handleSaveCycle = useCallback(async () => {
    if (!selectedDate || !cycleStatusDraft) return;
    setSavingCycle(true);
    setError(null);
    setInfo(null);
    try {
      const updated = await cycleApi.upsertDay({ date: selectedDate, status: cycleStatusDraft });

      let shouldAutoExempt = false;
      setData((prev) => {
        if (!prev) return prev;
        const nextDays = prev.days.map((day) => {
          if (day.date !== updated.date) return day;
          shouldAutoExempt =
            (updated.status === 'MENSES' || updated.status === 'POSTPARTUM') &&
            (day.fastStatus === null || day.fastStatus === undefined);
          return { ...day, cycleStatus: updated.status };
        });
        return { ...prev, days: nextDays };
      });

      if (shouldAutoExempt) {
        const fastingUpdated = await ramadanApi.upsertDay({
          date: selectedDate,
          fastStatus: FastingLogStatus.EXEMPTION,
          notes: null,
        });
        await offlineCache.remove(`ramadan_summary_${year}`);
        setData((prev) => {
          if (!prev) return prev;
          const nextDays = prev.days.map((day) =>
            day.date === fastingUpdated.date
              ? { ...day, fastStatus: fastingUpdated.fastStatus, notes: fastingUpdated.notes }
              : day,
          );
          return { ...prev, days: nextDays };
        });
        setInfo('Jeûne marqué "Exemptée" automatiquement (cycle).');
      } else {
        setInfo('Cycle enregistré.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de mettre à jour le cycle.';
      setError(message);
    } finally {
      setSavingCycle(false);
    }
  }, [cycleStatusDraft, selectedDate]);

  // ── Toggle fasting reminder ──
  const toggleFastingReminder = useCallback(async () => {
    const next = !fastingReminderOn;
    setFastingReminderOn(next);
    try {
      if (next) {
        await scheduleRamadanFastingReminder();
      } else {
        await cancelReminder('ramadan-fasting');
      }
      await SecureStore.setItemAsync(FASTING_REMINDER_KEY, String(next));
    } catch {}
  }, [fastingReminderOn, FASTING_REMINDER_KEY]);

  // ── Generate makeup plan ──
  const generateMakeupPlan = useCallback(() => {
    if (outstandingMakeupDays <= 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates: string[] = [];
    const cursor = new Date(today);
    cursor.setDate(cursor.getDate() + 1); // start tomorrow

    while (dates.length < outstandingMakeupDays) {
      const dow = cursor.getDay(); // 0=Sun, 1=Mon, 4=Thu
      let include = false;
      if (makeupPreference === 'mon_thu') include = dow === 1 || dow === 4;
      else if (makeupPreference === 'mon_only') include = dow === 1;
      else if (makeupPreference === 'thu_only') include = dow === 4;
      else include = true; // custom = every day

      if (include) {
        dates.push(cursor.toISOString().slice(0, 10));
      }
      cursor.setDate(cursor.getDate() + 1);
      // safety: don't go beyond 1 year
      if (cursor.getTime() - today.getTime() > 365 * 24 * 60 * 60 * 1000) break;
    }
    setMakeupPlan(dates);
  }, [outstandingMakeupDays, makeupPreference]);

  // ── Schedule makeup reminders ──
  const scheduleMakeupReminders = useCallback(async () => {
    // Cancel old ones first
    await cancelMakeupReminders(makeupPlan);
    // Schedule new ones
    for (let i = 0; i < makeupPlan.length; i++) {
      const d = new Date(`${makeupPlan[i]}T00:00:00`);
      if (d.getTime() > Date.now()) {
        await scheduleMakeupDayReminder(d, i + 1);
      }
    }
    setInfo(`${makeupPlan.length} rappels de rattrapage programmés !`);
  }, [makeupPlan]);

  // ── Toggle a single makeup date ──
  const toggleMakeupDate = useCallback((dateStr: string) => {
    setMakeupPlan((prev) => {
      if (prev.includes(dateStr)) return prev.filter((d) => d !== dateStr);
      return [...prev, dateStr].sort();
    });
  }, []);

  const insets = useSafeAreaInsets();

  return (
    <View style={[r.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={r.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Retour" accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={r_c.accent} />
        </TouchableOpacity>
        <Text style={r.topTitle} accessibilityRole="header">Ramadan</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {outstandingMakeupDays > 0 && (
            <TouchableOpacity
              style={r.catchupBtn}
              onPress={() => navigation.navigate('RamadanCatchup')}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar" size={14} color="#fff" />
              <Text style={r.catchupBtnText}>Rattrapage</Text>
            </TouchableOpacity>
          )}
          <HelpTip screenName="Ramadan" tips={[
            { icon: 'moon', title: 'Suivi du jeûne', description: 'Appuie sur un jour du calendrier pour enregistrer ton statut : jeûné, raté, exemptée ou rattrapé.' },
            { icon: 'today', title: 'Carte du jour', description: 'Pendant le Ramadan, une carte rapide te demande chaque jour si tu as jeûné.' },
            { icon: 'notifications', title: 'Rappel de jeûne', description: 'Active le rappel quotidien pour ne pas oublier de noter ton jeûne.' },
            { icon: 'calendar', title: 'Programme de rattrapage', description: 'Après le Ramadan, génère un programme pour rattraper les jours manqués (lundis et jeudis).' },
            { icon: 'alarm', title: 'Notifications de rattrapage', description: 'Programme des rappels push pour chaque jour de rattrapage prévu.' },
            { icon: 'heart-circle', title: 'Cycle', description: 'Enregistre ton cycle pour marquer automatiquement les jours d\'exemption.' },
          ]} />
          <View style={r.yearNav}>
            <TouchableOpacity onPress={() => setYear((prev) => prev - 1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={18} color={r_c.muted} />
            </TouchableOpacity>
            <Text style={r.yearText}>{year}</Text>
            <TouchableOpacity onPress={() => setYear((prev) => prev + 1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-forward" size={18} color={r_c.muted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadYear().finally(() => setRefreshing(false)); }} tintColor={r_c.accent} />}>
        {/* Ramadan day banner */}
        <View style={r.heroBanner}>
          <Ionicons name="moon" size={24} color="#FFC107" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            {ramadanDayInfo.status === 'before' && (
              <>
                <Text style={r.heroTitle}>Ramadan dans {ramadanDayInfo.daysUntil ?? 0} jour{(ramadanDayInfo.daysUntil ?? 0) > 1 ? 's' : ''}</Text>
                <Text style={r.heroSub}>Prépare-toi pour le mois béni</Text>
              </>
            )}
            {ramadanDayInfo.status === 'during' && (
              <>
                <Text style={r.heroTitle}>Jour {ramadanDayInfo.dayNumber} / {ramadanDayInfo.totalDays}</Text>
                <Text style={r.heroSub}>Ramadan Moubarak</Text>
              </>
            )}
            {ramadanDayInfo.status === 'after' && (
              <>
                <Text style={r.heroTitle}>Ramadan terminé</Text>
                <Text style={r.heroSub}>Eid Moubarak !</Text>
              </>
            )}
          </View>
          {ramadanDayInfo.status === 'during' && (
            <View style={r.heroDayBadge}>
              <Text style={r.heroDayText}>{ramadanDayInfo.dayNumber}</Text>
            </View>
          )}
        </View>

        {/* Live iftar countdown */}
        {ramadanDayInfo.status === 'during' && iftarCountdown && (
          <View style={r.iftarCard}>
            <Ionicons name="time" size={18} color="#FFC107" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={r.iftarLabel}>Temps restant avant l'iftar</Text>
              <Text style={r.iftarTime}>{iftarCountdown}</Text>
            </View>
          </View>
        )}

        {/* Multi-year stats toggle */}
        <TouchableOpacity
          style={r.yearStatsToggle}
          onPress={() => { if (!showYearStats) void loadYearStats(); setShowYearStats((v) => !v); }}
        >
          <Ionicons name="bar-chart" size={16} color={r_c.accent} />
          <Text style={r.yearStatsToggleText}>Comparatif multi-années</Text>
          <Ionicons name={showYearStats ? 'chevron-up' : 'chevron-down'} size={16} color={r_c.muted} />
        </TouchableOpacity>
        {showYearStats && (
          <View style={r.yearStatsBox}>
            {yearStatsLoading ? (
              <ActivityIndicator size="small" color={r_c.accent} style={{ margin: 12 }} />
            ) : yearStats.map((ys) => (
              <View key={ys.year} style={r.yearStatsRow}>
                <Text style={r.yearStatsYear}>{ys.year}</Text>
                <View style={{ flex: 1 }}>
                  <View style={r.miniBar}>
                    {ys.total > 0 && (
                      <View style={[r.miniFill, { width: `${Math.round((ys.fasted / ys.total) * 100)}%` as any, backgroundColor: '#2E7D32' }]} />
                    )}
                  </View>
                </View>
                <Text style={r.yearStatsCounts}>{ys.fasted}✓ {ys.missed}✗ {ys.exemption}♥</Text>
              </View>
            ))}
          </View>
        )}

        {/* Progress bar */}
        {days.length > 0 && (
          <View style={r.progressSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={r.progressLabel}>{progressPercent}% renseigné</Text>
              <Text style={r.progressLabel}>{fastedPercent}% jeûné</Text>
            </View>
            <View style={r.progressTrack}>
              <View style={[r.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>
        )}

        {/* Quick today card */}
        {todayDay && !todayDay.fastStatus && ramadanDayInfo.status === 'during' && (
          <View style={r.todayCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Ionicons name="today" size={20} color={r_c.accent} />
              <Text style={r.todayTitle}>Aujourd'hui — as-tu jeûné ?</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[r.quickBtn, { backgroundColor: '#E8F5E9' }]}
                onPress={() => void handleQuickFast(todayIso, FastingLogStatus.FASTED)}
                disabled={savingFasting}
              >
                <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
                <Text style={[r.quickBtnText, { color: '#2E7D32' }]}>Jeûné</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[r.quickBtn, { backgroundColor: '#FFEBEE' }]}
                onPress={() => void handleQuickFast(todayIso, FastingLogStatus.MISSED)}
                disabled={savingFasting}
              >
                <Ionicons name="close-circle" size={22} color="#C62828" />
                <Text style={[r.quickBtnText, { color: '#C62828' }]}>Raté</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[r.quickBtn, { backgroundColor: '#F3E5F5' }]}
                onPress={() => void handleQuickFast(todayIso, FastingLogStatus.EXEMPTION)}
                disabled={savingFasting}
              >
                <Ionicons name="heart-circle" size={22} color="#7B1FA2" />
                <Text style={[r.quickBtnText, { color: '#7B1FA2' }]}>Exemptée</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Guidance message */}
        {guidanceMessage && (
          <View style={r.guidanceCard}>
            <Ionicons name="bulb-outline" size={18} color={r_c.accent} />
            <Text style={r.guidanceText}>{guidanceMessage}</Text>
          </View>
        )}

        {error && <Text style={r.errorText}>{error}</Text>}
        {info && <Text style={r.infoText}>{info}</Text>}

        {/* Stats cards */}
        <View style={r.statsRow}>
          {FASTING_STATUS_ORDER.map((status) => (
            <View key={status} style={[r.statCard, { backgroundColor: FASTING_BG_COLORS[status] }]}>
              <Ionicons name={FASTING_ICONS[status] as any} size={22} color={FASTING_ICON_COLORS[status]} />
              <Text style={[r.statNum, { color: FASTING_ICON_COLORS[status] }]}>{statusCounts[status] ?? 0}</Text>
              <Text style={r.statLabel}>{FASTING_STATUS_LABELS[status]}</Text>
            </View>
          ))}
          {outstandingMakeupDays > 0 && (
            <View style={[r.statCard, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="alert-circle" size={22} color="#E65100" />
              <Text style={[r.statNum, { color: '#E65100' }]}>{outstandingMakeupDays}</Text>
              <Text style={r.statLabel}>À rattraper</Text>
            </View>
          )}
        </View>

        {/* Calendar */}
        <View style={r.calendarCard}>
          <Text style={r.sectionTitle}>Calendrier</Text>
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator size="large" color={r_c.accent} />
            </View>
          ) : days.length === 0 ? (
            <Text style={r.mutedText}>Aucun jour de Ramadan trouvé pour {year}.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {days.map((day, idx) => {
                const isSelected = day.date === selectedDate;
                const isToday = day.date === todayIso;
                const isPast = day.date < todayIso;
                const hasStatus = Boolean(day.fastStatus);
                const iconName = day.fastStatus ? FASTING_ICONS[day.fastStatus] : undefined;
                const iconColor = day.fastStatus ? FASTING_ICON_COLORS[day.fastStatus] : undefined;
                const bgColor = day.fastStatus ? FASTING_BG_COLORS[day.fastStatus] : (isPast && !hasStatus ? '#FFF8E1' : r_c.card);

                return (
                  <TouchableOpacity
                    key={day.date}
                    style={[
                      r.calDay,
                      { backgroundColor: bgColor },
                      isSelected && r.calDaySelected,
                      isToday && !isSelected && r.calDayToday,
                    ]}
                    onPress={() => handleSelectDay(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[r.calDayNum, isToday && { color: r_c.accent, fontWeight: '800' }]}>{idx + 1}</Text>
                    {iconName ? (
                      <Ionicons name={iconName as any} size={16} color={iconColor} />
                    ) : isPast ? (
                      <Ionicons name="help-circle-outline" size={14} color="#FFA000" />
                    ) : (
                      <View style={{ height: 16 }} />
                    )}
                    {day.cycleStatus && day.cycleStatus !== 'PURE' && (
                      <View style={[r.calCycleDot, { backgroundColor: CYCLE_ICON_COLORS[day.cycleStatus] }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Legend */}
          <View style={r.legend}>
            {FASTING_STATUS_ORDER.map((status) => (
              <View key={status} style={r.legendItem}>
                <Ionicons name={FASTING_ICONS[status] as any} size={14} color={FASTING_ICON_COLORS[status]} />
                <Text style={r.legendText}>{FASTING_STATUS_LABELS[status]}</Text>
              </View>
            ))}
            <View style={r.legendItem}>
              <Ionicons name="help-circle-outline" size={14} color="#FFA000" />
              <Text style={r.legendText}>Non renseigné</Text>
            </View>
          </View>
        </View>

        {/* Day editor */}
        {selectedDay && (
          <View style={r.editorCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={r.editorDate}>{formatDate(selectedDay.date)}</Text>
                <Text style={r.editorDayNum}>Jour {days.findIndex((d) => d.date === selectedDay.date) + 1}</Text>
              </View>
              <TouchableOpacity style={r.closeBtn} onPress={() => setSelectedDate(null)}>
                <Ionicons name="close" size={20} color={r_c.muted} />
              </TouchableOpacity>
            </View>

            {/* Fasting status */}
            <Text style={r.editorLabel}>Statut du jeûne</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {FASTING_STATUS_ORDER.map((status) => {
                const isActive = fastStatusDraft === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[r.statusBtn, isActive && { backgroundColor: FASTING_BG_COLORS[status], borderColor: FASTING_ICON_COLORS[status] }]}
                    onPress={() => setFastStatusDraft(status)}
                  >
                    <Ionicons name={FASTING_ICONS[status] as any} size={20} color={isActive ? FASTING_ICON_COLORS[status] : r_c.muted} />
                    <Text style={[r.statusBtnText, isActive && { color: FASTING_ICON_COLORS[status], fontWeight: '700' }]}>
                      {FASTING_STATUS_LABELS[status]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cycle status */}
            <Text style={r.editorLabel}>Cycle</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CYCLE_STATUSES.map((status) => {
                const isActive = cycleStatusDraft === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[r.statusBtn, isActive && { backgroundColor: CYCLE_BADGE_COLORS[status], borderColor: CYCLE_ICON_COLORS[status] }]}
                    onPress={() => setCycleStatusDraft(status)}
                  >
                    <View style={[r.cycleDot, { backgroundColor: isActive ? CYCLE_ICON_COLORS[status] : r_c.muted }]} />
                    <Text style={[r.statusBtnText, isActive && { color: CYCLE_ICON_COLORS[status], fontWeight: '700' }]}>
                      {CYCLE_LABELS[status]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notes */}
            <Text style={r.editorLabel}>Notes (facultatif)</Text>
            <TextInput
              style={r.notesInput}
              placeholder="Ex : malade, voyage, règles…"
              placeholderTextColor={r_c.muted}
              value={notesDraft}
              onChangeText={setNotesDraft}
              multiline
            />

            {/* Save buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[r.saveBtn, (savingFasting || !fastStatusDraft) && { opacity: 0.5 }]}
                disabled={savingFasting || !fastStatusDraft}
                onPress={() => void handleSaveFasting()}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={r.saveBtnText}>{savingFasting ? 'Enregistrement…' : 'Enregistrer jeûne'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[r.cycleSaveBtn, (savingCycle || !cycleStatusDraft) && { opacity: 0.5 }]}
                disabled={savingCycle || !cycleStatusDraft}
                onPress={() => void handleSaveCycle()}
              >
                <Text style={r.cycleSaveBtnText}>{savingCycle ? 'Mise à jour…' : 'Enregistrer cycle'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Fasting Reminder Toggle ── */}
        {ramadanDayInfo.status === 'during' && (
          <TouchableOpacity
            style={[r.reminderToggle, fastingReminderOn && r.reminderToggleActive]}
            onPress={() => void toggleFastingReminder()}
            activeOpacity={0.7}
          >
            <Ionicons name={fastingReminderOn ? 'notifications' : 'notifications-outline'} size={20} color={fastingReminderOn ? '#fff' : r_c.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[r.reminderTitle, fastingReminderOn && { color: '#fff' }]}>Rappel quotidien de jeûne</Text>
              <Text style={[r.reminderSub, fastingReminderOn && { color: 'rgba(255,255,255,0.7)' }]}>
                {fastingReminderOn ? 'Activé — rappel chaque soir à 20h' : 'Recevoir un rappel pour noter ton jeûne'}
              </Text>
            </View>
            <View style={[r.toggleDot, fastingReminderOn && r.toggleDotActive]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: fastingReminderOn ? r_c.accent : r_c.muted }}>
                {fastingReminderOn ? 'ON' : 'OFF'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── End-of-Ramadan Summary ── */}
        {ramadanDayInfo.status === 'after' && days.length > 0 && (
          <View style={r.summaryCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Ionicons name="trophy" size={22} color="#FFC107" />
              <Text style={r.sectionTitle}>Bilan du Ramadan {year}</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <View style={[r.summaryItem, { backgroundColor: '#E8F5E9' }]}>
                <Text style={[r.summaryNum, { color: '#2E7D32' }]}>{statusCounts.FASTED ?? 0}</Text>
                <Text style={r.summaryLabel}>jours jeûnés</Text>
              </View>
              <View style={[r.summaryItem, { backgroundColor: '#FFEBEE' }]}>
                <Text style={[r.summaryNum, { color: '#C62828' }]}>{statusCounts.MISSED ?? 0}</Text>
                <Text style={r.summaryLabel}>jours ratés</Text>
              </View>
              <View style={[r.summaryItem, { backgroundColor: '#F3E5F5' }]}>
                <Text style={[r.summaryNum, { color: '#7B1FA2' }]}>{statusCounts.EXEMPTION ?? 0}</Text>
                <Text style={r.summaryLabel}>exemptions</Text>
              </View>
              <View style={[r.summaryItem, { backgroundColor: '#E3F2FD' }]}>
                <Text style={[r.summaryNum, { color: '#1565C0' }]}>{statusCounts.MADE_UP ?? 0}</Text>
                <Text style={r.summaryLabel}>rattrapés</Text>
              </View>
            </View>
            {outstandingMakeupDays > 0 && (
              <View style={r.summaryAlert}>
                <Ionicons name="alert-circle" size={18} color="#E65100" />
                <Text style={r.summaryAlertText}>
                  Il te reste {outstandingMakeupDays} jour{outstandingMakeupDays > 1 ? 's' : ''} à rattraper avant le prochain Ramadan.
                </Text>
              </View>
            )}
            {outstandingMakeupDays === 0 && (statusCounts.MISSED ?? 0) > 0 && (
              <View style={[r.summaryAlert, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
                <Text style={[r.summaryAlertText, { color: '#2E7D32' }]}>
                  Tous les jours manqués ont été rattrapés. Masha Allah !
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Makeup Planner ── */}
        {outstandingMakeupDays > 0 && (
          <View style={r.makeupCard}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              onPress={() => setShowMakeupPlanner(!showMakeupPlanner)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="calendar-outline" size={20} color={r_c.accent} />
                <View>
                  <Text style={r.sectionTitle}>Programme de rattrapage</Text>
                  <Text style={{ fontSize: 12, color: r_c.muted }}>{outstandingMakeupDays} jour{outstandingMakeupDays > 1 ? 's' : ''} à rattraper</Text>
                </View>
              </View>
              <Ionicons name={showMakeupPlanner ? 'chevron-up' : 'chevron-down'} size={18} color={r_c.muted} />
            </TouchableOpacity>

            {showMakeupPlanner && (
              <View style={{ marginTop: 14 }}>
                {/* Preference selector */}
                <Text style={r.editorLabel}>Jours de rattrapage</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {([
                    { key: 'mon_thu' as const, label: 'Lun & Jeu' },
                    { key: 'mon_only' as const, label: 'Lundis' },
                    { key: 'thu_only' as const, label: 'Jeudis' },
                    { key: 'custom' as const, label: 'Chaque jour' },
                  ]).map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[r.statusBtn, makeupPreference === opt.key && { backgroundColor: r_c.accentLight, borderColor: r_c.accent }]}
                      onPress={() => setMakeupPreference(opt.key)}
                    >
                      <Text style={[r.statusBtnText, makeupPreference === opt.key && { color: r_c.accent, fontWeight: '700' }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Generate button */}
                <TouchableOpacity style={r.generateBtn} onPress={generateMakeupPlan} activeOpacity={0.8}>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                  <Text style={r.generateBtnText}>Générer le programme</Text>
                </TouchableOpacity>

                {/* Plan list */}
                {makeupPlan.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[r.editorLabel, { marginTop: 0 }]}>
                      {makeupPlan.length} jour{makeupPlan.length > 1 ? 's' : ''} planifié{makeupPlan.length > 1 ? 's' : ''}
                    </Text>
                    {makeupPlan.slice(0, 12).map((dateStr, idx) => {
                      const d = new Date(`${dateStr}T00:00:00`);
                      const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                      const isPast = new Date(dateStr) < new Date(new Date().toISOString().slice(0, 10));
                      return (
                        <TouchableOpacity
                          key={dateStr}
                          style={[r.makeupDateRow, isPast && { opacity: 0.5 }]}
                          onPress={() => toggleMakeupDate(dateStr)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="checkmark-circle" size={18} color={r_c.accent} />
                          <Text style={r.makeupDateText}>Jour {idx + 1} — {label}</Text>
                          <Ionicons name="close-circle-outline" size={16} color={r_c.muted} />
                        </TouchableOpacity>
                      );
                    })}
                    {makeupPlan.length > 12 && (
                      <Text style={{ fontSize: 12, color: r_c.muted, textAlign: 'center', marginTop: 6 }}>
                        + {makeupPlan.length - 12} autres jours
                      </Text>
                    )}

                    {/* Schedule reminders button */}
                    <TouchableOpacity style={r.reminderBtn} onPress={() => void scheduleMakeupReminders()} activeOpacity={0.8}>
                      <Ionicons name="notifications-outline" size={16} color={r_c.accent} />
                      <Text style={r.reminderBtnText}>Programmer les rappels push</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Ramadan-specific colors & styles ──
const r_c = {
  bg: palette.bgAlt,
  card: palette.card,
  border: palette.border,
  text: palette.text,
  textSoft: palette.textSoft,
  muted: palette.muted,
  accent: palette.primaryDark,
  accentLight: palette.accentLightAlt,
};

const r = StyleSheet.create({
  screen: { flex: 1, backgroundColor: r_c.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: r_c.border,
  },
  topTitle: { fontSize: 20, fontWeight: '700', color: r_c.text },
  yearNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yearText: { fontSize: 14, fontWeight: '600', color: r_c.text },

  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2332',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
  },
  heroTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  heroDayBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFC107',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDayText: { fontSize: 20, fontWeight: '800', color: '#1A2332' },

  progressSection: { paddingHorizontal: 16, marginTop: 14 },
  progressLabel: { fontSize: 11, fontWeight: '600', color: r_c.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: r_c.accent,
    borderRadius: 3,
  },

  todayCard: {
    backgroundColor: r_c.card,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: r_c.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  todayTitle: { fontSize: 15, fontWeight: '700', color: r_c.text },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 4,
  },
  quickBtnText: { fontSize: 12, fontWeight: '700' },

  guidanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: r_c.accentLight,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  guidanceText: { flex: 1, fontSize: 13, color: r_c.text, lineHeight: 18 },

  errorText: { color: '#C62828', fontSize: 13, paddingHorizontal: 16, marginTop: 8 },
  infoText: { color: r_c.accent, fontSize: 13, paddingHorizontal: 16, marginTop: 8 },

  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 4,
  },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', color: r_c.muted, textTransform: 'uppercase', letterSpacing: 0.5 },

  calendarCard: {
    backgroundColor: r_c.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: r_c.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: r_c.text, marginBottom: 12 },
  mutedText: { fontSize: 13, color: r_c.muted },

  calDay: {
    width: '13%' as any,
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: r_c.border,
    position: 'relative',
  },
  calDaySelected: {
    borderWidth: 2,
    borderColor: r_c.accent,
  },
  calDayToday: {
    borderWidth: 2,
    borderColor: '#FFC107',
  },
  calDayNum: { fontSize: 12, fontWeight: '600', color: r_c.text },
  calCycleDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: r_c.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 10, color: r_c.muted, fontWeight: '600' },

  editorCard: {
    backgroundColor: r_c.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: r_c.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  editorDate: { fontSize: 16, fontWeight: '700', color: r_c.text, textTransform: 'capitalize' },
  editorDayNum: { fontSize: 12, color: r_c.muted, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: r_c.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: r_c.border,
    backgroundColor: r_c.card,
  },
  statusBtnText: { fontSize: 13, color: r_c.textSoft },
  cycleDot: { width: 10, height: 10, borderRadius: 5 },

  notesInput: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: r_c.text,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: r_c.border,
  },

  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: r_c.accent,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cycleSaveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: r_c.border,
  },
  cycleSaveBtnText: { color: r_c.text, fontWeight: '600', fontSize: 14 },

  // ── Fasting Reminder Toggle ──
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: r_c.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: r_c.border,
  },
  reminderToggleActive: {
    backgroundColor: r_c.accent,
    borderColor: r_c.accent,
  },
  reminderTitle: { fontSize: 14, fontWeight: '700', color: r_c.text },
  reminderSub: { fontSize: 11, color: r_c.muted, marginTop: 2 },
  toggleDot: {
    width: 36,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDotActive: {
    backgroundColor: '#fff',
  },

  // ── End-of-Ramadan Summary ──
  summaryCard: {
    backgroundColor: r_c.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: r_c.border,
  },
  summaryItem: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 2,
  },
  summaryNum: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '600', color: r_c.muted, textTransform: 'uppercase' },
  summaryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginTop: 14,
  },
  summaryAlertText: { flex: 1, fontSize: 13, color: '#E65100', lineHeight: 18 },

  // ── Makeup Planner ──
  makeupCard: {
    backgroundColor: r_c.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: r_c.border,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: r_c.accent,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginTop: 14,
  },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  makeupDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: r_c.border,
  },
  makeupDateText: { flex: 1, fontSize: 13, fontWeight: '500', color: r_c.text },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: r_c.accent,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginTop: 14,
  },
  reminderBtnText: { color: r_c.accent, fontWeight: '700', fontSize: 14 },

  catchupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: r_c.accent,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  catchupBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // ── Live iftar countdown ──
  iftarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iftarLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  iftarTime: { fontSize: 28, fontWeight: '800', color: '#FFC107', letterSpacing: 2, fontFamily: 'Amiri-Bold' },

  // ── Multi-year stats ──
  yearStatsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: r_c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: r_c.border,
  },
  yearStatsToggleText: { flex: 1, fontSize: 13, fontWeight: '600', color: r_c.accent },
  yearStatsBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: r_c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: r_c.border,
    padding: 14,
    gap: 10,
  },
  yearStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  yearStatsYear: { fontSize: 13, fontWeight: '700', color: r_c.text, width: 38 },
  miniBar: { height: 8, backgroundColor: r_c.border, borderRadius: 4, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 4 },
  yearStatsCounts: { fontSize: 11, color: r_c.muted, fontWeight: '600', width: 80, textAlign: 'right' },
});
