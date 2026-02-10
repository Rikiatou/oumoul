import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@oumoul/ui';
import type { AuthUser, ImaneProgramItems, ImaneProgramDayResponse } from '@oumoul/api';
import { imaneProgramApi } from '../api';

const DAILY_ITEMS: Array<{
  id: keyof ImaneProgramItems;
  title: string;
  description: string;
}> = [
  {
    id: 'coranTilawa',
    title: 'Lecture de Coran',
    description: 'Lire un passage (même quelques versets) avec présence du cœur.',
  },
  {
    id: 'dhikrMatinSoir',
    title: 'Dhikr matin/soir',
    description: 'Réciter quelques adhkar authentiques du matin ou du soir.',
  },
  {
    id: 'duasPersonnelles',
    title: 'Duas personnelles',
    description: 'Prendre quelques minutes pour invoquer Allah pour tes besoins.',
  },
  {
    id: 'sadaqa',
    title: 'Sadaqa ou service',
    description: "Un geste de sadaqa ou de service envers quelqu’un de ton entourage.",
  },
  {
    id: 'autreBienfait',
    title: 'Un bienfait à noter',
    description: 'Noter un bienfait d’Allah pour renforcer la gratitude.',
  },
];

export function ImaneProgramScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const [selectedDateIso, setSelectedDateIso] = useState<string>(new Date().toISOString().slice(0, 10));
  const [day, setDay] = useState<ImaneProgramDayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completedCount = useMemo(() => {
    if (!day) return 0;
    const items = day.items;
    return (
      Number(items.coranTilawa) +
      Number(items.dhikrMatinSoir) +
      Number(items.duasPersonnelles) +
      Number(items.sadaqa) +
      Number(items.autreBienfait)
    );
  }, [day]);

  const readableDate = useMemo(() => {
    const d = new Date(`${selectedDateIso}T00:00:00.000Z`);
    try {
      return d.toLocaleDateString(user.locale ?? 'fr', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      });
    } catch {
      return selectedDateIso;
    }
  }, [selectedDateIso, user.locale]);

  const loadForDate = useCallback(
    async (dateIso: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await imaneProgramApi.getProgram(dateIso);
        setDay(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Impossible de charger ton programme du jour.';
        setError(message);
        setDay(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadForDate(selectedDateIso);
  }, [loadForDate, selectedDateIso]);

  const toggleItem = useCallback(
    async (key: keyof ImaneProgramItems) => {
      if (!day) return;
      const nextItems: ImaneProgramItems = { ...day.items, [key]: !day.items[key] };
      const nextDay: ImaneProgramDayResponse = { ...day, items: nextItems };
      setDay(nextDay);
      setSaving(true);
      setError(null);
      try {
        await imaneProgramApi.updateProgram({ date: day.date, items: nextItems });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible d’enregistrer le programme.";
        setError(message);
      } finally {
        setSaving(false);
      }
    },
    [day],
  );

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <ScrollView contentContainerStyle={{ paddingVertical: 32, paddingHorizontal: 20 }}>
        <View className="mb-xl">
          <Text className="text-neutral-100 text-xs tracking-[4px] uppercase">{user.firstName || user.email}</Text>
          <Text className="text-neutral-100 text-3xl font-bold mt-sm">Programme Imane du jour</Text>
          <Text className="text-neutral-100/80 text-base leading-6 mt-xs">
            Quelques actions simples pour nourrir ton cœur aujourd’hui, que tu sois en période de jeûne, de règles ou en dehors
            de Ramadan.
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

        {loading ? (
          <View className="items-center mt-lg">
            <ActivityIndicator color={colors.neutral100} />
            <Text className="text-neutral-100 mt-sm">Chargement…</Text>
          </View>
        ) : !day ? (
          <Text className="text-[#ffb4ab]">{error ?? 'Aucune donnée pour ce jour.'}</Text>
        ) : (
          <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl gap-md">
            <View className="gap-xs mb-sm">
              <Text className="text-neutral-100 text-lg font-semibold">
                Checklist du {readableDate}
              </Text>
              <Text className="text-neutral-100/80 text-sm">
                Résumé : {completedCount} / 5 objectifs complétés. {saving ? 'Enregistrement…' : ''}
              </Text>
              <Text className="text-neutral-100/70 text-xs">
                Appuie sur une action pour la cocher ou la décocher pour cette journée.
              </Text>
              {error && <Text className="text-[#ffb4ab] text-sm mt-xs">{error}</Text>}
            </View>

            <View className="flex-row flex-wrap gap-xs mb-sm">
              {[{ label: 'J-2', offset: -2 }, { label: 'J-1', offset: -1 }, { label: "Aujourd’hui", offset: 0 }].map(
                (entry) => {
                  const date = new Date();
                  date.setDate(date.getDate() + entry.offset);
                  const iso = date.toISOString().slice(0, 10);
                  const isActive = iso === selectedDateIso;
                  return (
                    <TouchableOpacity
                      key={entry.label}
                      className={`px-md py-xs rounded-full border ${
                        isActive ? 'bg-neutral-100 border-transparent' : 'border-white/40'
                      }`}
                      onPress={() => setSelectedDateIso(iso)}
                    >
                      <Text
                        style={{
                          color: isActive ? colors.primary : colors.neutral100,
                          fontWeight: '600',
                        }}
                      >
                        {entry.label}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <View className="gap-sm">
              {DAILY_ITEMS.map((item) => {
                const checked = day.items[item.id];
                return (
                  <TouchableOpacity
                    key={item.id}
                    className="bg-white/5 rounded-xl px-md py-sm flex-row gap-sm items-start"
                    onPress={() => void toggleItem(item.id)}
                  >
                    <View
                      className="w-5 h-5 rounded-full border items-center justify-center mt-1"
                      style={{
                        borderColor: 'rgba(255,255,255,0.7)',
                        backgroundColor: checked ? colors.neutral100 : 'rgba(0,0,0,0.2)',
                      }}
                    >
                      {checked && (
                        <View
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: colors.primary }}
                        />
                      )}
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="text-neutral-100 text-base font-semibold">{item.title}</Text>
                      <Text className="text-neutral-100/80 text-sm">{item.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
