import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AuthUser, ImaneProgramItems, ImaneProgramDayResponse } from '@oumoul/api';
import { imaneProgramApi } from '../api';
import { palette } from '../theme';
import * as SecureStore from 'expo-secure-store';
import { scheduleImaneProgramReminder, cancelReminder } from '../push-notifications';

const DAILY_ITEMS: Array<{
  id: keyof ImaneProgramItems;
  title: string;
  description: string;
  icon: string;
  color: string;
  bg: string;
}> = [
  { id: 'coranTilawa', title: 'Lecture de Coran', description: 'Lire un passage avec présence du cœur.', icon: 'book-outline', color: '#2E7D32', bg: '#E8F5E9' },
  { id: 'dhikrMatinSoir', title: 'Dhikr matin/soir', description: 'Réciter les adhkar du matin ou du soir.', icon: 'sparkles-outline', color: '#1565C0', bg: '#E3F2FD' },
  { id: 'duasPersonnelles', title: 'Duas personnelles', description: 'Invoquer Allah pour tes besoins.', icon: 'hand-left-outline', color: '#7B1FA2', bg: '#F3E5F5' },
  { id: 'sadaqa', title: 'Sadaqa ou service', description: 'Un geste envers ton entourage.', icon: 'heart-outline', color: '#C62828', bg: '#FFEBEE' },
  { id: 'autreBienfait', title: 'Bienfait à noter', description: 'Renforcer la gratitude envers Allah.', icon: 'star-outline', color: '#E65100', bg: '#FFF3E0' },
];

const MOTIVATIONAL = [
  'Chaque petit pas compte auprès d\'Allah.',
  'La constance est plus aimée qu\'une grande action isolée.',
  'Masha Allah, continue sur cette lancée !',
  'Ton cœur se nourrit de chaque effort.',
  'Allah voit tes efforts, même les plus petits.',
];

const IMANE_REMINDER_KEY = 'oumoul.imaneProgramReminder';

