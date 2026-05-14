import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { FastingLogStatus } from '@oumoul/api';
import { palette } from '../theme';
import { ramadanApi } from '../api';
import { offlineCache, CACHE_TTL } from '../utils/offline-cache';
import { scheduleMakeupDayReminder, cancelMakeupReminders } from '../push-notifications';
import { BackButton } from '../components/BackButton';

const PREFERENCE_OPTIONS = [
  { key: 'mon_thu' as const, label: 'Lun & Jeu', sub: 'Sunnah recommandée' },
  { key: 'mon_only' as const, label: 'Lundis', sub: 'Lundi uniquement' },
  { key: 'thu_only' as const, label: 'Jeudis', sub: 'Jeudi uniquement' },
  { key: 'custom' as const, label: 'Chaque jour', sub: 'Rattrapage rapide' },
];

type Preference = typeof PREFERENCE_OPTIONS[number]['key'];

function getDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getDayOfWeekLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const dow = d.getDay();
  return dow === 1 ? 'Lundi' : dow === 4 ? 'Jeudi' : d.toLocaleDateString('fr-FR', { weekday: 'long' });
}

export function RamadanCatchupScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const year = new Date().getFullYear();

  const [missed, setMissed] = useState(0);
  const [madeUp, setMadeUp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preference, setPreference] = useState<Preference>('mon_thu');
  const [plan, setPlan] = useState<string[]>([]);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const PLAN_KEY = `oumoul_makeup_plan_${year}`;
  const PREF_KEY = `oumoul_makeup_pref_${year}`;

  const outstanding = Math.max(0, missed - madeUp);

  // Load fasting stats
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const cacheKey = `ramadan_summary_${year}`;
        const response = await offlineCache.getWithFallback(
          cacheKey,
          () => ramadanApi.summary(year),
          CACHE_TTL.MEDIUM,
        );
        const days = response?.days ?? [];
        let missedCount = 0;
        let madeUpCount = 0;
        for (const day of days) {
          if (day.fastStatus === FastingLogStatus.MISSED) missedCount++;
          if (day.fastStatus === FastingLogStatus.MADE_UP) madeUpCount++;
        }
        setMissed(missedCount);
        setMadeUp(madeUpCount);
      } catch {
        setError('Impossible de charger les données Ramadan.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [year]);

  // Load persisted plan & preference
  useEffect(() => {
    Promise.all([
      SecureStore.getItemAsync(PLAN_KEY),
      SecureStore.getItemAsync(PREF_KEY),
    ]).then(([rawPlan, rawPref]) => {
      if (rawPlan) { try { setPlan(JSON.parse(rawPlan) as string[]); } catch {} }
      if (rawPref) { try { setPreference(rawPref as Preference); } catch {} }
      setPlanLoaded(true);
    }).catch(() => setPlanLoaded(true));
  }, [PLAN_KEY, PREF_KEY]);

  // Persist plan
  useEffect(() => {
    if (!planLoaded) return;
    SecureStore.setItemAsync(PLAN_KEY, JSON.stringify(plan)).catch(() => {});
  }, [plan, planLoaded, PLAN_KEY]);

  const generatePlan = useCallback(() => {
    if (outstanding <= 0) return;
    SecureStore.setItemAsync(PREF_KEY, preference).catch(() => {});
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates: string[] = [];
    const cursor = new Date(today);
    cursor.setDate(cursor.getDate() + 1);
    while (dates.length < outstanding) {
      const dow = cursor.getDay();
      let include = false;
      if (preference === 'mon_thu') include = dow === 1 || dow === 4;
      else if (preference === 'mon_only') include = dow === 1;
      else if (preference === 'thu_only') include = dow === 4;
      else include = true;
      if (include) dates.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
      if (cursor.getTime() - today.getTime() > 365 * 24 * 60 * 60 * 1000) break;
    }
    setPlan(dates);
    setInfo(`Programme généré : ${dates.length} jour${dates.length > 1 ? 's' : ''} planifié${dates.length > 1 ? 's' : ''}.`);
  }, [outstanding, preference, PREF_KEY]);

  const removeDate = useCallback((dateStr: string) => {
    setPlan((prev) => prev.filter((d) => d !== dateStr));
  }, []);

  const scheduleReminders = useCallback(async () => {
    if (plan.length === 0) return;
    setScheduling(true);
    setInfo(null);
    setError(null);
    try {
      await cancelMakeupReminders(plan);
      let scheduled = 0;
      for (let i = 0; i < plan.length; i++) {
        const d = new Date(`${plan[i]}T00:00:00`);
        if (d.getTime() > Date.now()) {
          await scheduleMakeupDayReminder(d, i + 1);
          scheduled++;
        }
      }
      setInfo(`${scheduled} rappel${scheduled > 1 ? 's' : ''} programmé${scheduled > 1 ? 's' : ''} avec succès !`);
    } catch {
      setError('Impossible de programmer les rappels.');
    } finally {
      setScheduling(false);
    }
  }, [plan]);

  const upcomingPlan = useMemo(() => plan.filter((d) => new Date(`${d}T00:00:00`) >= new Date(new Date().toISOString().slice(0, 10))), [plan]);
  const pastPlan = useMemo(() => plan.filter((d) => new Date(`${d}T00:00:00`) < new Date(new Date().toISOString().slice(0, 10))), [plan]);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={s.topBar}>
        <BackButton onPress={onBack} />
        <Text style={s.topTitle}>Plan de rattrapage</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="calendar" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>Jeûnes à rattraper</Text>
            <Text style={s.heroSub}>Planifie tes jours de rattrapage selon la Sunnah</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="close-circle" size={22} color="#C62828" />
            <Text style={[s.statNum, { color: '#C62828' }]}>{loading ? '…' : missed}</Text>
            <Text style={s.statLabel}>Ratés</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="refresh-circle" size={22} color="#1565C0" />
            <Text style={[s.statNum, { color: '#1565C0' }]}>{loading ? '…' : madeUp}</Text>
            <Text style={s.statLabel}>Rattrapés</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: outstanding > 0 ? '#FFF3E0' : '#E8F5E9' }]}>
            <Ionicons
              name={outstanding > 0 ? 'alert-circle' : 'checkmark-circle'}
              size={22}
              color={outstanding > 0 ? '#E65100' : '#2E7D32'}
            />
            <Text style={[s.statNum, { color: outstanding > 0 ? '#E65100' : '#2E7D32' }]}>
              {loading ? '…' : outstanding}
            </Text>
            <Text style={s.statLabel}>Restants</Text>
          </View>
        </View>

        {outstanding === 0 && !loading && (
          <View style={s.allDoneCard}>
            <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
            <View style={{ flex: 1 }}>
              <Text style={s.allDoneTitle}>Masha Allah !</Text>
              <Text style={s.allDoneSub}>
                {missed === 0
                  ? 'Aucun jour manqué pour cette année.'
                  : 'Tous les jours manqués ont été rattrapés.'}
              </Text>
            </View>
          </View>
        )}

        {outstanding > 0 && (
          <>
            {/* Sunnah info */}
            <View style={s.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color={c.accent} />
              <Text style={s.infoText}>
                Le Prophète ﷺ jeûnait les <Text style={{ fontWeight: '700' }}>lundis et jeudis</Text>. C'est la méthode recommandée pour rattraper les jours manqués.
              </Text>
            </View>

            {/* Preference selector */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Choisir les jours de rattrapage</Text>
              <View style={s.prefGrid}>
                {PREFERENCE_OPTIONS.map((opt) => {
                  const active = preference === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[s.prefChip, active && s.prefChipActive]}
                      onPress={() => setPreference(opt.key)}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.prefChipLabel, active && s.prefChipLabelActive]}>{opt.label}</Text>
                      <Text style={[s.prefChipSub, active && { color: 'rgba(255,255,255,0.8)' }]}>{opt.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={s.generateBtn} onPress={generatePlan} activeOpacity={0.85}>
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={s.generateBtnText}>Générer le programme ({outstanding} jour{outstanding > 1 ? 's' : ''})</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Feedback */}
        {info && (
          <View style={s.feedbackCard}>
            <Ionicons name="checkmark-circle" size={16} color={c.accent} />
            <Text style={s.feedbackText}>{info}</Text>
          </View>
        )}
        {error && (
          <View style={[s.feedbackCard, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="alert-circle" size={16} color="#C62828" />
            <Text style={[s.feedbackText, { color: '#C62828' }]}>{error}</Text>
          </View>
        )}

        {/* Upcoming plan */}
        {upcomingPlan.length > 0 && (
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <Text style={s.cardTitle}>À venir — {upcomingPlan.length} jour{upcomingPlan.length > 1 ? 's' : ''}</Text>
              <TouchableOpacity
                style={[s.reminderBtn, scheduling && { opacity: 0.6 }]}
                onPress={() => void scheduleReminders()}
                disabled={scheduling}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications-outline" size={14} color={c.accent} />
                <Text style={s.reminderBtnText}>{scheduling ? '…' : 'Rappels'}</Text>
              </TouchableOpacity>
            </View>
            {upcomingPlan.map((dateStr, idx) => (
              <View key={dateStr} style={s.dateRow}>
                <View style={s.dateIndexBadge}>
                  <Text style={s.dateIndexText}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.dateLabel}>{getDayLabel(dateStr)}</Text>
                  <Text style={s.dateDow}>{getDayOfWeekLabel(dateStr)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeDate(dateStr)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle-outline" size={20} color={c.muted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Past plan */}
        {pastPlan.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Passés — {pastPlan.length} jour{pastPlan.length > 1 ? 's' : ''}</Text>
            {pastPlan.map((dateStr, idx) => (
              <View key={dateStr} style={[s.dateRow, { opacity: 0.5 }]}>
                <View style={[s.dateIndexBadge, { backgroundColor: c.border }]}>
                  <Text style={[s.dateIndexText, { color: c.muted }]}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.dateLabel}>{getDayLabel(dateStr)}</Text>
                  <Text style={s.dateDow}>{getDayOfWeekLabel(dateStr)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeDate(dateStr)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle-outline" size={20} color={c.muted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {plan.length === 0 && outstanding > 0 && !loading && (
          <View style={s.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color={c.muted} />
            <Text style={s.emptyTitle}>Aucun programme généré</Text>
            <Text style={s.emptySub}>Choisis tes jours préférés et appuie sur "Générer le programme".</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const c = {
  bg: palette.bgAlt,
  card: palette.card,
  border: palette.border,
  text: palette.text,
  textSoft: palette.textSoft,
  muted: palette.muted,
  accent: palette.primaryDark,
  accentLight: palette.accentLight,
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  topTitle: { fontSize: 20, fontWeight: '700', color: c.text },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2332',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3, lineHeight: 17 },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 4,
  },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 },

  allDoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  allDoneTitle: { fontSize: 15, fontWeight: '700', color: '#2E7D32' },
  allDoneSub: { fontSize: 12, color: '#388E3C', marginTop: 2 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: c.accentLight,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  infoText: { flex: 1, fontSize: 13, color: c.text, lineHeight: 19 },

  card: {
    backgroundColor: c.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 12 },

  prefGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prefChip: {
    flex: 1,
    minWidth: '45%' as any,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  prefChipActive: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  prefChipLabel: { fontSize: 14, fontWeight: '700', color: c.text },
  prefChipLabelActive: { color: '#fff' },
  prefChipSub: { fontSize: 11, color: c.muted, marginTop: 2 },

  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accent,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 14,
  },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.accentLight,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  feedbackText: { flex: 1, fontSize: 13, color: c.accent, fontWeight: '500' },

  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.accent,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  reminderBtnText: { fontSize: 12, fontWeight: '600', color: c.accent },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    gap: 12,
  },
  dateIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateIndexText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  dateLabel: { fontSize: 13, fontWeight: '600', color: c.text, textTransform: 'capitalize' },
  dateDow: { fontSize: 11, color: c.muted, marginTop: 1, textTransform: 'capitalize' },

  emptyCard: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 32,
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: c.text },
  emptySub: { fontSize: 13, color: c.muted, textAlign: 'center', lineHeight: 19 },
});
