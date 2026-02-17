import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AuthUser, CycleMonthResponse, CycleStatus } from '@oumoul/api';
import { cycleApi } from '../api';
import { palette } from '../theme';

const CYCLE_STATUSES: CycleStatus[] = ['PURE', 'MENSES', 'SPOTTING', 'POSTPARTUM'];
const CYCLE_LABELS: Record<CycleStatus, string> = {
  PURE: 'Pure',
  MENSES: 'Règles',
  SPOTTING: 'Spotting',
  POSTPARTUM: 'Post-partum',
};

const CYCLE_ICONS: Record<CycleStatus, string> = {
  PURE: 'checkmark-circle-outline',
  MENSES: 'water-outline',
  SPOTTING: 'ellipse-outline',
  POSTPARTUM: 'heart-half-outline',
};

const CYCLE_COLORS: Record<CycleStatus, string> = {
  PURE: '#9E9E9E',
  MENSES: '#C62828',
  SPOTTING: '#E65100',
  POSTPARTUM: '#7B1FA2',
};

const CYCLE_BG: Record<CycleStatus, string> = {
  PURE: '#FAFAFA',
  MENSES: '#FFEBEE',
  SPOTTING: '#FFF3E0',
  POSTPARTUM: '#F3E5F5',
};

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function ImaneCycleScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth() + 1);
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
  const startWeekday = firstOfMonth.getUTCDay() || 7;

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
      const message = err instanceof Error ? err.message : "Impossible d'enregistrer ce jour de cycle.";
      setError(message);
    } finally {
      setUpdating(false);
    }
  }, [notesDraft, selectedDate, statusDraft]);

  const monthLabel = firstOfMonth.toLocaleDateString(user.locale ?? 'fr', {
    month: 'long',
    year: 'numeric',
  });

  const formatSelectedDate = useCallback(
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

  const prevMonth = useCallback(() => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }, [month]);

  const nextMonth = useCallback(() => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }, [month]);

  const insets = useSafeAreaInsets();

  return (
    <View style={[cy.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={cy.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={cy_c.accent} />
        </TouchableOpacity>
        <Text style={cy.topTitle}>Suivi du cycle</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Stats row */}
        <View style={cy.statsRow}>
          {CYCLE_STATUSES.map((status) => (
            <View key={status} style={[cy.statCard, { backgroundColor: CYCLE_BG[status] }]}>
              <Ionicons name={CYCLE_ICONS[status] as any} size={18} color={CYCLE_COLORS[status]} />
              <Text style={[cy.statNum, { color: CYCLE_COLORS[status] }]}>{monthStats[status]}</Text>
              <Text style={cy.statLabel}>{CYCLE_LABELS[status]}</Text>
            </View>
          ))}
        </View>

        {error && <Text style={cy.errorText}>{error}</Text>}

        {/* Calendar card */}
        <View style={cy.calCard}>
          {/* Month nav */}
          <View style={cy.monthNav}>
            <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={20} color={cy_c.muted} />
            </TouchableOpacity>
            <Text style={cy.monthLabel}>{monthLabel}</Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-forward" size={20} color={cy_c.muted} />
            </TouchableOpacity>
          </View>

          {loading || !data ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator size="large" color={cy_c.accent} />
            </View>
          ) : (
            <>
              {/* Weekday headers */}
              <View style={cy.weekdayRow}>
                {WEEKDAY_LABELS.map((d, i) => (
                  <View key={`${d}-${i}`} style={cy.weekdayCell}>
                    <Text style={cy.weekdayText}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar grid */}
              {weeks.map((week, wIdx) => (
                <View key={wIdx} style={cy.weekRow}>
                  {week.map((dateIso, dIdx) => {
                    if (!dateIso) {
                      return <View key={`${wIdx}-${dIdx}`} style={cy.dayCell} />;
                    }
                    const dayNum = Number(dateIso.slice(-2));
                    const dayData = daysMap.get(dateIso);
                    const status = dayData?.status ?? 'PURE';
                    const isToday = dateIso === todayIso;
                    const isSelected = dateIso === selectedDate;
                    const hasData = Boolean(dayData);
                    const bgColor = hasData ? CYCLE_BG[status] : cy_c.card;
                    const dotColor = hasData && status !== 'PURE' ? CYCLE_COLORS[status] : undefined;

                    return (
                      <TouchableOpacity
                        key={dateIso}
                        style={[
                          cy.dayCell,
                          { backgroundColor: bgColor },
                          isToday && cy.dayCellToday,
                          isSelected && cy.dayCellSelected,
                        ]}
                        onPress={() => handleSelectDay(dateIso)}
                        activeOpacity={0.7}
                      >
                        <Text style={[cy.dayNum, isToday && { color: cy_c.accent, fontWeight: '800' }]}>{dayNum}</Text>
                        {dotColor ? (
                          <View style={[cy.dayDot, { backgroundColor: dotColor }]} />
                        ) : (
                          <View style={{ height: 6 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              {/* Legend */}
              <View style={cy.legend}>
                {CYCLE_STATUSES.map((status) => (
                  <View key={status} style={cy.legendItem}>
                    <View style={[cy.legendDot, { backgroundColor: status === 'PURE' ? 'rgba(0,0,0,0.08)' : CYCLE_COLORS[status] }]} />
                    <Text style={cy.legendText}>{CYCLE_LABELS[status]}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Day editor */}
        {selectedDate && (
          <View style={cy.editorCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={cy.editorDate}>{formatSelectedDate(selectedDate)}</Text>
              </View>
              <TouchableOpacity style={cy.closeBtn} onPress={() => setSelectedDate(null)}>
                <Ionicons name="close" size={20} color={cy_c.muted} />
              </TouchableOpacity>
            </View>

            <Text style={cy.editorLabel}>Statut</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CYCLE_STATUSES.map((status) => {
                const isActive = statusDraft === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[cy.statusBtn, isActive && { backgroundColor: CYCLE_BG[status], borderColor: CYCLE_COLORS[status] }]}
                    onPress={() => setStatusDraft(status)}
                  >
                    <Ionicons name={CYCLE_ICONS[status] as any} size={18} color={isActive ? CYCLE_COLORS[status] : cy_c.muted} />
                    <Text style={[cy.statusBtnText, isActive && { color: CYCLE_COLORS[status], fontWeight: '700' }]}>
                      {CYCLE_LABELS[status]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={cy.editorLabel}>Notes (facultatif)</Text>
            <TextInput
              value={notesDraft}
              onChangeText={setNotesDraft}
              placeholder="Symptômes, ressentis…"
              placeholderTextColor={cy_c.muted}
              multiline
              style={cy.notesInput}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[cy.saveBtn, updating && { opacity: 0.5 }]}
                onPress={() => void handleSaveSelectedDay()}
                disabled={updating}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={cy.saveBtnText}>{updating ? 'Enregistrement…' : 'Enregistrer'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cy.cancelBtn} onPress={() => setSelectedDate(null)} disabled={updating}>
                <Text style={cy.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Monthly summary */}
        {!loading && data && (
          <View style={cy.summaryCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ionicons name="analytics-outline" size={18} color={cy_c.accent} />
              <Text style={cy.summaryTitle}>Résumé du mois</Text>
            </View>
            <Text style={cy.summaryText}>
              {monthStats.MENSES} jour{monthStats.MENSES > 1 ? 's' : ''} de règles
              {monthStats.SPOTTING > 0 ? `, ${monthStats.SPOTTING} de spotting` : ''}
              {monthStats.POSTPARTUM > 0 ? `, ${monthStats.POSTPARTUM} en post-partum` : ''}
              .
            </Text>
            {updating && <Text style={cy.updatingText}>Mise à jour en cours…</Text>}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const cy_c = {
  bg: palette.bgAlt,
  card: palette.card,
  border: palette.border,
  text: palette.text,
  textSoft: palette.textSoft,
  muted: palette.muted,
  accent: palette.primaryDark,
  accentLight: palette.accentLight,
};

const cy = StyleSheet.create({
  screen: { flex: 1, backgroundColor: cy_c.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: cy_c.border,
  },
  topTitle: { fontSize: 20, fontWeight: '700', color: cy_c.text },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 4,
  },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '600', color: cy_c.muted, textTransform: 'uppercase', letterSpacing: 0.5 },

  errorText: { color: '#C62828', fontSize: 13, paddingHorizontal: 16, marginTop: 8 },

  calCard: {
    backgroundColor: cy_c.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: cy_c.border,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthLabel: { fontSize: 16, fontWeight: '700', color: cy_c.text, textTransform: 'capitalize' },

  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekdayCell: { flex: 1, alignItems: 'center' },
  weekdayText: { fontSize: 11, fontWeight: '700', color: cy_c.muted },

  weekRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
  },
  dayCellToday: { borderWidth: 2, borderColor: '#FFC107' },
  dayCellSelected: { borderWidth: 2, borderColor: cy_c.accent },
  dayNum: { fontSize: 13, fontWeight: '500', color: cy_c.text },
  dayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: cy_c.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: cy_c.muted, fontWeight: '600' },

  editorCard: {
    backgroundColor: cy_c.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: cy_c.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  editorDate: { fontSize: 16, fontWeight: '700', color: cy_c.text, textTransform: 'capitalize' },
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
    color: cy_c.muted,
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
    borderColor: cy_c.border,
    backgroundColor: cy_c.card,
  },
  statusBtnText: { fontSize: 13, color: cy_c.textSoft },

  notesInput: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: cy_c.text,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: cy_c.border,
  },

  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cy_c.accent,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: cy_c.border,
  },
  cancelBtnText: { color: cy_c.text, fontWeight: '600', fontSize: 14 },

  summaryCard: {
    backgroundColor: cy_c.accentLight,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: cy_c.text },
  summaryText: { fontSize: 13, color: cy_c.textSoft, lineHeight: 18 },
  updatingText: { fontSize: 12, color: cy_c.muted, marginTop: 6 },
});