export function ImaneProgramScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const [selectedDateIso, setSelectedDateIso] = useState<string>(new Date().toISOString().slice(0, 10));
  const [day, setDay] = useState<ImaneProgramDayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

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

  const progressPercent = useMemo(() => Math.round((completedCount / 5) * 100), [completedCount]);

  const motivationalMessage = useMemo(() => {
    if (completedCount === 5) return 'Masha Allah ! Programme complété !';
    if (completedCount >= 3) return MOTIVATIONAL[2];
    if (completedCount >= 1) return MOTIVATIONAL[0];
    return MOTIVATIONAL[1];
  }, [completedCount]);

  const readableDate = useMemo(() => {
    const d = new Date(`${selectedDateIso}T00:00:00.000Z`);
    try {
      return d.toLocaleDateString(user.locale ?? 'fr', { weekday: 'long', day: '2-digit', month: 'long' });
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

  // Load persisted reminder state
  useEffect(() => {
    SecureStore.getItemAsync(IMANE_REMINDER_KEY).then((v) => {
      if (v === 'true') setReminderEnabled(true);
    }).catch(() => {});
  }, []);

  const toggleReminder = useCallback(async () => {
    try {
      if (reminderEnabled) {
        await cancelReminder('imane-program');
        await SecureStore.setItemAsync(IMANE_REMINDER_KEY, 'false');
        setReminderEnabled(false);
        setReminderToast('Rappel désactivé');
      } else {
        await scheduleImaneProgramReminder(20, 0);
        await SecureStore.setItemAsync(IMANE_REMINDER_KEY, 'true');
        setReminderEnabled(true);
        setReminderToast('✅ Rappel activé chaque jour à 20h00');
      }
    } catch (e) {
      setReminderToast(e instanceof Error ? e.message : 'Erreur notification');
    }
    setTimeout(() => setReminderToast(null), 3000);
  }, [reminderEnabled]);

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
        const message = err instanceof Error ? err.message : "Impossible d'enregistrer le programme.";
        setError(message);
      } finally {
        setSaving(false);
      }
    },
    [day],
  );

  const insets = useSafeAreaInsets();

  return (
    <View style={[ip.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={ip.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={ip_c.accent} />
        </TouchableOpacity>
        <Text style={ip.topTitle}>Programme Imane</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="notifications-outline" size={16} color={reminderEnabled ? ip_c.accent : ip_c.muted} />
          <Switch
            value={reminderEnabled}
            onValueChange={() => void toggleReminder()}
            trackColor={{ true: ip_c.accent, false: 'rgba(0,0,0,0.1)' }}
            thumbColor={reminderEnabled ? '#fff' : '#ccc'}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>
      </View>
      {reminderToast ? (
        <View style={ip.toast}>
          <Text style={ip.toastText}>{reminderToast}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Day selector */}
        <View style={ip.dayRow}>
          {[{ label: 'Avant-hier', offset: -2 }, { label: 'Hier', offset: -1 }, { label: "Aujourd'hui", offset: 0 }].map(
            (entry) => {
              const date = new Date();
              date.setDate(date.getDate() + entry.offset);
              const iso = date.toISOString().slice(0, 10);
              const isActive = iso === selectedDateIso;
              return (
                <TouchableOpacity key={entry.label} style={[ip.dayChip, isActive && ip.dayChipActive]} onPress={() => setSelectedDateIso(iso)}>
                  <Text style={[ip.dayChipText, isActive && ip.dayChipTextActive]}>{entry.label}</Text>
                </TouchableOpacity>
              );
            },
          )}
        </View>

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={ip_c.accent} />
          </View>
        ) : !day ? (
          <Text style={ip.errorText}>{error ?? 'Aucune donnée pour ce jour.'}</Text>
        ) : (
          <>
            {/* Progress hero */}
            <View style={ip.heroCard}>
              <View style={ip.progressCircle}>
                <Text style={ip.progressNum}>{completedCount}</Text>
                <Text style={ip.progressDenom}>/5</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={ip.heroDate}>{readableDate}</Text>
                <View style={ip.progressTrack}>
                  <View style={[ip.progressFill, { width: `${progressPercent}%` }]} />
                </View>
                <Text style={ip.heroMotivation}>{motivationalMessage}</Text>
              </View>
            </View>

            {error && <Text style={ip.errorText}>{error}</Text>}
            {saving && <Text style={ip.savingText}>Enregistrement…</Text>}

            {/* Checklist */}
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {DAILY_ITEMS.map((item) => {
                const checked = day.items[item.id];
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[ip.checkCard, checked && { backgroundColor: item.bg, borderColor: item.color + '30' }]}
                    onPress={() => void toggleItem(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[ip.checkIcon, { backgroundColor: checked ? item.color : 'rgba(0,0,0,0.04)' }]}>
                      {checked ? (
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      ) : (
                        <Ionicons name={item.icon as any} size={18} color={item.color} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[ip.checkTitle, checked && { color: item.color }]}>{item.title}</Text>
                      <Text style={ip.checkDesc}>{item.description}</Text>
                    </View>
                    <View style={[ip.checkBox, checked && { backgroundColor: item.color, borderColor: item.color }]}>
                      {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const ip_c = {
  bg: palette.bgAlt,
  card: palette.card,
  border: palette.border,
  text: palette.text,
  textSoft: palette.textSoft,
  muted: palette.muted,
  accent: palette.primaryDark,
  accentLight: palette.accentLight,
};

const ip = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ip_c.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: ip_c.border },
  topTitle: { fontSize: 20, fontWeight: '700', color: ip_c.text },

  dayRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  dayChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.04)' },
  dayChipActive: { backgroundColor: ip_c.accent },
  dayChipText: { fontSize: 12, fontWeight: '700', color: ip_c.text },
  dayChipTextActive: { color: '#fff' },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ip_c.card,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: ip_c.border,
  },
  progressCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ip_c.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  progressNum: { fontSize: 28, fontWeight: '800', color: ip_c.accent },
  progressDenom: { fontSize: 14, fontWeight: '600', color: ip_c.muted, marginTop: 8 },
  heroDate: { fontSize: 14, fontWeight: '600', color: ip_c.text, textTransform: 'capitalize', marginBottom: 8 },
  progressTrack: { height: 6, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: ip_c.accent, borderRadius: 3 },
  heroMotivation: { fontSize: 12, color: ip_c.muted, marginTop: 6, fontStyle: 'italic' },

  errorText: { color: '#C62828', fontSize: 13, paddingHorizontal: 16, marginTop: 8 },
  savingText: { color: ip_c.accent, fontSize: 12, paddingHorizontal: 16, marginTop: 4, marginBottom: 4 },

  checkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ip_c.card,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: ip_c.border,
  },
  checkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTitle: { fontSize: 14, fontWeight: '700', color: ip_c.text },
  checkDesc: { fontSize: 12, color: ip_c.muted, marginTop: 2 },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toast: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#1B3A2D',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
