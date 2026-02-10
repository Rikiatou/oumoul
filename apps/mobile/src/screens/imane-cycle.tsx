import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@oumoul/ui';
import type { AuthUser, CycleMonthResponse, CycleStatus } from '@oumoul/api';
import { cycleApi } from '../api';

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
    if (status === 'MENSES') return 'rgba(244, 67, 54, 0.25)';
    if (status === 'SPOTTING') return 'rgba(255, 160, 0, 0.25)';
    if (status === 'POSTPARTUM') return 'rgba(156, 39, 176, 0.25)';
    return 'rgba(255,255,255,0.15)';
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

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <ScrollView contentContainerStyle={{ paddingVertical: 32, paddingHorizontal: 20 }}>
        <View className="mb-xl">
          <Text className="text-neutral-100 text-xs tracking-[4px] uppercase">{user.firstName || user.email}</Text>
          <Text className="text-neutral-100 text-3xl font-bold mt-sm">Cycle & Ramadan</Text>
          <Text className="text-neutral-100/80 text-base leading-6 mt-xs">
            Note tes jours de règles, spotting ou postpartum pour croiser ton cycle avec Ramadan et organiser ton jeûne.
          </Text>
          <View className="flex-row gap-sm mt-md">
            <TouchableOpacity
              className="border border-white/60 rounded-md px-md py-xs"
              onPress={onBack}
            >
              <Text style={{ color: colors.neutral100, fontWeight: '600' }}>Retour au tableau de bord</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl gap-md">
          <View className="flex-row justify-between items-center flex-wrap gap-sm mb-sm">
            <View className="flex-row gap-xs">
              <TouchableOpacity
                className="px-md py-xs rounded-full border border-white/40 bg-white/10"
                onPress={() => setMonth((prev) => (prev === 1 ? 12 : prev - 1))}
              >
                <Text className="text-neutral-100 text-xs">← Mois précédent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-md py-xs rounded-full border border-white/40 bg-white/10"
                onPress={() => setMonth((prev) => (prev === 12 ? 1 : prev + 1))}
              >
                <Text className="text-neutral-100 text-xs">Mois suivant →</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-neutral-100 font-semibold">{monthLabel}</Text>
          </View>

          {error && <Text className="text-[#ffb4ab] text-sm mb-xs">{error}</Text>}
          {loading || !data ? (
            <View className="items-center mt-sm">
              <ActivityIndicator color={colors.neutral100} />
              <Text className="text-neutral-100 mt-xs text-sm">Chargement du calendrier…</Text>
            </View>
          ) : (
            <>
              <View className="flex-row justify-between mb-xs">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => (
                  <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                    <Text className="text-neutral-100/80 text-xs font-semibold">{d}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {weeks.map((week, wIdx) =>
                  week.map((dateIso, dIdx) => {
                    if (!dateIso) {
                      return <View key={`${wIdx}-${dIdx}`} style={{ height: 32, width: `${100 / 7}%` }} />;
                    }
                    const dayNum = Number(dateIso.slice(-2));
                    const status = daysMap.get(dateIso)?.status ?? 'PURE';
                    return (
                      <TouchableOpacity
                        key={dateIso}
                        className="rounded-md items-center justify-center"
                        style={{
                          height: 32,
                          width: `${100 / 7}%`,
                          backgroundColor: cycleDayColor(status),
                          borderColor: dateIso === todayIso ? colors.neutral100 : 'rgba(255,255,255,0.25)',
                          borderWidth: dateIso === todayIso ? 2 : 1,
                        }}
                        onPress={() => handleSelectDay(dateIso)}
                      >
                        <Text className="text-neutral-100 text-xs">{dayNum}</Text>
                      </TouchableOpacity>
                    );
                  }),
                )}
              </View>

              {selectedDate ? (
                <View className="bg-white/10 rounded-xl px-md py-sm mt-md gap-sm">
                  <Text className="text-neutral-100 font-semibold">{selectedDate}</Text>
                  <View className="flex-row flex-wrap gap-xs">
                    {CYCLE_STATUSES.map((status) => {
                      const isActive = statusDraft === status;
                      return (
                        <TouchableOpacity
                          key={status}
                          className={`px-md py-xs rounded-lg ${isActive ? 'bg-neutral-100' : 'bg-white/10'}`}
                          onPress={() => setStatusDraft(status)}
                        >
                          <Text style={{ color: isActive ? colors.primary : colors.neutral100, fontWeight: isActive ? '700' : '600' }}>
                            {CYCLE_LABELS[status]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    className="border border-white/40 rounded-md px-md py-xs self-start"
                    onPress={() => setSelectedDate(null)}
                    disabled={updating}
                  >
                    <Text style={{ color: colors.neutral100, fontWeight: '600', opacity: updating ? 0.6 : 1 }}>Annuler</Text>
                  </TouchableOpacity>

                  <View className="gap-xs">
                    <Text className="text-neutral-100/70 text-xs">Notes</Text>
                    <View className="bg-white/10 rounded-lg px-md py-sm">
                      <TextInput
                        value={notesDraft}
                        onChangeText={setNotesDraft}
                        placeholder="Optionnel"
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        multiline
                        style={{ color: colors.neutral100, minHeight: 56, textAlignVertical: 'top' }}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    className="bg-neutral-100 rounded-lg py-sm items-center"
                    onPress={() => void handleSaveSelectedDay()}
                    disabled={updating}
                  >
                    <Text style={{ color: colors.primary, fontWeight: '700', opacity: updating ? 0.6 : 1 }}>
                      {updating ? 'Enregistrement…' : 'Enregistrer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View className="flex-row flex-wrap gap-sm mt-sm">
                <LegendDot
                  color="rgba(255,255,255,0.15)"
                  label={`Jour pur (${monthStats.PURE})`}
                />
                <LegendDot
                  color="rgba(244, 67, 54, 0.25)"
                  label={`Règles (${monthStats.MENSES})`}
                />
                <LegendDot
                  color="rgba(255, 160, 0, 0.25)"
                  label={`Spotting (${monthStats.SPOTTING})`}
                />
                <LegendDot
                  color="rgba(156, 39, 176, 0.25)"
                  label={`Postpartum (${monthStats.POSTPARTUM})`}
                />
              </View>
              <Text className="text-neutral-100/80 text-xs mt-xs">
                Ce mois-ci : {monthStats.MENSES} jours de règles, {monthStats.SPOTTING} de spotting, {monthStats.POSTPARTUM}{' '}
                en postpartum.
              </Text>
              {updating && (
                <Text className="text-neutral-100/80 text-xs mt-xs">Mise à jour en cours…</Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-xs">
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          borderColor: 'rgba(255,255,255,0.6)',
          borderWidth: 1,
          backgroundColor: color,
        }}
      />
      <Text className="text-neutral-100/80 text-xs">{label}</Text>
    </View>
  );
}
