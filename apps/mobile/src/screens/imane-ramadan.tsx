import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
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
import { sc, ss } from '../ui/theme';

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

const FASTING_COLORS: Record<FastingLogStatus, string> = {
  FASTED: 'rgba(27, 94, 32, 0.15)',
  EXEMPTION: 'rgba(106, 27, 154, 0.12)',
  MISSED: 'rgba(183, 28, 28, 0.12)',
  MADE_UP: 'rgba(13, 71, 161, 0.12)',
};

const CYCLE_LABELS: Record<CycleStatus, string> = {
  PURE: 'Pure',
  MENSES: 'Règles',
  SPOTTING: 'Spotting',
  POSTPARTUM: 'Post-partum',
};

const CYCLE_BADGE_COLORS: Record<CycleStatus, string> = {
  PURE: 'rgba(0,0,0,0.05)',
  MENSES: 'rgba(183,28,28,0.15)',
  SPOTTING: 'rgba(255,143,0,0.15)',
  POSTPARTUM: 'rgba(106,27,154,0.15)',
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
  const todayStatusText = useMemo(() => {
    const today = days.find((d) => d.date === todayIso);
    if (!today) return 'Statut du jour non saisi';
    const fastingLabel = today.fastStatus ? FASTING_STATUS_LABELS[today.fastStatus] : 'Jeûne non saisi';
    const cycleLabel = today.cycleStatus ? CYCLE_LABELS[today.cycleStatus] : null;
    return cycleLabel ? `${fastingLabel} · Cycle: ${cycleLabel}` : fastingLabel;
  }, [days, todayIso]);

  const progressText = useMemo(() => {
    if (days.length === 0) return '';
    const fasted = statusCounts.FASTED ?? 0;
    const missed = statusCounts.MISSED ?? 0;
    const madeUp = statusCounts.MADE_UP ?? 0;
    return `Avancement ${fasted}/${days.length} · Ratés ${missed} · Rattrapés ${madeUp}`;
  }, [days.length, statusCounts]);

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
    },
    [],
  );

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
            ? {
                ...day,
                fastStatus: updated.fastStatus,
                notes: updated.notes,
              }
            : day,
        );
        return { ...prev, days: nextDays };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible d’enregistrer ce jour de Ramadan.';
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

          return {
            ...day,
            cycleStatus: updated.status,
          };
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
              ? {
                  ...day,
                  fastStatus: fastingUpdated.fastStatus,
                  notes: fastingUpdated.notes,
                }
              : day,
          );
          return { ...prev, days: nextDays };
        });

        setInfo('Jeûne mis en “Exemptée” automatiquement (cycle).');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de mettre à jour le cycle.';
      setError(message);
    } finally {
      setSavingCycle(false);
    }
  }, [cycleStatusDraft, selectedDate]);

  const columns = 6;

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
          <Text style={ss.title}>Ramadan & cycle</Text>
          <Text style={ss.subtitle}>Enregistre ton statut de jeûne et ton cycle.</Text>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <View style={[ss.infoRow, { flex: 1, minWidth: 150 }]}>
            <Text style={ss.label}>Aujourd'hui</Text>
            <Text style={{ color: sc.text, fontWeight: '600', fontSize: 13, marginTop: 2 }}>{todayStatusText}</Text>
          </View>
          <View style={[ss.infoRow, { flex: 1, minWidth: 150 }]}>
            <Text style={ss.label}>Avancement</Text>
            <Text style={{ color: sc.text, fontWeight: '600', fontSize: 13, marginTop: 2 }}>{progressText || 'Pas encore de données'}</Text>
          </View>
          <View style={[ss.infoRow, { flex: 1, minWidth: 150 }]}>
            <Text style={ss.label}>Rattrapages</Text>
            <Text style={{ color: sc.text, fontWeight: '700', fontSize: 18, marginTop: 2 }}>{outstandingMakeupDays}</Text>
          </View>
        </View>

        {/* Year nav */}
        <View style={[ss.row, ss.gap8, ss.mb16]}>
          <TouchableOpacity onPress={() => setYear((prev) => prev - 1)} style={ss.outlineBtn}>
            <Ionicons name="chevron-back" size={14} color={sc.text} />
          </TouchableOpacity>
          <Text style={{ color: sc.text, fontWeight: '700', fontSize: 15 }}>{year}</Text>
          <TouchableOpacity onPress={() => setYear((prev) => prev + 1)} style={ss.outlineBtn}>
            <Ionicons name="chevron-forward" size={14} color={sc.text} />
          </TouchableOpacity>
        </View>

        {error && <Text style={[ss.errorText, ss.mb8]}>{error}</Text>}
        {info && <Text style={[ss.muted, ss.mb8]}>{info}</Text>}

        {/* Summary card */}
        <View style={ss.card}>
          <View style={[ss.row, { justifyContent: 'space-between' }]}>
            <Text style={ss.sectionTitle}>Résumé</Text>
            <Text style={ss.muted}>À rattraper : {outstandingMakeupDays}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FASTING_STATUS_ORDER.map((status) => (
              <View key={status} style={[ss.infoRow, { minWidth: 70 }]}>
                <Text style={ss.label}>{FASTING_STATUS_LABELS[status]}</Text>
                <Text style={{ color: sc.text, fontSize: 20, fontWeight: '700' }}>{statusCounts[status] ?? 0}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Calendar card */}
        <View style={ss.card}>
          <Text style={ss.sectionTitle}>Calendrier</Text>
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator color={sc.accent} />
              <Text style={[ss.muted, { marginTop: 8 }]}>Chargement du calendrier…</Text>
            </View>
          ) : days.length === 0 ? (
            <Text style={ss.muted}>Aucun jour de Ramadan trouvé pour cette année.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {days.map((day) => {
                const dayNum = new Date(`${day.date}T00:00:00.000Z`).getUTCDate();
                const isSelected = day.date === selectedDate;
                const fastBg = day.fastStatus ? FASTING_COLORS[day.fastStatus] : 'rgba(0,0,0,0.03)';
                const cycleBadgeBg = day.cycleStatus ? CYCLE_BADGE_COLORS[day.cycleStatus] : null;

                return (
                  <TouchableOpacity
                    key={day.date}
                    style={{ width: `${100 / columns}%`, padding: 3 }}
                    onPress={() => handleSelectDay(day)}
                  >
                    <View style={{
                      minHeight: 56, borderRadius: 10,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? sc.accent : 'rgba(0,0,0,0.08)',
                      backgroundColor: fastBg, padding: 6, justifyContent: 'space-between',
                    }}>
                      <Text style={{ color: sc.text, fontWeight: '600', fontSize: 12 }}>{dayNum}</Text>
                      {cycleBadgeBg && day.cycleStatus && (
                        <View style={{ alignSelf: 'flex-start', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 999, backgroundColor: cycleBadgeBg }}>
                          <Text style={{ color: sc.text, fontSize: 8, letterSpacing: 0.5 }}>{CYCLE_LABELS[day.cycleStatus] ?? day.cycleStatus}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Selected day editor */}
        {selectedDay && (
          <View style={ss.card}>
            <View style={[ss.row, { justifyContent: 'space-between' }]}>
              <Text style={{ color: sc.text, fontSize: 16, fontWeight: '700' }}>{formatDate(selectedDay.date)}</Text>
              <TouchableOpacity style={ss.outlineBtn} onPress={() => setSelectedDate(null)}>
                <Text style={ss.outlineBtnText}>Fermer</Text>
              </TouchableOpacity>
            </View>

            <Text style={[ss.label, { marginTop: 10 }]}>Jeûne</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {FASTING_STATUS_ORDER.map((status) => {
                const isActive = fastStatusDraft === status;
                return (
                  <TouchableOpacity key={status} style={[ss.chip, isActive && ss.chipActive]} onPress={() => setFastStatusDraft(status)}>
                    <Text style={[ss.chipText, isActive && ss.chipTextActive]}>{FASTING_STATUS_LABELS[status]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[ss.label, { marginTop: 10 }]}>Cycle</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {CYCLE_STATUSES.map((status) => {
                const isActive = cycleStatusDraft === status;
                return (
                  <TouchableOpacity key={status} style={[ss.chip, isActive && { backgroundColor: CYCLE_BADGE_COLORS[status] }]} onPress={() => setCycleStatusDraft(status)}>
                    <Text style={[ss.chipText, isActive && { color: sc.text }]}>{CYCLE_LABELS[status]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[ss.label, { marginTop: 10 }]}>Raison (facultatif)</Text>
            <TextInput
              style={[ss.input, { minHeight: 50, textAlignVertical: 'top' }]}
              placeholder="Ex : règles, malade, voyage…"
              placeholderTextColor={sc.muted}
              value={notesDraft}
              onChangeText={setNotesDraft}
              multiline
            />

            <View style={[ss.row, { gap: 10, marginTop: 10 }]}>
              <TouchableOpacity
                style={[ss.primaryBtn, { flex: 1 }, (savingFasting || !fastStatusDraft) && { opacity: 0.5 }]}
                disabled={savingFasting || !fastStatusDraft}
                onPress={() => void handleSaveFasting()}
              >
                <Text style={ss.primaryBtnText}>{savingFasting ? 'Enregistrement…' : 'Enregistrer jeûne'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ss.outlineBtn, { flex: 1, alignItems: 'center' }, (savingCycle || !cycleStatusDraft) && { opacity: 0.5 }]}
                disabled={savingCycle || !cycleStatusDraft}
                onPress={() => void handleSaveCycle()}
              >
                <Text style={ss.outlineBtnText}>{savingCycle ? 'Mise à jour…' : 'Enregistrer cycle'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
