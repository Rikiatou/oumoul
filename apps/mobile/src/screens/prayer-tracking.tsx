import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { PrayerStatus } from '@oumoul/api';
import type { PrayerNameCloud, PrayerLogStatusCloud } from '@oumoul/api';
import { palette } from '../theme';
import { HelpTip } from '../components/HelpTip';
import { awardEvent } from '../gamification/gamification-events';
import { prayerLogApi } from '../api';

const PRAYER_LOGS_KEY = 'oumoul_prayer_logs';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
type PrayerName = (typeof PRAYER_NAMES)[number];

const PRAYER_KEYS: Record<PrayerName, 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'> = {
  Fajr: 'fajr',
  Dhuhr: 'dhuhr',
  Asr: 'asr',
  Maghrib: 'maghrib',
  Isha: 'isha',
};

const STATUS_CONFIG: Record<PrayerStatus, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  [PrayerStatus.PRAYED_ON_TIME]: { label: 'À l\'heure', icon: 'checkmark-circle', color: '#388E3C', bg: '#E8F5E9' },
  [PrayerStatus.PRAYED_LATE]: { label: 'En retard', icon: 'time', color: '#F57C00', bg: '#FFF3E0' },
  [PrayerStatus.MISSED]: { label: 'Manquée', icon: 'close-circle', color: '#D32F2F', bg: '#FFEBEE' },
  [PrayerStatus.EXEMPTED]: { label: 'Exemptée', icon: 'remove-circle', color: '#7B1FA2', bg: '#F3E5F5' },
};

const STATUS_ORDER: PrayerStatus[] = [
  PrayerStatus.PRAYED_ON_TIME,
  PrayerStatus.PRAYED_LATE,
  PrayerStatus.MISSED,
  PrayerStatus.EXEMPTED,
];

interface DayLog {
  date: string;
  prayers: Record<string, PrayerStatus>;
}

function getWeekDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function getMonthDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
}

