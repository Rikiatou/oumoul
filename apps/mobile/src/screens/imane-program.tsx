import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@oumoul/ui';
import type { AuthUser, ImaneProgramItems, ImaneProgramDayResponse } from '@oumoul/api';
import { imaneProgramApi } from '../api';
import { sc, ss } from '../ui/theme';

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
          <Text style={ss.title}>Programme Imane</Text>
          <Text style={ss.subtitle}>Actions simples pour nourrir ton cœur aujourd'hui.</Text>
        </View>

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <ActivityIndicator color={sc.accent} />
            <Text style={[ss.muted, { marginTop: 8 }]}>Chargement…</Text>
          </View>
        ) : !day ? (
          <Text style={ss.errorText}>{error ?? 'Aucune donnée pour ce jour.'}</Text>
        ) : (
          <View style={ss.card}>
            <Text style={ss.sectionTitle}>Checklist du {readableDate}</Text>
            <Text style={ss.muted}>{completedCount} / 5 objectifs complétés{saving ? ' · Enregistrement…' : ''}</Text>
            {error && <Text style={ss.errorText}>{error}</Text>}

            {/* Day selector */}
            <View style={[ss.row, ss.gap6, ss.mb12]}>
              {[{ label: 'J-2', offset: -2 }, { label: 'J-1', offset: -1 }, { label: "Aujourd'hui", offset: 0 }].map(
                (entry) => {
                  const date = new Date();
                  date.setDate(date.getDate() + entry.offset);
                  const iso = date.toISOString().slice(0, 10);
                  const isActive = iso === selectedDateIso;
                  return (
                    <TouchableOpacity key={entry.label} style={[ss.chip, isActive && ss.chipActive]} onPress={() => setSelectedDateIso(iso)}>
                      <Text style={[ss.chipText, isActive && ss.chipTextActive]}>{entry.label}</Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            {/* Checklist items */}
            <View style={{ gap: 10 }}>
              {DAILY_ITEMS.map((item) => {
                const checked = day.items[item.id];
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[ss.infoRow, ss.row, { gap: 12, alignItems: 'flex-start' }]}
                    onPress={() => void toggleItem(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      borderWidth: 2,
                      borderColor: checked ? sc.accent : 'rgba(0,0,0,0.2)',
                      backgroundColor: checked ? sc.accent : 'transparent',
                      alignItems: 'center', justifyContent: 'center', marginTop: 2,
                    }}>
                      {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: sc.text, fontSize: 14, fontWeight: '600' }}>{item.title}</Text>
                      <Text style={{ color: sc.textSoft, fontSize: 12 }}>{item.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
