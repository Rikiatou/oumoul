import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { palette } from '../theme';
import { awardEvent } from '../gamification/gamification-events';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayEntry {
  date: string;
  prayers: number;       // 0–5
  quranMinutes: number;  // minutes of reading
  dhikrCount: number;    // tasbih count
  sadaqa: boolean;
  fastingOptional: boolean;
  tahajjud: boolean;
}

const STORE_KEY = 'oumoul_ihsan_log';

// ─── Scoring ─────────────────────────────────────────────────────────────────

function calcScore(entry: DayEntry): number {
  let score = 0;
  score += (entry.prayers / 5) * 40;                           // 40 pts max — prayers
  score += Math.min(entry.quranMinutes / 20, 1) * 20;          // 20 pts max — 20 min Quran
  score += Math.min(entry.dhikrCount / 100, 1) * 15;           // 15 pts max — 100 dhikr
  score += entry.sadaqa ? 10 : 0;                              // 10 pts — sadaqa
  score += entry.fastingOptional ? 10 : 0;                     // 10 pts — nafl fast
  score += entry.tahajjud ? 5 : 0;                             // 5 pts — tahajjud
  return Math.round(score);
}

function scoreLabel(score: number): { label: string; color: string; emoji: string } {
  if (score >= 90) return { label: 'Excellent — Ihsan', color: '#1B5E20', emoji: '🌟' };
  if (score >= 70) return { label: 'Très bien', color: '#2E7D32', emoji: '✅' };
  if (score >= 50) return { label: 'Bien', color: '#F57F17', emoji: '📈' };
  if (score >= 30) return { label: 'À améliorer', color: '#E65100', emoji: '💪' };
  return { label: 'Recommence !', color: '#B71C1C', emoji: '🔄' };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function IhsanModeScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [log, setLog] = useState<DayEntry[]>([]);
  const progressAnim = useMemo(() => new Animated.Value(0), []);

  const todayIso = new Date().toISOString().slice(0, 10);

  const todayEntry = useMemo(
    () => log.find((e) => e.date === todayIso) ?? {
      date: todayIso,
      prayers: 0,
      quranMinutes: 0,
      dhikrCount: 0,
      sadaqa: false,
      fastingOptional: false,
      tahajjud: false,
    },
    [log, todayIso]
  );

  const todayScore = useMemo(() => calcScore(todayEntry), [todayEntry]);
  const scoreInfo = useMemo(() => scoreLabel(todayScore), [todayScore]);

  // Load persisted log
  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY).then((v) => {
      if (v) setLog(JSON.parse(v));
    });
  }, []);

  // Animate score bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: todayScore / 100,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [todayScore, progressAnim]);

  const updateToday = useCallback(async (patch: Partial<DayEntry>) => {
    setLog((prev) => {
      const existing = prev.find((e) => e.date === todayIso);
      const updated = existing
        ? prev.map((e) => e.date === todayIso ? { ...e, ...patch } : e)
        : [...prev, { ...todayEntry, ...patch }];
      SecureStore.setItemAsync(STORE_KEY, JSON.stringify(updated));
      // Award ihsan gamification events based on score
      const merged = { ...todayEntry, ...patch };
      const numericScore =
        (merged.prayers as number ?? 0) * 10 +
        Math.min((merged.quranMinutes as number ?? 0), 20) +
        Math.min((merged.dhikrCount as number ?? 0) / 10, 20) +
        (merged.sadaqa ? 15 : 0) +
        (merged.fastingOptional ? 20 : 0) +
        (merged.tahajjud ? 15 : 0);
      if (numericScore >= 90) void awardEvent('ihsan_90');
      else if (numericScore >= 50) void awardEvent('ihsan_50');
      return updated;
    });
  }, [todayIso, todayEntry]);

  // Past 7 days for chart
  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const iso = d.toISOString().slice(0, 10);
      const entry = log.find((e) => e.date === iso);
      return { iso, score: entry ? calcScore(entry) : 0, day: d.toLocaleDateString('fr', { weekday: 'short' }) };
    });
  }, [log]);

  const weekAvg = useMemo(
    () => Math.round(week.reduce((s, d) => s + d.score, 0) / 7),
    [week]
  );

  const streak = useMemo(() => {
    let s = 0;
    const d = new Date();
    while (true) {
      const iso = d.toISOString().slice(0, 10);
      const entry = log.find((e) => e.date === iso);
      if (entry && calcScore(entry) >= 50) { s++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return s;
  }, [log]);

  return (
    <ScrollView style={[ih.screen, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={ih.header}>
        <BackButton onPress={onBack} />
        <Text style={ih.headerTitle}>Mode Ihsan</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Score du jour */}
      <View style={ih.scoreCard}>
        <Text style={ih.scoreDateLabel}>{new Date().toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        <Text style={ih.scoreEmoji}>{scoreInfo.emoji}</Text>
        <Text style={[ih.scoreValue, { color: scoreInfo.color }]}>{todayScore}<Text style={ih.scoreSuffix}>/100</Text></Text>
        <Text style={[ih.scoreLabel, { color: scoreInfo.color }]}>{scoreInfo.label}</Text>

        {/* Progress bar */}
        <View style={ih.barBg}>
          <Animated.View style={[ih.barFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: scoreInfo.color }]} />
        </View>

        {/* Stats row */}
        <View style={ih.statsRow}>
          <View style={ih.stat}>
            <Ionicons name="flame" size={16} color="#FF7043" />
            <Text style={ih.statVal}>{streak}</Text>
            <Text style={ih.statLbl}>Jours</Text>
          </View>
          <View style={ih.stat}>
            <Ionicons name="trending-up" size={16} color={palette.primaryDark} />
            <Text style={ih.statVal}>{weekAvg}</Text>
            <Text style={ih.statLbl}>Moy. semaine</Text>
          </View>
        </View>
      </View>

      {/* Saisie du jour */}
      <Text style={ih.sectionTitle}>Aujourd'hui — saisir mes actes</Text>

      {/* Prières */}
      <View style={ih.inputCard}>
        <View style={ih.inputRow}>
          <Ionicons name="time" size={20} color={palette.primaryDark} />
          <Text style={ih.inputLabel}>Prières accomplies</Text>
          <Text style={ih.inputValue}>{todayEntry.prayers}/5</Text>
        </View>
        <View style={ih.prayerBtns}>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              style={[ih.prayerBtn, todayEntry.prayers >= n && n > 0 && { backgroundColor: palette.primaryDark }]}
              onPress={() => void updateToday({ prayers: n })}
            >
              <Text style={[ih.prayerBtnText, todayEntry.prayers >= n && n > 0 && { color: '#fff' }]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quran minutes */}
      <View style={ih.inputCard}>
        <View style={ih.inputRow}>
          <Ionicons name="book" size={20} color="#2E7D32" />
          <Text style={ih.inputLabel}>Coran lu (minutes)</Text>
          <Text style={ih.inputValue}>{todayEntry.quranMinutes} min</Text>
        </View>
        <View style={ih.stepRow}>
          {[0, 5, 10, 15, 20, 30, 45, 60].map((n) => (
            <TouchableOpacity
              key={n}
              style={[ih.stepBtn, todayEntry.quranMinutes === n && { backgroundColor: '#2E7D32', borderColor: '#2E7D32' }]}
              onPress={() => void updateToday({ quranMinutes: n })}
            >
              <Text style={[ih.stepBtnText, todayEntry.quranMinutes === n && { color: '#fff' }]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Dhikr */}
      <View style={ih.inputCard}>
        <View style={ih.inputRow}>
          <Ionicons name="sparkles" size={20} color="#1565C0" />
          <Text style={ih.inputLabel}>Dhikr / Tasbih</Text>
          <Text style={ih.inputValue}>{todayEntry.dhikrCount}</Text>
        </View>
        <View style={ih.stepRow}>
          {[0, 33, 66, 99, 200, 500].map((n) => (
            <TouchableOpacity
              key={n}
              style={[ih.stepBtn, todayEntry.dhikrCount === n && { backgroundColor: '#1565C0', borderColor: '#1565C0' }]}
              onPress={() => void updateToday({ dhikrCount: n })}
            >
              <Text style={[ih.stepBtnText, todayEntry.dhikrCount === n && { color: '#fff' }]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Toggle actions */}
      {([
        { key: 'sadaqa', label: 'Sadaqa / aide', icon: 'heart', color: '#C62828' },
        { key: 'fastingOptional', label: 'Jeûne nafl', icon: 'moon', color: '#7B1FA2' },
        { key: 'tahajjud', label: 'Tahajjud / Qiyam', icon: 'star', color: '#E65100' },
      ] as const).map(({ key, label, icon, color }) => (
        <TouchableOpacity
          key={key}
          style={[ih.toggleCard, todayEntry[key] && { borderColor: color }]}
          onPress={() => void updateToday({ [key]: !todayEntry[key] })}
        >
          <View style={[ih.toggleIcon, { backgroundColor: color + '22' }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          <Text style={ih.toggleLabel}>{label}</Text>
          <Ionicons
            name={todayEntry[key] ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={todayEntry[key] ? color : palette.muted}
          />
        </TouchableOpacity>
      ))}

      {/* Weekly chart */}
      <Text style={ih.sectionTitle}>Semaine en cours</Text>
      <View style={ih.chartCard}>
        {week.map((d) => {
          const h = Math.max((d.score / 100) * 80, 4);
          const col = d.score >= 70 ? '#2E7D32' : d.score >= 50 ? '#F57F17' : d.score > 0 ? '#E65100' : palette.border;
          const isToday = d.iso === todayIso;
          return (
            <View key={d.iso} style={ih.chartCol}>
              <Text style={ih.chartScore}>{d.score > 0 ? d.score : ''}</Text>
              <View style={ih.chartBarContainer}>
                <View style={[ih.chartBar, { height: h, backgroundColor: col, opacity: isToday ? 1 : 0.6 }]} />
              </View>
              <Text style={[ih.chartDay, isToday && { fontWeight: '700', color: palette.primaryDark }]}>{d.day}</Text>
            </View>
          );
        })}
      </View>

      {/* Motivation */}
      <View style={ih.motivCard}>
        <Text style={ih.motivArabic}>إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ</Text>
        <Text style={ih.motivTrans}>Allah ne laisse pas perdre la récompense des bienfaisants.</Text>
        <Text style={ih.motivSource}>Coran 9:120</Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ih = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  scoreCard: { marginHorizontal: 20, backgroundColor: palette.card, borderRadius: 20, padding: 22, marginBottom: 24, borderWidth: 1, borderColor: palette.border, alignItems: 'center' },
  scoreDateLabel: { fontSize: 12, color: palette.textSoft, marginBottom: 8, textTransform: 'capitalize' },
  scoreEmoji: { fontSize: 36, marginBottom: 4 },
  scoreValue: { fontSize: 52, fontWeight: '800' },
  scoreSuffix: { fontSize: 20, fontWeight: '400', color: palette.textSoft },
  scoreLabel: { fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 14 },
  barBg: { width: '100%', height: 10, backgroundColor: palette.border, borderRadius: 5, overflow: 'hidden', marginBottom: 16 },
  barFill: { height: 10, borderRadius: 5 },
  statsRow: { flexDirection: 'row', gap: 32 },
  stat: { alignItems: 'center', gap: 2 },
  statVal: { fontSize: 20, fontWeight: '700', color: palette.text },
  statLbl: { fontSize: 11, color: palette.textSoft },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: palette.text, paddingHorizontal: 20, marginBottom: 12 },
  inputCard: { marginHorizontal: 20, backgroundColor: palette.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: palette.border },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  inputLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: palette.text },
  inputValue: { fontSize: 14, fontWeight: '700', color: palette.primaryDark },
  prayerBtns: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  prayerBtn: { minWidth: 36, height: 36, borderRadius: 18, paddingHorizontal: 6, backgroundColor: palette.accentLight, alignItems: 'center', justifyContent: 'center' },
  prayerBtnText: { fontSize: 13, fontWeight: '700', color: palette.primaryDark },
  stepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: palette.accentLight, borderWidth: 1, borderColor: palette.border },
  stepBtnText: { fontSize: 13, fontWeight: '600', color: palette.primaryDark },
  toggleCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: palette.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: palette.border, gap: 12 },
  toggleIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  toggleLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: palette.text },
  chartCard: { marginHorizontal: 20, backgroundColor: palette.card, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: palette.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  chartCol: { alignItems: 'center', flex: 1 },
  chartScore: { fontSize: 9, color: palette.textSoft, fontWeight: '700', marginBottom: 2 },
  chartBarContainer: { height: 80, justifyContent: 'flex-end' },
  chartBar: { width: 18, borderRadius: 4 },
  chartDay: { fontSize: 10, color: palette.textSoft, marginTop: 4, textTransform: 'capitalize' },
  motivCard: { marginHorizontal: 20, backgroundColor: palette.accentLight, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: palette.border },
  motivArabic: { fontSize: 20, fontFamily: 'Amiri-Regular', color: palette.arabic, textAlign: 'right', marginBottom: 8 },
  motivTrans: { fontSize: 13, color: palette.text, fontStyle: 'italic', marginBottom: 4 },
  motivSource: { fontSize: 11, color: palette.muted, fontWeight: '600' },
});
