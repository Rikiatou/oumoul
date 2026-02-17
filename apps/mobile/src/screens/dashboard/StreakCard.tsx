import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { palette } from '../../theme';

const PRAYER_LOGS_KEY = 'oumoul_prayer_logs';
const TASBIH_SESSIONS_KEY = 'oumoul_tasbih_sessions';

interface StreakData {
  prayerStreak: number;
  dhikrStreak: number;
  todayPrayers: number;
  todayDhikr: number;
}

function calcPrayerStreak(logs: Record<string, Record<string, string>>): { streak: number; today: number } {
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayLog = logs[todayIso] ?? {};
  const todayCount = Object.keys(todayLog).length;

  let streak = 0;
  const d = new Date();
  while (true) {
    const iso = d.toISOString().slice(0, 10);
    const day = logs[iso];
    if (day && Object.keys(day).length === 5) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return { streak, today: todayCount };
}

function calcDhikrStreak(sessions: Array<{ completedAt: string; count: number }>): { streak: number; today: number } {
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayTotal = sessions
    .filter((s) => s.completedAt.startsWith(todayIso))
    .reduce((sum, s) => sum + s.count, 0);

  const dates = new Set(sessions.map((s) => s.completedAt.slice(0, 10)));
  let streak = 0;
  const d = new Date();
  while (true) {
    const iso = d.toISOString().slice(0, 10);
    if (dates.has(iso)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return { streak, today: todayTotal };
}

export function StreakCard() {
  const [data, setData] = useState<StreakData>({ prayerStreak: 0, dhikrStreak: 0, todayPrayers: 0, todayDhikr: 0 });

  useEffect(() => {
    Promise.all([
      SecureStore.getItemAsync(PRAYER_LOGS_KEY),
      SecureStore.getItemAsync(TASBIH_SESSIONS_KEY),
    ]).then(([prayerRaw, dhikrRaw]: [string | null, string | null]) => {
      let prayerStreak = 0, todayPrayers = 0, dhikrStreak = 0, todayDhikr = 0;

      if (prayerRaw) {
        try {
          const logs = JSON.parse(prayerRaw);
          const result = calcPrayerStreak(logs);
          prayerStreak = result.streak;
          todayPrayers = result.today;
        } catch {}
      }

      if (dhikrRaw) {
        try {
          const sessions = JSON.parse(dhikrRaw);
          const result = calcDhikrStreak(sessions);
          dhikrStreak = result.streak;
          todayDhikr = result.today;
        } catch {}
      }

      setData({ prayerStreak, dhikrStreak, todayPrayers, todayDhikr });
    }).catch(() => {});
  }, []);

  const hasAnyData = data.prayerStreak > 0 || data.dhikrStreak > 0 || data.todayPrayers > 0 || data.todayDhikr > 0;
  if (!hasAnyData) return null;

  return (
    <View style={st.card}>
      <View style={st.headerRow}>
        <Ionicons name="flame" size={18} color="#F57C00" />
        <Text style={st.title}>Tes séries</Text>
      </View>
      <View style={st.statsRow}>
        <View style={st.statItem}>
          <Text style={st.statValue}>{data.prayerStreak}</Text>
          <Text style={st.statLabel}>Prières</Text>
          <Text style={st.statSub}>{data.todayPrayers}/5 aujourd'hui</Text>
        </View>
        <View style={st.divider} />
        <View style={st.statItem}>
          <Text style={st.statValue}>{data.dhikrStreak}</Text>
          <Text style={st.statLabel}>Dhikr</Text>
          <Text style={st.statSub}>{data.todayDhikr} aujourd'hui</Text>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: palette.card, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: palette.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', color: palette.text },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: palette.primaryDark },
  statLabel: { fontSize: 12, fontWeight: '600', color: palette.text, marginTop: 2 },
  statSub: { fontSize: 10, color: palette.muted, marginTop: 2 },
  divider: { width: 1, height: 40, backgroundColor: palette.border },
});
