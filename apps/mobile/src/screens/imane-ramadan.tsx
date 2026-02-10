import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '@oumoul/ui';
import { FastingLogStatus } from '@oumoul/api';
import type {
  AuthUser,
  CycleStatus,
  RamadanDaySummary,
  RamadanSummaryResponse,
} from '@oumoul/api';
import { cycleApi, ramadanApi } from '../api';

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
  FASTED: 'rgba(27, 94, 32, 0.5)',
  EXEMPTION: 'rgba(106, 27, 154, 0.5)',
  MISSED: 'rgba(183, 28, 28, 0.5)',
  MADE_UP: 'rgba(13, 71, 161, 0.5)',
};

const CYCLE_LABELS: Record<CycleStatus, string> = {
  PURE: 'Pure',
  MENSES: 'Règles',
  SPOTTING: 'Spotting',
  POSTPARTUM: 'Post-partum',
};

const CYCLE_BADGE_COLORS: Record<CycleStatus, string> = {
  PURE: 'rgba(255,255,255,0.15)',
  MENSES: 'rgba(183,28,28,0.35)',
  SPOTTING: 'rgba(255,143,0,0.4)',
  POSTPARTUM: 'rgba(106,27,154,0.4)',
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

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <ScrollView contentContainerStyle={{ paddingVertical: 32, paddingHorizontal: 20 }}>
        <View className="mb-xl">
          <Text className="text-neutral-100 text-xs tracking-[4px] uppercase">{user.firstName || user.email}</Text>
          <Text className="text-neutral-100 text-3xl font-bold mt-sm">Ramadan & cycle</Text>
          <Text className="text-neutral-100/80 text-base leading-6 mt-xs">
            Enregistre ton statut de jeûne et ton cycle, directement depuis ton calendrier.
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-sm mb-lg">
          <View className="bg-white/10 rounded-xl px-md py-sm" style={{ minWidth: 170 }}>
            <Text className="text-neutral-100/70 text-xs tracking-[2px] uppercase">Aujourd’hui</Text>
            <Text className="text-neutral-100 font-semibold mt-[2px]">{todayStatusText}</Text>
          </View>
          <View className="bg-white/10 rounded-xl px-md py-sm" style={{ minWidth: 170 }}>
            <Text className="text-neutral-100/70 text-xs tracking-[2px] uppercase">Avancement</Text>
            <Text className="text-neutral-100 font-semibold mt-[2px]">
              {progressText || 'Pas encore de données'}
            </Text>
          </View>
          <View className="bg-white/10 rounded-xl px-md py-sm" style={{ minWidth: 170 }}>
            <Text className="text-neutral-100/70 text-xs tracking-[2px] uppercase">Rattrapages restants</Text>
            <Text className="text-neutral-100 font-semibold mt-[2px]">{outstandingMakeupDays}</Text>
          </View>
        </View>

        <View className="flex-row gap-sm mt-md flex-wrap">
          <TouchableOpacity className="border border-white/60 rounded-md px-md py-xs" onPress={onBack}>
            <Text style={{ color: colors.neutral100, fontWeight: '600' }}>Retour au tableau de bord</Text>
          </TouchableOpacity>
          <View className="flex-row gap-xs items-center">
            <TouchableOpacity
              className="px-md py-xs rounded-full border border-white/40 bg-white/10"
              onPress={() => setYear((prev) => prev - 1)}
            >
              <Text className="text-neutral-100 text-xs">←</Text>
            </TouchableOpacity>
            <Text className="text-neutral-100 font-semibold">{year}</Text>
            <TouchableOpacity
              className="px-md py-xs rounded-full border border-white/40 bg-white/10"
              onPress={() => setYear((prev) => prev + 1)}
            >
              <Text className="text-neutral-100 text-xs">→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error && <Text className="text-[#ffb4ab] text-sm mb-sm">{error}</Text>}
        {info && <Text className="text-neutral-100/80 text-sm mb-sm">{info}</Text>}

        <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl gap-md">
          <View className="flex-row flex-wrap gap-sm items-center justify-between">
            <Text className="text-neutral-100 font-semibold">Résumé</Text>
            <Text className="text-neutral-100/80 text-xs">À rattraper : {outstandingMakeupDays}</Text>
          </View>
          <View className="flex-row flex-wrap gap-sm">
            {FASTING_STATUS_ORDER.map((status) => (
              <View key={status} className="bg-white/10 rounded-lg px-md py-sm">
                <Text className="text-neutral-100 uppercase text-xs tracking-[2px]">{FASTING_STATUS_LABELS[status]}</Text>
                <Text className="text-neutral-100 text-xl font-semibold">{statusCounts[status] ?? 0}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl gap-md">
          <Text className="text-neutral-100 font-semibold">Calendrier</Text>
          {loading ? (
            <View className="items-center mt-sm">
              <ActivityIndicator color={colors.neutral100} />
              <Text className="text-neutral-100 mt-xs text-sm">Chargement du calendrier…</Text>
            </View>
          ) : days.length === 0 ? (
            <Text className="text-neutral-100/70">Aucun jour de Ramadan trouvé pour cette année.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {days.map((day) => {
                const dayNum = new Date(`${day.date}T00:00:00.000Z`).getUTCDate();
                const isSelected = day.date === selectedDate;
                const fastBg = day.fastStatus ? FASTING_COLORS[day.fastStatus] : 'rgba(0,0,0,0.25)';
                const cycleBadgeBg = day.cycleStatus ? CYCLE_BADGE_COLORS[day.cycleStatus] : null;

                return (
                  <TouchableOpacity
                    key={day.date}
                    style={{
                      width: `${100 / columns}%`,
                      padding: 4,
                    }}
                    onPress={() => handleSelectDay(day)}
                  >
                    <View
                      style={{
                        minHeight: 56,
                        borderRadius: 12,
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? 'rgba(212,175,55,0.9)' : 'rgba(255,255,255,0.18)',
                        backgroundColor: fastBg,
                        padding: 8,
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text className="text-neutral-100 font-semibold">{dayNum}</Text>
                      {cycleBadgeBg && day.cycleStatus && (
                        <View
                          style={{
                            alignSelf: 'flex-start',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 999,
                            backgroundColor: cycleBadgeBg,
                          }}
                        >
                          <Text className="text-neutral-100 text-[10px]" style={{ letterSpacing: 1 }}>
                            {CYCLE_LABELS[day.cycleStatus] ?? day.cycleStatus}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {selectedDay && (
          <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl gap-md">
            <View className="flex-row justify-between items-center">
              <Text className="text-neutral-100 text-lg font-semibold">{formatDate(selectedDay.date)}</Text>
              <TouchableOpacity
                className="px-md py-xs rounded-full border border-white/40 bg-white/10"
                onPress={() => setSelectedDate(null)}
              >
                <Text className="text-neutral-100 text-xs">Fermer</Text>
              </TouchableOpacity>
            </View>

            <View className="gap-sm">
              <Text className="text-neutral-100 font-semibold">Jeûne</Text>
              <View className="flex-row flex-wrap gap-xs">
                {FASTING_STATUS_ORDER.map((status) => {
                  const isActive = fastStatusDraft === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      className="px-md py-xs rounded-full border border-white/40"
                      style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.18)' : 'transparent' }}
                      onPress={() => setFastStatusDraft(status)}
                    >
                      <Text className="text-neutral-100 text-xs" style={{ fontWeight: '600' }}>
                        {FASTING_STATUS_LABELS[status]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-neutral-100 font-semibold mt-sm">Cycle</Text>
              <View className="flex-row flex-wrap gap-xs">
                {CYCLE_STATUSES.map((status) => {
                  const isActive = cycleStatusDraft === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      className="px-md py-xs rounded-full border border-white/40"
                      style={{ backgroundColor: isActive ? CYCLE_BADGE_COLORS[status] : 'transparent' }}
                      onPress={() => setCycleStatusDraft(status)}
                    >
                      <Text className="text-neutral-100 text-xs" style={{ fontWeight: '600' }}>
                        {CYCLE_LABELS[status]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-neutral-100 font-semibold mt-sm">Raison (facultatif)</Text>
              <TextInput
                className="bg-white/10 text-neutral-100 rounded-lg px-md py-sm"
                placeholder="Ex : règles, malade, voyage…"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={notesDraft}
                onChangeText={setNotesDraft}
                multiline
              />

              <View className="flex-row flex-wrap gap-sm mt-sm">
                <TouchableOpacity
                  className="bg-neutral-100 rounded-lg py-sm px-md items-center"
                  disabled={savingFasting || !fastStatusDraft}
                  onPress={() => void handleSaveFasting()}
                  style={{ opacity: savingFasting || !fastStatusDraft ? 0.7 : 1 }}
                >
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>
                    {savingFasting ? 'Enregistrement…' : 'Enregistrer jeûne'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="border border-white/50 rounded-lg py-sm px-md items-center"
                  disabled={savingCycle || !cycleStatusDraft}
                  onPress={() => void handleSaveCycle()}
                  style={{ opacity: savingCycle || !cycleStatusDraft ? 0.7 : 1 }}
                >
                  <Text style={{ color: colors.neutral100, fontWeight: '700' }}>
                    {savingCycle ? 'Mise à jour…' : 'Enregistrer cycle'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
