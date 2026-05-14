import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/theme-context";
import * as SecureStore from "expo-secure-store";

function safeIoniconName(name: string): keyof typeof Ionicons.glyphMap {
  return (Ionicons.glyphMap as any)[name] ? (name as any) : 'sparkles';
}

interface LearningPattern {
  timeOfDay: string;
  activity: string;
  duration: number;
  performance: number;
  date: string;
}

interface AIRecommendation {
  id: string;
  type: "prayer" | "quran" | "dhikr" | "learning";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  timeSuggestion: string;
}

interface AIState {
  patterns: LearningPattern[];
  recommendations: AIRecommendation[];
  currentMood: "focused" | "relaxed" | "tired" | "energetic";
  lastAnalysis: string;
  adaptationLevel: number;
}

const AI_KEY = "oumoul_ai_system";

export function AISystemScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { palette: p } = useTheme();
  const [state, setState] = useState<AIState | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const stored = await SecureStore.getItemAsync(AI_KEY);
      if (stored) {
        setState(JSON.parse(stored));
      } else {
        const initialState = await initializeState();
        setState(initialState);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const initializeState = async (): Promise<AIState> => {
    const recommendations: AIRecommendation[] = [
      {
        id: "morning-dhikr",
        type: "dhikr",
        title: "Dhikr du Matin",
        description: "Commence ta journée avec 33 SubhanAllah",
        priority: "high",
        timeSuggestion: "06:00"
      },
      {
        id: "quran-morning",
        type: "quran",
        title: "Lecture Coranique",
        description: "3 versets du Coran pour bien commencer",
        priority: "medium",
        timeSuggestion: "07:30"
      },
      {
        id: "prayer-focus",
        type: "prayer",
        title: "Concentration Prière",
        description: "Focus accru pour la prière du Fajr",
        priority: "high",
        timeSuggestion: "05:30"
      }
    ];

    const initialState: AIState = {
      patterns: [],
      recommendations,
      currentMood: "focused",
      lastAnalysis: new Date().toISOString(),
      adaptationLevel: 1,
    };

    await SecureStore.setItemAsync(AI_KEY, JSON.stringify(initialState));
    return initialState;
  };

  const analyzePatterns = async () => {
    if (!state) return;
    
    setAnalyzing(true);
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newPattern: LearningPattern = {
      timeOfDay: new Date().getHours() < 12 ? "morning" : "evening",
      activity: "app_usage",
      duration: Math.floor(Math.random() * 60) + 10,
      performance: Math.floor(Math.random() * 40) + 60,
      date: new Date().toISOString(),
    };

    const updatedState = {
      ...state,
      patterns: [...state.patterns, newPattern],
      adaptationLevel: state.adaptationLevel + 1,
      lastAnalysis: new Date().toISOString(),
    };

    // Generate new recommendations based on patterns
    const newRecommendations = generateRecommendations(updatedState.patterns);
    updatedState.recommendations = newRecommendations;

    setState(updatedState);
    await SecureStore.setItemAsync(AI_KEY, JSON.stringify(updatedState));
    setAnalyzing(false);
  };

  const generateRecommendations = (patterns: LearningPattern[]): AIRecommendation[] => {
    const avgPerformance = patterns.reduce((sum, p) => sum + p.performance, 0) / patterns.length;
    
    if (avgPerformance > 80) {
      return [
        {
          id: "advanced-quran",
          type: "quran",
          title: "Étude Approfondie",
          description: "5 versets avec mémorisation",
          priority: "high",
          timeSuggestion: "20:00"
        },
        {
          id: "extended-dhikr",
          type: "dhikr",
          title: "Dhikr Étendu",
          description: "100 dhikrs avec concentration",
          priority: "medium",
          timeSuggestion: "21:00"
        }
      ];
    } else {
      return [
        {
          id: "basic-prayer",
          type: "prayer",
          title: "Prière Simple",
          description: "Focus sur une prière à la fois",
          priority: "high",
          timeSuggestion: "18:00"
        },
        {
          id: "light-quran",
          type: "quran",
          title: "Lecture Légère",
          description: "1 verset du Coran",
          priority: "low",
          timeSuggestion: "19:00"
        }
      ];
    }
  };

  const setMood = async (mood: AIState["currentMood"]) => {
    if (!state) return;
    
    const updatedState = { ...state, currentMood: mood };
    setState(updatedState);
    await SecureStore.setItemAsync(AI_KEY, JSON.stringify(updatedState));
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: p.bg }]}>
        <ActivityIndicator size="large" color={p.primary} />
        <Text style={[styles.loadingText, { marginTop: 8, color: p.text }]}>Initialisation IA...</Text>
      </View>
    );
  }

  if (!state) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: p.bg }]}>
        <Text style={[styles.errorText, { color: p.text }]}>Erreur IA</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: p.border }]}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: p.text }]}>Système IA ULTRA-Intelligent</Text>
          <Text style={[styles.headerSub, { color: p.muted }]}>Niveau {state.adaptationLevel} • {state.patterns.length} patterns</Text>
        </View>
        <View style={[styles.aiBadge, { backgroundColor: p.primary }]}>
          <Ionicons name="sparkles" size={20} color="#fff" />
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* AI Status */}
        <View style={[styles.statusCard, { backgroundColor: p.card, borderColor: p.border }]}>
          <View style={styles.statusHeader}>
            <Text style={[styles.statusTitle, { color: p.text }]}>🧠 Analyse en Cours</Text>
            <TouchableOpacity 
              style={[styles.analyzeBtn, { backgroundColor: analyzing ? p.muted : p.primary }]}
              onPress={analyzePatterns}
              disabled={analyzing}
            >
              {analyzing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.analyzeBtnText}>Analyser</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={[styles.statusDesc, { color: p.muted }]}>
            L'IA analyse vos patterns d'apprentissage pour optimiser votre progression spirituelle.
          </Text>
        </View>

        {/* Mood Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>😊 État Actuel</Text>
          <View style={styles.moodGrid}>
            {(["focused", "relaxed", "tired", "energetic"] as const).map((mood) => (
              <TouchableOpacity
                key={mood}
                style={[
                  styles.moodCard,
                  { backgroundColor: p.card, borderColor: state.currentMood === mood ? p.primary : p.border, borderWidth: state.currentMood === mood ? 2 : 1 }
                ]}
                onPress={() => setMood(mood)}
              >
                <Ionicons 
                  name={safeIoniconName(
                    mood === "focused" ? "radio-button-on" :
                    mood === "relaxed" ? "leaf" :
                    mood === "tired" ? "bed-outline" : "flash"
                  )} 
                  size={24} 
                  color={state.currentMood === mood ? p.primary : p.muted} 
                />
                <Text style={[styles.moodText, { color: state.currentMood === mood ? p.primary : p.muted, fontWeight: state.currentMood === mood ? '600' : '400' }]}>
                  {mood === "focused" ? "Concentré" :
                   mood === "relaxed" ? "Détendu" :
                   mood === "tired" ? "Fatigué" : "Énergique"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>🎯 Recommandations IA</Text>
          {state.recommendations.map((rec) => (
            <View key={rec.id} style={[styles.recommendationCard, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={styles.recommendationHeader}>
                <View style={styles.recommendationInfo}>
                  <Text style={[styles.recommendationTitle, { color: p.text }]}>{rec.title}</Text>
                  <Text style={[styles.recommendationDesc, { color: p.muted }]}>{rec.description}</Text>
                </View>
                <View style={[
                  styles.priorityBadge,
                  rec.priority === "high" && styles.priorityHigh,
                  rec.priority === "medium" && styles.priorityMedium,
                  rec.priority === "low" && styles.priorityLow
                ]}>
                  <Text style={styles.priorityText}>
                    {rec.priority === "high" ? "Haute" :
                     rec.priority === "medium" ? "Moyenne" : "Basse"}
                  </Text>
                </View>
              </View>
              <View style={styles.recommendationFooter}>
                <View style={styles.timeSuggestion}>
                  <Ionicons name="time" size={16} color={p.muted} />
                  <Text style={[styles.timeText, { color: p.muted }]}>{rec.timeSuggestion}</Text>
                </View>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: p.primary }]}>
                  <Text style={styles.actionBtnText}>Commencer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Patterns */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>📊 Patterns Détectés</Text>
          {state.patterns.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="analytics" size={48} color={p.muted} />
              <Text style={[styles.emptyText, { color: p.muted }]}>Aucun pattern détecté</Text>
              <Text style={[styles.emptyDesc, { color: p.muted }]}>Utilisez l'app pour générer des patterns</Text>
            </View>
          ) : (
            state.patterns.slice(-3).map((pattern, index) => (
              <View key={index} style={[styles.patternCard, { backgroundColor: p.card, borderColor: p.border }]}>
                <Text style={[styles.patternDate, { color: p.muted }]}>
                  {new Date(pattern.date).toLocaleDateString('fr-FR')}
                </Text>
                <View style={styles.patternStats}>
                  <View style={styles.patternStat}>
                    <Text style={[styles.patternLabel, { color: p.muted }]}>Performance</Text>
                    <Text style={[styles.patternValue, { color: p.text }]}>{pattern.performance}%</Text>
                  </View>
                  <View style={styles.patternStat}>
                    <Text style={[styles.patternLabel, { color: p.muted }]}>Durée</Text>
                    <Text style={[styles.patternValue, { color: p.text }]}>{pattern.duration}min</Text>
                  </View>
                </View>
              </View>
            ))
          )}
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
  aiBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  statusCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  analyzeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  analyzingBtn: {},
  analyzeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusDesc: {
    fontSize: 14,
    lineHeight: 20,
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
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  moodCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  moodText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  recommendationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationInfo: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recommendationDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityHigh: {
    backgroundColor: '#FEE2E2',
  },
  priorityMedium: {
    backgroundColor: '#FEF3C7',
  },
  priorityLow: {
    backgroundColor: '#F0FDF4',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timeSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  patternCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  patternDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  patternStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  patternStat: {
    alignItems: 'center',
  },
  patternLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  patternValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
