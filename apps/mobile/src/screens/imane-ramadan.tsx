import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { colors } from '@oumoul/ui';
import { FastingLogStatus } from '@oumoul/api';
import type {
  AuthUser,
  CycleStatus,
  RamadanDaySummary,
  RamadanSummaryResponse,
} from '@oumoul/api';
import { cycleApi, ramadanApi } from '../api';

const RAMADAN_START_2026 = '2026-02-18';
const RAMADAN_END_2026 = '2026-03-19';

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
    const start = new Date(RAMADAN_START_2026);
    const end = new Date(RAMADAN_END_2026);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (today < start) {
      const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { status: 'before' as const, daysUntil: diff, dayNumber: 0, totalDays: 30 };
    }
    if (today > end) {
      return { status: 'after' as const, daysUntil: 0, dayNumber: 30, totalDays: 30 };
    }
    const dayNum = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { status: 'during' as const, daysUntil: 0, dayNumber: dayNum, totalDays: 30 };
  }, []);

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
      const response = await ramadanApi.summary(year);
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
  }, []);

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
  }, [fastStatusDraft, notesDraft, selectedDate]);

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

  const insets = useSafeAreaInsets();

  return (
    <View style={[r.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={r.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={r_c.accent} />
        </TouchableOpacity>
        <Text style={r.topTitle}>Ramadan</Text>
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

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadYear().finally(() => setRefreshing(false)); }} tintColor={r_c.accent} />}>
        {/* Ramadan day banner */}
        <View style={r.heroBanner}>
          <Ionicons name="moon" size={24} color="#FFC107" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            {ramadanDayInfo.status === 'before' && (
              <>
                <Text style={r.heroTitle}>Ramadan dans {ramadanDayInfo.daysUntil} jour{ramadanDayInfo.daysUntil > 1 ? 's' : ''}</Text>
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
      </ScrollView>
    </View>
  );
}

// ── Ramadan-specific colors & styles ──
const r_c = {
  bg: '#FAFAF5',
  card: '#FFFFFF',
  border: 'rgba(0,0,0,0.06)',
  text: '#1A1A1A',
  textSoft: 'rgba(26,26,26,0.6)',
  muted: 'rgba(26,26,26,0.35)',
  accent: colors.primaryDark,
  accentLight: 'rgba(26,127,100,0.1)',
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
});