export function PrayerTrackingScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Local state for prayer logs
  const [logs, setLogs] = useState<Record<string, Record<string, PrayerStatus>>>({});
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'month'>('today');
  const [loaded, setLoaded] = useState(false);

  // Map cloud status → local PrayerStatus
  const cloudStatusToLocal = (s: PrayerLogStatusCloud): PrayerStatus => {
    switch (s) {
      case 'PRAYED_ON_TIME': return PrayerStatus.PRAYED_ON_TIME;
      case 'PRAYED_LATE': return PrayerStatus.PRAYED_LATE;
      case 'MISSED': return PrayerStatus.MISSED;
      case 'EXEMPTED': return PrayerStatus.EXEMPTED;
    }
  };

  // Map local PrayerStatus → cloud status
  const localStatusToCloud = (s: PrayerStatus): PrayerLogStatusCloud => {
    switch (s) {
      case PrayerStatus.PRAYED_ON_TIME: return 'PRAYED_ON_TIME';
      case PrayerStatus.PRAYED_LATE: return 'PRAYED_LATE';
      case PrayerStatus.MISSED: return 'MISSED';
      case PrayerStatus.EXEMPTED: return 'EXEMPTED';
    }
  };

  // Load persisted logs on mount + merge with cloud
  useEffect(() => {
    async function loadAndMerge() {
      let local: Record<string, Record<string, PrayerStatus>> = {};
      try {
        const raw = await SecureStore.getItemAsync(PRAYER_LOGS_KEY);
        if (raw) local = JSON.parse(raw);
      } catch { /* ignore */ }

      try {
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const to = new Date().toISOString().slice(0, 10);
        const remote = await prayerLogApi.getLogs(from, to);
        // Merge remote into local — remote wins (it's cloud truth)
        const merged = { ...local };
        for (const entry of remote) {
          const dateKey = entry.date.slice(0, 10);
          if (!merged[dateKey]) merged[dateKey] = {};
          merged[dateKey][entry.prayer] = cloudStatusToLocal(entry.status);
        }
        setLogs(merged);
        await SecureStore.setItemAsync(PRAYER_LOGS_KEY, JSON.stringify(merged));
      } catch {
        // Offline — use local only
        setLogs(local);
      }
      setLoaded(true);
    }
    void loadAndMerge();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize today if not present
  useEffect(() => {
    if (!loaded) return;
    setLogs((prev) => {
      if (prev[todayIso]) return prev;
      return { ...prev, [todayIso]: {} };
    });
  }, [todayIso, loaded]);

  // Persist logs on change
  useEffect(() => {
    if (!loaded) return;
    SecureStore.setItemAsync(PRAYER_LOGS_KEY, JSON.stringify(logs)).catch(() => {});
  }, [logs, loaded]);

  const togglePrayerStatus = useCallback((date: string, prayer: string) => {
    setLogs((prev) => {
      const dayLog = prev[date] ?? {};
      const current = dayLog[prayer];
      const currentIdx = current ? STATUS_ORDER.indexOf(current) : -1;
      const nextIdx = (currentIdx + 1) % (STATUS_ORDER.length + 1);
      const nextStatus = nextIdx < STATUS_ORDER.length ? STATUS_ORDER[nextIdx] : undefined;

      const updated = { ...dayLog };
      if (nextStatus) {
        updated[prayer] = nextStatus;
        // Award gamification points for praying
        if (nextStatus === PrayerStatus.PRAYED_ON_TIME) void awardEvent('prayer_on_time');
        else if (nextStatus === PrayerStatus.PRAYED_LATE) void awardEvent('prayer_late');
        // Check if all 5 prayers done today
        const newDay = { ...updated };
        const prayedCount = Object.values(newDay).filter(
          (s) => s === PrayerStatus.PRAYED_ON_TIME || s === PrayerStatus.PRAYED_LATE
        ).length;
        if (prayedCount === 5) void awardEvent('all_prayers_day');
        // Sync to cloud — fire and forget
        prayerLogApi.upsert({
          date,
          prayer: prayer as PrayerNameCloud,
          status: localStatusToCloud(nextStatus),
        }).catch(() => { /* offline — local persists */ });
      } else {
        delete updated[prayer];
        // When status is cleared, sync MISSED as default to cloud
        prayerLogApi.upsert({
          date,
          prayer: prayer as PrayerNameCloud,
          status: 'MISSED',
        }).catch(() => {});
      }
      return { ...prev, [date]: updated };
    });
  }, [localStatusToCloud]);

  // Stats calculations
  const stats = useMemo(() => {
    const allEntries = Object.values(logs).flatMap((day) => Object.values(day));
    const total = allEntries.length;
    const onTime = allEntries.filter((s) => s === PrayerStatus.PRAYED_ON_TIME).length;
    const late = allEntries.filter((s) => s === PrayerStatus.PRAYED_LATE).length;
    const missed = allEntries.filter((s) => s === PrayerStatus.MISSED).length;
    const prayed = onTime + late;

    // Streak calculation
    let streak = 0;
    const sortedDates = Object.keys(logs).sort().reverse();
    for (const date of sortedDates) {
      const day = logs[date];
      const dayPrayers = Object.values(day);
      if (dayPrayers.length === 5 && dayPrayers.every((s) => s === PrayerStatus.PRAYED_ON_TIME || s === PrayerStatus.PRAYED_LATE)) {
        streak++;
      } else {
        break;
      }
    }

    return {
      total,
      onTime,
      late,
      missed,
      prayed,
      onTimePercent: total > 0 ? Math.round((onTime / total) * 100) : 0,
      prayedPercent: total > 0 ? Math.round((prayed / total) * 100) : 0,
      streak,
    };
  }, [logs]);

  // Today's prayers
  const todayPrayers = logs[todayIso] ?? {};
  const todayCompleted = Object.keys(todayPrayers).length;

  const weekDates = useMemo(() => getWeekDates(), []);
  const monthDates = useMemo(() => getMonthDates(), []);

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={st.header}>
        <BackButton onPress={onBack} />
        <Text style={st.headerTitle} accessibilityRole="header">Suivi des prières</Text>
        <HelpTip screenName="Suivi des prières" tips={[
          { icon: 'checkmark-done', title: 'Enregistre tes prières', description: 'Appuie sur une prière pour changer son statut : à l\'heure, en retard ou manquée.' },
          { icon: 'flame', title: 'Séries (streaks)', description: 'Chaque jour où tu pries les 5 prières à l\'heure augmente ta série.' },
          { icon: 'calendar', title: 'Vue hebdomadaire', description: 'La grille des 7 derniers jours te montre ta régularité en un coup d\'œil.' },
          { icon: 'bar-chart', title: 'Statistiques mensuelles', description: 'Suis ton pourcentage de prières accomplies sur le mois en cours.' },
          { icon: 'save', title: 'Sauvegarde automatique', description: 'Tes données sont sauvegardées localement et persistent entre les sessions.' },
        ]} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Streak & Stats Banner */}
        <View style={st.streakBanner}>
          <View style={st.streakCircle}>
            <Text style={st.streakNumber}>{stats.streak}</Text>
            <Text style={st.streakLabel}>jours</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={st.streakTitle}>Série en cours 🔥</Text>
            <Text style={st.streakSub}>{stats.prayedPercent}% des prières accomplies</Text>
            <View style={st.progressBarBg}>
              <View style={[st.progressBarFill, { width: `${stats.prayedPercent}%` }]} />
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={st.statsRow}>
          <View style={st.statCard}>
            <Ionicons name="checkmark-circle" size={20} color="#388E3C" />
            <Text style={st.statValue}>{stats.onTime}</Text>
            <Text style={st.statLabel}>À l'heure</Text>
          </View>
          <View style={st.statCard}>
            <Ionicons name="time" size={20} color="#F57C00" />
            <Text style={st.statValue}>{stats.late}</Text>
            <Text style={st.statLabel}>En retard</Text>
          </View>
          <View style={st.statCard}>
            <Ionicons name="close-circle" size={20} color="#D32F2F" />
            <Text style={st.statValue}>{stats.missed}</Text>
            <Text style={st.statLabel}>Manquées</Text>
          </View>
        </View>

        {/* View Mode Tabs */}
        <View style={st.tabRow}>
          {(['today', 'week', 'month'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[st.tab, viewMode === mode && st.tabActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[st.tabText, viewMode === mode && st.tabTextActive]}>
                {mode === 'today' ? "Aujourd'hui" : mode === 'week' ? 'Semaine' : 'Mois'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today View */}
        {viewMode === 'today' && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>
              {todayCompleted}/5 prières enregistrées
            </Text>
            {PRAYER_NAMES.map((name) => {
              const key = PRAYER_KEYS[name];
              const status = todayPrayers[key];
              const config = status ? STATUS_CONFIG[status] : null;
              return (
                <TouchableOpacity
                  key={name}
                  style={st.prayerRow}
                  onPress={() => togglePrayerStatus(todayIso, key)}
                  activeOpacity={0.7}
                  accessibilityLabel={`${name}: ${config?.label ?? 'Non enregistrée'}. Appuie pour changer.`}
                  accessibilityRole="button"
                  accessibilityHint="Change le statut de cette prière"
                >
                  <View style={[st.prayerIcon, { backgroundColor: config?.bg ?? '#F5F5F5' }]}>
                    <Ionicons
                      name={config?.icon ?? 'ellipse-outline'}
                      size={20}
                      color={config?.color ?? palette.textSoft}
                    />
                  </View>
                  <Text style={st.prayerName}>{name}</Text>
                  <View style={[st.statusBadge, { backgroundColor: config?.bg ?? '#F5F5F5' }]}>
                    <Text style={[st.statusText, { color: config?.color ?? palette.textSoft }]}>
                      {config?.label ?? 'Non enregistrée'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <Text style={st.hint}>Appuie sur une prière pour changer son statut</Text>
          </View>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>7 derniers jours</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Header row */}
                <View style={st.gridRow}>
                  <View style={st.gridLabel} />
                  {weekDates.map((d) => (
                    <View key={d} style={st.gridCell}>
                      <Text style={st.gridDateText}>{formatShortDate(d)}</Text>
                    </View>
                  ))}
                </View>
                {/* Prayer rows */}
                {PRAYER_NAMES.map((name) => {
                  const key = PRAYER_KEYS[name];
                  return (
                    <View key={name} style={st.gridRow}>
                      <View style={st.gridLabel}>
                        <Text style={st.gridLabelText}>{name}</Text>
                      </View>
                      {weekDates.map((d) => {
                        const status = logs[d]?.[key];
                        const config = status ? STATUS_CONFIG[status] : null;
                        return (
                          <TouchableOpacity
                            key={d}
                            style={[st.gridCell, { backgroundColor: config?.bg ?? '#FAFAFA' }]}
                            onPress={() => togglePrayerStatus(d, key)}
                          >
                            {config ? (
                              <Ionicons name={config.icon} size={14} color={config.color} />
                            ) : (
                              <View style={st.gridEmpty} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>30 derniers jours</Text>
            {/* Monthly summary per prayer */}
            {PRAYER_NAMES.map((name) => {
              const key = PRAYER_KEYS[name];
              const total = monthDates.length;
              const onTime = monthDates.filter((d) => logs[d]?.[key] === PrayerStatus.PRAYED_ON_TIME).length;
              const prayed = monthDates.filter((d) => {
                const s = logs[d]?.[key];
                return s === PrayerStatus.PRAYED_ON_TIME || s === PrayerStatus.PRAYED_LATE;
              }).length;
              const pct = total > 0 ? Math.round((prayed / total) * 100) : 0;
              return (
                <View key={name} style={st.monthRow}>
                  <Text style={st.monthPrayerName}>{name}</Text>
                  <View style={st.monthBarBg}>
                    <View style={[st.monthBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={st.monthPct}>{pct}%</Text>
                </View>
              );
            })}

            {/* Heat map */}
            <Text style={[st.sectionTitle, { marginTop: 20 }]}>Calendrier</Text>
            <View style={st.heatGrid}>
              {monthDates.map((d) => {
                const day = logs[d] ?? {};
                const count = Object.values(day).filter(
                  (s) => s === PrayerStatus.PRAYED_ON_TIME || s === PrayerStatus.PRAYED_LATE
                ).length;
                const opacity = count === 0 ? 0.1 : count / 5;
                return (
                  <View
                    key={d}
                    style={[st.heatCell, { backgroundColor: `rgba(56, 142, 60, ${opacity})` }]}
                  >
                    <Text style={st.heatText}>{new Date(d + 'T00:00:00').getDate()}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  streakBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.primary, borderRadius: 16, padding: 20, marginBottom: 16 },
  streakCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  streakNumber: { fontSize: 22, fontWeight: '800', color: '#fff' },
  streakLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  streakTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  streakSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 8 },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3 },
  progressBarFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: palette.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: palette.border },
  statValue: { fontSize: 20, fontWeight: '700', color: palette.text, marginTop: 4 },
  statLabel: { fontSize: 11, color: palette.textSoft, marginTop: 2 },
  tabRow: { flexDirection: 'row', backgroundColor: palette.card, borderRadius: 10, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: palette.border },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: palette.primaryDark },
  tabText: { fontSize: 13, fontWeight: '600', color: palette.textSoft },
  tabTextActive: { color: '#fff' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: palette.text, marginBottom: 12 },
  prayerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: palette.border },
  prayerIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  prayerName: { flex: 1, fontSize: 16, fontWeight: '600', color: palette.text, marginLeft: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  hint: { fontSize: 12, color: palette.muted, textAlign: 'center', marginTop: 8 },
  gridRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  gridLabel: { width: 60 },
  gridLabelText: { fontSize: 12, fontWeight: '600', color: palette.text },
  gridCell: { width: 44, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
  gridDateText: { fontSize: 9, color: palette.textSoft, fontWeight: '500', textAlign: 'center' },
  gridEmpty: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  monthPrayerName: { width: 70, fontSize: 14, fontWeight: '600', color: palette.text },
  monthBarBg: { flex: 1, height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, marginHorizontal: 10 },
  monthBarFill: { height: 8, backgroundColor: palette.primaryDark, borderRadius: 4 },
  monthPct: { width: 40, fontSize: 13, fontWeight: '700', color: palette.text, textAlign: 'right' },
  heatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  heatCell: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  heatText: { fontSize: 11, fontWeight: '600', color: palette.text },
});
