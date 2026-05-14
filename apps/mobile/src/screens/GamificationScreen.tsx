import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/theme-context";
import * as SecureStore from "expo-secure-store";
import { loadGamificationState, xpToLevel, LEVEL_XP, ACHIEVEMENTS, type GamificationState as RealGamState } from '../gamification/gamification-events';

function safeIoniconName(name: string): keyof typeof Ionicons.glyphMap {
  return (Ionicons.glyphMap as any)[name] ? (name as any) : 'trophy';
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: string;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  points: number;
  progress: number;
  total: number;
  completed: boolean;
  daily: boolean;
}

interface GamificationState {
  totalPoints: number;
  level: number;
  streak: number;
  achievements: Achievement[];
  quests: Quest[];
  lastActive: string;
}

const GAMIFICATION_KEY = "oumoul_gamification";

export function GamificationScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { palette: p } = useTheme();
  const [state, setState] = useState<GamificationState | null>(null);
  const [loading, setLoading] = useState(true);

  const [realState, setRealState] = useState<RealGamState | null>(null);

  useEffect(() => {
    loadState();
    loadGamificationState().then(setRealState);
  }, []);

  const loadState = async () => {
    try {
      const [stored, prayerRaw, dhikrRaw, bookmarksRaw] = await Promise.all([
        SecureStore.getItemAsync(GAMIFICATION_KEY),
        SecureStore.getItemAsync('oumoul_prayer_logs'),
        SecureStore.getItemAsync('oumoul_tasbih_sessions'),
        SecureStore.getItemAsync('oumoul_quran_bookmarks'),
      ]);

      const base: GamificationState = stored ? JSON.parse(stored) : await initializeState();

      // Sync real data into quests
      const todayIso = new Date().toISOString().slice(0, 10);

      // Prayers today
      let todayPrayers = 0;
      if (prayerRaw) {
        try { const logs = JSON.parse(prayerRaw); todayPrayers = Object.keys(logs[todayIso] ?? {}).length; } catch {}
      }

      // Dhikr streak
      let dhikrStreak = 0;
      let totalDhikrToday = 0;
      if (dhikrRaw) {
        try {
          const sessions: Array<{ completedAt: string; count: number }> = JSON.parse(dhikrRaw);
          totalDhikrToday = sessions.filter(s => s.completedAt.startsWith(todayIso)).reduce((sum, s) => sum + s.count, 0);
          const dates = new Set(sessions.map(s => s.completedAt.slice(0, 10)));
          const d = new Date();
          while (dates.has(d.toISOString().slice(0, 10))) { dhikrStreak++; d.setDate(d.getDate() - 1); }
        } catch {}
      }

      // Quran bookmarks
      let quranBookmarks = 0;
      if (bookmarksRaw) { try { quranBookmarks = JSON.parse(bookmarksRaw).length ?? 0; } catch {} }

      // Prayer streak
      let prayerStreak = 0;
      if (prayerRaw) {
        try {
          const logs = JSON.parse(prayerRaw);
          const d = new Date();
          while (true) {
            const iso = d.toISOString().slice(0, 10);
            if (logs[iso] && Object.keys(logs[iso]).length === 5) { prayerStreak++; d.setDate(d.getDate() - 1); } else break;
          }
        } catch {}
      }

      // Update quests with real progress
      const updatedQuests = base.quests.map(q => {
        if (q.id === 'daily-prayers') return { ...q, progress: todayPrayers, completed: todayPrayers >= 5 };
        if (q.id === 'morning-dhikr') return { ...q, progress: Math.min(totalDhikrToday, q.total), completed: totalDhikrToday >= q.total };
        if (q.id === 'quran-reading') return { ...q, progress: Math.min(quranBookmarks, q.total), completed: quranBookmarks >= q.total };
        return q;
      });

      // Update achievements with real data
      const updatedAchievements = base.achievements.map(a => {
        if (a.id === 'first-prayer' && todayPrayers > 0) return { ...a, unlocked: true, unlockedAt: a.unlockedAt ?? new Date().toISOString() };
        if (a.id === 'week-streak' && prayerStreak >= 7) return { ...a, unlocked: true, unlockedAt: a.unlockedAt ?? new Date().toISOString() };
        if (a.id === 'quran-reader' && quranBookmarks >= 10) return { ...a, unlocked: true, unlockedAt: a.unlockedAt ?? new Date().toISOString() };
        if (a.id === 'dhikr-master' && totalDhikrToday >= 1000) return { ...a, unlocked: true, unlockedAt: a.unlockedAt ?? new Date().toISOString() };
        return a;
      });

      // Recalculate points from completed quests + unlocked achievements
      const questPoints = updatedQuests.filter(q => q.completed).reduce((sum, q) => sum + q.points, 0);
      const achievementPoints = updatedAchievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.points, 0);
      const totalPoints = questPoints + achievementPoints;
      const level = Math.floor(totalPoints / 100) + 1;

      const synced: GamificationState = {
        ...base,
        quests: updatedQuests,
        achievements: updatedAchievements,
        totalPoints,
        level,
        streak: Math.max(prayerStreak, dhikrStreak),
        lastActive: new Date().toISOString(),
      };

      setState(synced);
      await SecureStore.setItemAsync(GAMIFICATION_KEY, JSON.stringify(synced));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const initializeState = async (): Promise<GamificationState> => {
    const achievements: Achievement[] = [
      { id: "first-prayer", title: "Première Prière", description: "Enregistre ta première prière", icon: "checkmark-circle", points: 10, unlocked: false },
      { id: "week-streak", title: "Semaine Consécutive", description: "7 jours d'affilée", icon: "flame", points: 50, unlocked: false },
      { id: "quran-reader", title: "Lecteur du Coran", description: "Lis 10 versets", icon: "book", points: 25, unlocked: false },
      { id: "dhikr-master", title: "Maître du Dhikr", description: "1000 dhikrs complétés", icon: "radio", points: 100, unlocked: false },
    ];

    const quests: Quest[] = [
      { id: "daily-prayers", title: "Prières Quotidiennes", description: "Complète les 5 prières", points: 25, progress: 0, total: 5, completed: false, daily: true },
      { id: "quran-reading", title: "Lecture Coranique", description: "Lis 5 versets", points: 15, progress: 0, total: 5, completed: false, daily: true },
      { id: "morning-dhikr", title: "Dhikr du Matin", description: "50 dhikrs du matin", points: 10, progress: 0, total: 50, completed: false, daily: true },
    ];

    const initialState: GamificationState = {
      totalPoints: 0,
      level: 1,
      streak: 0,
      achievements,
      quests,
      lastActive: new Date().toISOString(),
    };

    await SecureStore.setItemAsync(GAMIFICATION_KEY, JSON.stringify(initialState));
    return initialState;
  };

  const completeQuest = async (questId: string) => {
    if (!state) return;
    
    const updatedState = { ...state };
    const quest = updatedState.quests.find(q => q.id === questId);
    
    if (quest && !quest.completed) {
      quest.completed = true;
      quest.progress = quest.total;
      updatedState.totalPoints += quest.points;
      
      // Check level up
      const newLevel = Math.floor(updatedState.totalPoints / 100) + 1;
      if (newLevel > updatedState.level) {
        updatedState.level = newLevel;
      }
      
      setState(updatedState);
      await SecureStore.setItemAsync(GAMIFICATION_KEY, JSON.stringify(updatedState));
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: p.bg }]}>
        <ActivityIndicator size="large" color={p.primary} />
        <Text style={[styles.loadingText, { marginTop: 8, color: p.text }]}>Chargement...</Text>
      </View>
    );
  }

  if (!state) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: p.bg }]}>
        <Text style={[styles.errorText, { color: p.text }]}>Erreur de chargement</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: p.border }]}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: p.text }]}>Gamification ULTIME</Text>
          <Text style={[styles.headerSub, { color: p.muted }]}>Niveau {state.level} • {state.totalPoints} points</Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: p.primary }]}>
          <Text style={styles.levelText}>{state.level}</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Card */}
        <View style={[styles.statsCard, { backgroundColor: p.card }]}>
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={24} color={p.primary} />
            <Text style={[styles.statValue, { color: p.text }]}>{(realState?.totalPoints ?? 0) + state.totalPoints}</Text>
            <Text style={[styles.statLabel, { color: p.muted }]}>Points</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flash" size={24} color="#F57F17" />
            <Text style={[styles.statValue, { color: p.text }]}>{realState?.totalXp ?? 0}</Text>
            <Text style={[styles.statLabel, { color: p.muted }]}>XP</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={24} color={p.secondary} />
            <Text style={[styles.statValue, { color: p.text }]}>{realState?.currentStreak ?? state.streak}</Text>
            <Text style={[styles.statLabel, { color: p.muted }]}>Série</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="star" size={24} color={p.accent} />
            <Text style={[styles.statValue, { color: p.text }]}>{realState ? ACHIEVEMENTS.filter(a => realState.achievements.some(u => u.id === a.id)).length : state.achievements.filter(a => a.unlocked).length}</Text>
            <Text style={[styles.statLabel, { color: p.muted }]}>Succès</Text>
          </View>
        </View>

        {/* XP Progress bar */}
        {realState && (() => {
          const lvl = xpToLevel(realState.totalXp);
          const currentLvlXp = LEVEL_XP[Math.min(lvl - 1, LEVEL_XP.length - 1)] ?? 0;
          const nextLvlXp = LEVEL_XP[Math.min(lvl, LEVEL_XP.length - 1)] ?? currentLvlXp + 500;
          const pct = Math.min((realState.totalXp - currentLvlXp) / Math.max(nextLvlXp - currentLvlXp, 1), 1);
          return (
            <View style={[styles.xpCard, { backgroundColor: p.card }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.statLabel, { color: p.text, fontWeight: '700' }]}>Niveau {lvl}</Text>
                <Text style={[styles.statLabel, { color: p.muted }]}>{realState.totalXp} XP → {nextLvlXp} XP</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: p.border }]}>
                <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: p.primary }]} />
              </View>
            </View>
          );
        })()}

        {/* Recent activity */}
        {realState && realState.recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: p.text }]}>⚡ Activité récente</Text>
            {realState.recentActivity.slice(0, 5).map((a, i) => (
              <View key={i} style={[styles.activityRow, { borderBottomColor: p.border }]}>
                <Text style={[styles.activityLabel, { color: p.text }]}>{a.label}</Text>
                <Text style={[styles.activityPoints, { color: p.primary }]}>+{a.points} pts · +{a.xp} XP</Text>
              </View>
            ))}
          </View>
        )}

        {/* Achievements from real system */}
        {realState && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: p.text }]}>🏆 Succès (système réel)</Text>
            {ACHIEVEMENTS.map((ach) => {
              const unlocked = realState.achievements.some((u) => u.id === ach.id);
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
                  {unlocked && <Ionicons name="checkmark-circle" size={20} color={p.primary} />}
                </View>
              );
            })}
          </View>
        )}

        {/* Daily Quests */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>🎯 Quêtes Quotidiennes</Text>
          {state.quests.filter(q => q.daily).map((quest) => (
            <View key={quest.id} style={[styles.questCard, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={styles.questHeader}>
                <View style={styles.questInfo}>
                  <Text style={[styles.questTitle, { color: p.text }]}>{quest.title}</Text>
                  <Text style={[styles.questDesc, { color: p.muted }]}>{quest.description}</Text>
                </View>
                <View style={[styles.questPoints, { backgroundColor: p.accentLight }]}>
                  <Text style={[styles.pointsText, { color: p.primary }]}>+{quest.points}</Text>
                </View>
              </View>
              <View style={styles.questProgress}>
                <View style={[styles.progressBar, { backgroundColor: p.border }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${(quest.progress / quest.total) * 100}%`, backgroundColor: p.primary }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressText, { color: p.muted }]}>{quest.progress}/{quest.total}</Text>
              </View>
              {!quest.completed && (
                <TouchableOpacity 
                  style={[styles.completeBtn, { backgroundColor: p.primary }]}
                  onPress={() => completeQuest(quest.id)}
                >
                  <Text style={styles.completeBtnText}>Compléter</Text>
                </TouchableOpacity>
              )}
              {quest.completed && (
                <View style={[styles.completedBadge, { backgroundColor: p.secondary }]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.completedText}>Terminé</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>🏆 Achievements</Text>
          {state.achievements.map((achievement) => (
            <View key={achievement.id} style={[
              styles.achievementCard,
              { backgroundColor: p.card, borderColor: achievement.unlocked ? p.primary : p.border, borderWidth: achievement.unlocked ? 2 : 1 }
            ]}>
              <View style={styles.achievementIcon}>
                <Ionicons 
                  name={safeIoniconName(achievement.icon)} 
                  size={24} 
                  color={achievement.unlocked ? p.primary : p.muted} 
                />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={[
                  styles.achievementTitle,
                  { color: achievement.unlocked ? p.text : p.muted }
                ]}>
                  {achievement.title}
                </Text>
                <Text style={[styles.achievementDesc, { color: p.muted }]}>{achievement.description}</Text>
                <Text style={[styles.achievementPoints, { color: p.primary }]}>+{achievement.points} points</Text>
              </View>
              {achievement.unlocked && (
                <Ionicons name="checkmark-circle" size={20} color={p.primary} />
              )}
            </View>
          ))}
        </View>
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
