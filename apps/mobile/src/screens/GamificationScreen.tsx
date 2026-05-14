import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from '../components/BackButton';
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/theme-context";
import { loadGamificationState, xpToLevel, LEVEL_XP, ACHIEVEMENTS, type GamificationState } from '../gamification/gamification-events';

export function GamificationScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { palette: p } = useTheme();
  const [state, setState] = useState<GamificationState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGamificationState().then((s) => { setState(s); setLoading(false); });
  }, []);


  if (loading || !state) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: p.bg }]}>
        <ActivityIndicator size="large" color={p.primary} />
      </View>
    );
  }

  const level = xpToLevel(state.totalXp);
  const currentLvlXp = LEVEL_XP[Math.min(level - 1, LEVEL_XP.length - 1)] ?? 0;
  const nextLvlXp = LEVEL_XP[Math.min(level, LEVEL_XP.length - 1)] ?? currentLvlXp + 500;
  const xpPct = Math.min((state.totalXp - currentLvlXp) / Math.max(nextLvlXp - currentLvlXp, 1), 1);

  // Daily quests derived from real event counters (today)
  const todayPrayers = (state.totalEvents.prayer_on_time ?? 0) + (state.totalEvents.prayer_late ?? 0);
  const todayDhikr = (state.totalEvents.dhikr_33 ?? 0) + (state.totalEvents.dhikr_99 ?? 0) + (state.totalEvents.dhikr_200 ?? 0);
  const todayQuran = state.totalEvents.quran_read ?? 0;

  const DAILY_QUESTS = [
    { id: 'prayers', title: 'Prières du jour', desc: '5 prières enregistrées', progress: Math.min(todayPrayers, 5), total: 5, xp: 40, done: todayPrayers >= 5 },
    { id: 'dhikr', title: 'Dhikr quotidien', desc: '3 sessions de dhikr', progress: Math.min(todayDhikr, 3), total: 3, xp: 15, done: todayDhikr >= 3 },
    { id: 'quran', title: 'Lecture du Coran', desc: '1 session de lecture', progress: Math.min(todayQuran, 1), total: 1, xp: 10, done: todayQuran >= 1 },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      <View style={[styles.header, { borderBottomColor: p.border }]}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: p.text }]}>Progression Spirituelle</Text>
          <Text style={[styles.headerSub, { color: p.muted }]}>Niveau {level} • {state.totalXp} XP</Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: p.primary }]}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={[styles.statsCard, { backgroundColor: p.card }]}>
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={24} color={p.primary} />
            <Text style={[styles.statValue, { color: p.text }]}>{state.totalPoints}</Text>
            <Text style={[styles.statLabel, { color: p.muted }]}>Points</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flash" size={24} color="#F57F17" />
            <Text style={[styles.statValue, { color: p.text }]}>{state.totalXp}</Text>
            <Text style={[styles.statLabel, { color: p.muted }]}>XP</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={24} color={p.secondary} />
            <Text style={[styles.statValue, { color: p.text }]}>{state.currentStreak}</Text>
            <Text style={[styles.statLabel, { color: p.muted }]}>Série</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="star" size={24} color={p.accent} />
            <Text style={[styles.statValue, { color: p.text }]}>{state.achievements.length}</Text>
            <Text style={[styles.statLabel, { color: p.muted }]}>Succès</Text>
          </View>
        </View>

        {/* XP Bar */}
        <View style={[styles.xpCard, { backgroundColor: p.card }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={[styles.statLabel, { color: p.text, fontWeight: '700' }]}>Niveau {level}</Text>
            <Text style={[styles.statLabel, { color: p.muted }]}>{state.totalXp} / {nextLvlXp} XP</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: p.border }]}>
            <View style={[styles.progressFill, { width: `${xpPct * 100}%` as any, backgroundColor: p.primary }]} />
          </View>
        </View>

        {/* Daily Quests — auto from real events */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>🎯 Quêtes du jour</Text>
          {DAILY_QUESTS.map((q) => (
            <View key={q.id} style={[styles.questCard, { backgroundColor: p.card, borderColor: q.done ? p.primary : p.border, borderWidth: q.done ? 2 : 1 }]}>
              <View style={styles.questHeader}>
                <View style={styles.questInfo}>
                  <Text style={[styles.questTitle, { color: p.text }]}>{q.title}</Text>
                  <Text style={[styles.questDesc, { color: p.muted }]}>{q.desc}</Text>
                </View>
                <View style={[styles.questPoints, { backgroundColor: p.accentLight }]}>
                  <Text style={[styles.pointsText, { color: p.primary }]}>+{q.xp} XP</Text>
                </View>
              </View>
              <View style={styles.questProgress}>
                <View style={[styles.progressBar, { backgroundColor: p.border }]}>
                  <View style={[styles.progressFill, { width: `${(q.progress / q.total) * 100}%` as any, backgroundColor: q.done ? p.primary : p.secondary }]} />
                </View>
                <Text style={[styles.progressText, { color: p.muted }]}>{q.progress}/{q.total}</Text>
              </View>
              {q.done && (
                <View style={[styles.completedBadge, { backgroundColor: p.primary }]}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={styles.completedText}>Accompli</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Recent activity */}
        {state.recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: p.text }]}>⚡ Activité récente</Text>
            {state.recentActivity.slice(0, 8).map((a, i) => (
              <View key={i} style={[styles.activityRow, { borderBottomColor: p.border }]}>
                <Text style={[styles.activityLabel, { color: p.text }]}>{a.label}</Text>
                <Text style={[styles.activityPoints, { color: p.primary }]}>+{a.points} pts · +{a.xp} XP</Text>
              </View>
            ))}
          </View>
        )}

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>🏆 Succès</Text>
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = state.achievements.some((u) => u.id === ach.id);
            return (
              <View key={ach.id} style={[styles.achievementCard, { backgroundColor: p.card, borderColor: unlocked ? p.primary : p.border, borderWidth: unlocked ? 2 : 1 }]}>
                <View style={styles.achievementIcon}>
                  <Text style={{ fontSize: 24 }}>{ach.icon}</Text>
                </View>
                <View style={styles.achievementInfo}>
                  <Text style={[styles.achievementTitle, { color: unlocked ? p.text : p.muted }]}>{ach.title}</Text>
                  <Text style={[styles.achievementDesc, { color: p.muted }]}>{ach.description}</Text>
                  <Text style={[styles.achievementPoints, { color: p.primary }]}>+{ach.points} pts</Text>
                </View>
                {unlocked && <Ionicons name="checkmark-circle" size={22} color={p.primary} />}
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 12,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  statsCard: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  questCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  questDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  questPoints: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  questProgress: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  completeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  completeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  completedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  achievementCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  achievementUnlocked: {
    borderWidth: 2,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(236,72,153,0.10)',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  achievementLocked: {},
  achievementDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  achievementPoints: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  xpCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  activityLabel: {
    fontSize: 13,
    flex: 1,
  },
  activityPoints: {
    fontSize: 12,
    fontWeight: '700',
  },
});
