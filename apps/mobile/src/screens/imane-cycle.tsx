import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@oumoul/ui';
import type { AuthUser, CycleMonthResponse, CycleStatus } from '@oumoul/api';
import { cycleApi } from '../api';
import { sc, ss } from '../ui/theme';

const CYCLE_STATUSES: CycleStatus[] = ['PURE', 'MENSES', 'SPOTTING', 'POSTPARTUM'];
const CYCLE_LABELS: Record<CycleStatus, string> = {
  PURE: 'Pure',
  MENSES: 'Règles',
  SPOTTING: 'Spotting',
  POSTPARTUM: 'Post-partum',
};

export function ImaneCycleScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth() + 1); // 1-12
  const [data, setData] = useState<CycleMonthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<CycleStatus>('PURE');
  const [notesDraft, setNotesDraft] = useState('');

  const daysMap = useMemo(() => {
    const map = new Map<string, { status: CycleStatus; notes: string | null }>();
    if (!data) return map;
    for (const day of data.days) {
      map.set(day.date, { status: day.status, notes: day.notes });
    }
    return map;
  }, [data]);

  const loadMonth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await cycleApi.getMonth(year, month);
      setData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger le cycle pour ce mois.";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  const firstOfMonth = useMemo(() => new Date(Date.UTC(year, month - 1, 1)), [year, month]);
  const lastOfMonth = useMemo(() => new Date(Date.UTC(year, month, 0)), [year, month]);
  const daysInMonth = lastOfMonth.getUTCDate();
  const startWeekday = firstOfMonth.getUTCDay() || 7; // 1 (Mon) .. 7 (Sun)

  const weeks: Array<Array<string | null>> = useMemo(() => {
    const w: Array<Array<string | null>> = [];
    let currentDay = 1;
    const totalCells = Math.ceil((daysInMonth + startWeekday - 1) / 7) * 7;
    for (let cell = 0; cell < totalCells; cell += 1) {
      const weekIndex = Math.floor(cell / 7);
      if (!w[weekIndex]) w[weekIndex] = [];
      const dayIndexInWeek = cell % 7;
      const absoluteDayIndex = cell + 1;
      if (absoluteDayIndex < startWeekday || currentDay > daysInMonth) {
        w[weekIndex][dayIndexInWeek] = null;
      } else {
        const dateIso = new Date(Date.UTC(year, month - 1, currentDay)).toISOString().slice(0, 10);
        w[weekIndex][dayIndexInWeek] = dateIso;
        currentDay += 1;
      }
    }
    return w;
  }, [daysInMonth, startWeekday, year, month]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const monthStats = useMemo(() => {
    const stats = { PURE: 0, MENSES: 0, SPOTTING: 0, POSTPARTUM: 0 } as Record<CycleStatus, number>;
    if (!data) return stats;
    for (const day of data.days) {
      stats[day.status] += 1;
    }
    return stats;
  }, [data]);

  const cycleDayColor = (status: CycleStatus): string => {
    if (status === 'MENSES') return 'rgba(244, 67, 54, 0.15)';
    if (status === 'SPOTTING') return 'rgba(255, 160, 0, 0.15)';
    if (status === 'POSTPARTUM') return 'rgba(156, 39, 176, 0.15)';
    return 'rgba(0,0,0,0.03)';
  };

  const handleSelectDay = useCallback(
    (dateIso: string) => {
      const existing = daysMap.get(dateIso);
      setSelectedDate(dateIso);
      setStatusDraft(existing?.status ?? 'PURE');
      setNotesDraft(existing?.notes ?? '');
    },
    [daysMap],
  );

  const handleSaveSelectedDay = useCallback(async () => {
    if (!selectedDate) return;
    setUpdating(true);
    setError(null);
    try {
      const updated = await cycleApi.upsertDay({
        date: selectedDate,
        status: statusDraft,
        notes: notesDraft.trim() ? notesDraft.trim() : null,
      });
      setData((prev) => {
        if (!prev) return prev;
        const nextDays = prev.days.filter((d) => d.date !== updated.date);
        nextDays.push(updated);
        return { ...prev, days: nextDays };
      });
      setSelectedDate(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d’enregistrer ce jour de cycle.";
      setError(message);
    } finally {
      setUpdating(false);
    }
  }, [notesDraft, selectedDate, statusDraft]);

  const monthLabel = firstOfMonth.toLocaleDateString(user.locale ?? 'fr', {
    month: 'long',
    year: 'numeric',
  });

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
          <Text style={ss.title}>Cycle & Ramadan</Text>
          <Text style={ss.subtitle}>Note tes jours de règles, spotting ou postpartum.</Text>
        </View>

        {/* Calendar card */}
        <View style={ss.card}>
          <View style={[ss.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
            <TouchableOpacity onPress={() => setMonth((prev) => (prev === 1 ? 12 : prev - 1))} style={ss.outlineBtn}>
              <Ionicons name="chevron-back" size={16} color={sc.text} />
            </TouchableOpacity>
            <Text style={ss.sectionTitle}>{monthLabel}</Text>
            <TouchableOpacity onPress={() => setMonth((prev) => (prev === 12 ? 1 : prev + 1))} style={ss.outlineBtn}>
              <Ionicons name="chevron-forward" size={16} color={sc.text} />
            </TouchableOpacity>
          </View>

          {error && <Text style={[ss.errorText, ss.mb8]}>{error}</Text>}
          {loading || !data ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator color={sc.accent} />
              <Text style={[ss.muted, { marginTop: 8 }]}>Chargement du calendrier…</Text>
            </View>
          ) : (
            <>
              <View style={[ss.row, { justifyContent: 'space-between', marginBottom: 6 }]}>
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                  <View key={`${d}-${i}`} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: sc.muted, fontSize: 11, fontWeight: '600' }}>{d}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {weeks.map((week, wIdx) =>
                  week.map((dateIso, dIdx) => {
                    if (!dateIso) {
                      return <View key={`${wIdx}-${dIdx}`} style={{ height: 34, width: `${100 / 7}%` }} />;
                    }
                    const dayNum = Number(dateIso.slice(-2));
                    const status = daysMap.get(dateIso)?.status ?? 'PURE';
                    const isToday = dateIso === todayIso;
                    return (
                      <TouchableOpacity
                        key={dateIso}
                        style={{
                          height: 34,
                          width: `${100 / 7}%`,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: cycleDayColor(status),
                          borderColor: isToday ? sc.accent : 'rgba(0,0,0,0.06)',
                          borderWidth: isToday ? 2 : 1,
                        }}
                        onPress={() => handleSelectDay(dateIso)}
                      >
                        <Text style={{ color: sc.text, fontSize: 12, fontWeight: isToday ? '700' : '400' }}>{dayNum}</Text>
                      </TouchableOpacity>
                    );
                  }),
                )}
              </View>

              {selectedDate ? (
                <View style={[ss.infoRow, { marginTop: 14, gap: 10 }]}>
                  <Text style={{ color: sc.text, fontWeight: '700', fontSize: 14 }}>{selectedDate}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {CYCLE_STATUSES.map((status) => {
                      const isActive = statusDraft === status;
                      return (
                        <TouchableOpacity key={status} style={[ss.chip, isActive && ss.chipActive]} onPress={() => setStatusDraft(status)}>
                          <Text style={[ss.chipText, isActive && ss.chipTextActive]}>{CYCLE_LABELS[status]}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={ss.label}>Notes</Text>
                  <TextInput
                    value={notesDraft}
                    onChangeText={setNotesDraft}
                    placeholder="Optionnel"
                    placeholderTextColor={sc.muted}
                    multiline
                    style={[ss.input, { minHeight: 56, textAlignVertical: 'top' }]}
                  />

                  <View style={[ss.row, { gap: 10 }]}>
                    <TouchableOpacity style={[ss.primaryBtn, { flex: 1 }, updating && { opacity: 0.5 }]} onPress={() => void handleSaveSelectedDay()} disabled={updating}>
                      <Text style={ss.primaryBtnText}>{updating ? 'Enregistrement…' : 'Enregistrer'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={ss.outlineBtn} onPress={() => setSelectedDate(null)} disabled={updating}>
                      <Text style={ss.outlineBtnText}>Annuler</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                <LegendDot color="rgba(0,0,0,0.03)" label={`Pur (${monthStats.PURE})`} />
                <LegendDot color="rgba(244,67,54,0.15)" label={`Règles (${monthStats.MENSES})`} />
                <LegendDot color="rgba(255,160,0,0.15)" label={`Spotting (${monthStats.SPOTTING})`} />
                <LegendDot color="rgba(156,39,176,0.15)" label={`Postpartum (${monthStats.POSTPARTUM})`} />
              </View>
              <Text style={[ss.muted, { marginTop: 4, fontSize: 12 }]}>
                Ce mois-ci : {monthStats.MENSES} jours de règles, {monthStats.SPOTTING} de spotting, {monthStats.POSTPARTUM}{' '}
                en postpartum.
              </Text>
              {updating && <Text style={[ss.muted, { marginTop: 4, fontSize: 12 }]}>Mise à jour en cours…</Text>}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 14, height: 14, borderRadius: 999, borderColor: 'rgba(0,0,0,0.12)', borderWidth: 1, backgroundColor: color }} />
      <Text style={{ color: sc.textSoft, fontSize: 11 }}>{label}</Text>
    </View>
  );
}
