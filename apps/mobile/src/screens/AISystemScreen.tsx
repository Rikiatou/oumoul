import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AIAnalysisResult } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/theme-context";
import { aiApi } from '../api';

const FALLBACK_RESULT: AIAnalysisResult = {
  overallScore: 50,
  lastAnalysisAt: new Date().toISOString(),
  context: { prayerOnTimePercent: 0, prayerStreakDays: 0, hifzTotal: 0, dhikrSessionsLast7Days: 0, fastingDaysThisRamadan: 0, imaneProgramCompletionPercent: 0, prayedLast7Days: 0, hifzDueToday: 0, hifzMastered: 0, mood: 'focused' },
  recommendations: [
    { id: 'r1', type: 'prayer', title: 'Prière à l\'heure', description: 'Essaie de prier chaque salat dès le début de son temps. Commence par Fajr !', timeSuggestion: 'Chaque jour', priority: 'high', basedOn: 'Conseil général' },
    { id: 'r2', type: 'quran', title: 'Lecture du Coran', description: 'Lis au moins 1 page de Coran par jour. La régularité vaut mieux que la quantité.', timeSuggestion: 'Après Fajr', priority: 'medium', basedOn: 'Conseil général' },
    { id: 'r3', type: 'dhikr', title: 'Dhikr du matin et du soir', description: 'Récite Subhanallah, Alhamdulillah, Allahu Akbar 33 fois chacun après chaque prière.', timeSuggestion: 'Après Fajr et Asr', priority: 'medium', basedOn: 'Conseil général' },
    { id: 'r4', type: 'general', title: 'Invocation quotidienne', description: 'Lis les Adhkar du matin et du soir — ils protègent et augmentent la foi.', timeSuggestion: 'Matin et soir', priority: 'low', basedOn: 'Conseil général' },
  ],
};

type Mood = "focused" | "relaxed" | "tired" | "energetic";

export function AISystemScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { palette: p } = useTheme();
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [mood, setMoodState] = useState<Mood>("focused");
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const runAnalysis = useCallback(async (selectedMood: Mood) => {
    setAnalyzing(true);
    setError(null);
    try {
      const data = await aiApi.analyze(selectedMood);
      setResult(data);
      setIsOffline(false);
    } catch {
      // Keep existing result, just show soft warning
      if (!result) setResult(FALLBACK_RESULT);
      setIsOffline(true);
    } finally {
      setAnalyzing(false);
    }
  }, [result]);

  useEffect(() => {
    setLoading(true);
    aiApi.analyze('focused')
      .then((data) => { setResult(data); setIsOffline(false); })
      .catch(() => { setResult(FALLBACK_RESULT); setIsOffline(true); })
      .finally(() => setLoading(false));
  }, []);

  const handleMoodChange = async (newMood: Mood) => {
    setMoodState(newMood);
    await runAnalysis(newMood);
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: p.bg }]}>
        <ActivityIndicator size="large" color={p.primary} />
        <Text style={[styles.loadingText, { marginTop: 8, color: p.text }]}>Initialisation IA...</Text>
      </View>
    );
  }

  const MOOD_OPTIONS: { key: Mood; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'focused', label: 'Concentré', icon: 'radio-button-on' },
    { key: 'relaxed', label: 'Détendu', icon: 'leaf' },
    { key: 'tired', label: 'Fatigué', icon: 'bed-outline' },
    { key: 'energetic', label: 'Énergique', icon: 'flash' },
  ];

  const REC_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    prayer: 'compass',
    quran: 'book',
    dhikr: 'heart',
    fasting: 'moon',
    hifz: 'layers',
    general: 'sparkles',
  };

  const ctx = result?.context;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      <View style={[styles.header, { borderBottomColor: p.border }]}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: p.text }]}>Conseiller IA Spirituel</Text>
          <Text style={[styles.headerSub, { color: p.muted }]}>
            {result ? `Score réel : ${result.overallScore}/100 • Mis à jour maintenant` : 'Analyse en cours…'}
          </Text>
        </View>
        <View style={[styles.aiBadge, { backgroundColor: p.primary }]}>
          <Ionicons name="sparkles" size={20} color="#fff" />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Offline soft banner */}
        {isOffline && (
          <View style={[styles.errorCard, { backgroundColor: '#FFF8E1', borderColor: '#FFE082' }]}>
            <Ionicons name="cloud-offline-outline" size={18} color="#F9A825" />
            <Text style={[styles.errorText, { color: '#F57F17', marginLeft: 8, flex: 1 }]}>Mode hors ligne — conseils généraux affichés. Connectez-vous pour une analyse personnalisée.</Text>
          </View>
        )}

        {/* Score réel */}
        {result && (
          <View style={[styles.statusCard, { backgroundColor: p.card, borderColor: p.border }]}>
            <View style={styles.scoreRow}>
              <View>
                <Text style={[styles.scoreLabel, { color: p.muted }]}>Score spirituel réel</Text>
                <Text style={[styles.scoreValue, { color: p.primary }]}>{result.overallScore}<Text style={{ fontSize: 18 }}>/100</Text></Text>
              </View>
              <TouchableOpacity
                style={[styles.analyzeBtn, { backgroundColor: analyzing ? p.muted : p.primary }]}
                onPress={() => runAnalysis(mood)}
                disabled={analyzing}
              >
                {analyzing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.analyzeBtnText}>Actualiser</Text>}
              </TouchableOpacity>
            </View>
            {ctx && (
              <View style={styles.metricsGrid}>
                <View style={styles.metric}>
                  <Text style={[styles.metricVal, { color: p.text }]}>{ctx.prayerOnTimePercent}%</Text>
                  <Text style={[styles.metricLbl, { color: p.muted }]}>Prières heure</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={[styles.metricVal, { color: p.text }]}>{ctx.prayerStreakDays}j</Text>
                  <Text style={[styles.metricLbl, { color: p.muted }]}>Série</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={[styles.metricVal, { color: p.text }]}>{ctx.hifzTotal}</Text>
                  <Text style={[styles.metricLbl, { color: p.muted }]}>Hifz</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={[styles.metricVal, { color: p.text }]}>{ctx.dhikrSessionsLast7Days}</Text>
                  <Text style={[styles.metricLbl, { color: p.muted }]}>Dhikrs/sem</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Mood selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>😊 Comment tu te sens ?</Text>
          <View style={styles.moodGrid}>
            {MOOD_OPTIONS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.moodCard, { backgroundColor: p.card, borderColor: mood === m.key ? p.primary : p.border, borderWidth: mood === m.key ? 2 : 1 }]}
                onPress={() => handleMoodChange(m.key)}
              >
                <Ionicons name={m.icon} size={24} color={mood === m.key ? p.primary : p.muted} />
                <Text style={[styles.moodText, { color: mood === m.key ? p.primary : p.muted, fontWeight: mood === m.key ? '600' : '400' }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recommandations réelles */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>🎯 Recommandations Personnalisées</Text>
          {analyzing && <ActivityIndicator style={{ marginVertical: 16 }} color={p.primary} />}
          {!analyzing && result?.recommendations.map((rec) => (
            <View key={rec.id} style={[styles.recommendationCard, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={styles.recommendationHeader}>
                <View style={[styles.recIconBox, { backgroundColor: rec.priority === 'high' ? '#FFEBEE' : rec.priority === 'medium' ? '#FFF8E1' : '#E8F5E9' }]}>
                  <Ionicons name={REC_ICONS[rec.type] ?? 'sparkles'} size={20} color={rec.priority === 'high' ? '#C62828' : rec.priority === 'medium' ? '#F57C00' : '#388E3C'} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.recommendationTitle, { color: p.text }]}>{rec.title}</Text>
                  <Text style={[styles.recommendationDesc, { color: p.muted }]}>{rec.description}</Text>
                  {rec.basedOn ? <Text style={[styles.basedOn, { color: p.muted }]}>📊 {rec.basedOn}</Text> : null}
                </View>
              </View>
              <View style={styles.recommendationFooter}>
                <View style={styles.timeSuggestion}>
                  <Ionicons name="time" size={14} color={p.muted} />
                  <Text style={[styles.timeText, { color: p.muted }]}>{rec.timeSuggestion}</Text>
                </View>
                <View style={[styles.priorityBadge, rec.priority === 'high' ? styles.priorityHigh : rec.priority === 'medium' ? styles.priorityMedium : styles.priorityLow]}>
                  <Text style={styles.priorityText}>{rec.priority === 'high' ? 'Priorité haute' : rec.priority === 'medium' ? 'Moyenne' : 'Basse'}</Text>
                </View>
              </View>
            </View>
          ))}
          {!analyzing && result?.recommendations.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color={p.primary} />
              <Text style={[styles.emptyText, { color: p.text }]}>Tout est parfait !</Text>
              <Text style={[styles.emptyDesc, { color: p.muted }]}>Continue ainsi — ton niveau spirituel est excellent.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { fontSize: 16 },
  errorText: { fontSize: 13, flex: 1 },
  errorCard: { flexDirection: 'row', alignItems: 'center', margin: 16, borderRadius: 12, padding: 14, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12 },
  aiBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  statusCard: { margin: 16, borderRadius: 16, padding: 20, borderWidth: 1 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  scoreLabel: { fontSize: 12 },
  scoreValue: { fontSize: 40, fontWeight: '800' },
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center' },
  metricVal: { fontSize: 20, fontWeight: '700' },
  metricLbl: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  analyzeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  analyzeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  section: { marginHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  moodGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  moodCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  moodText: { fontSize: 11, marginTop: 6, textAlign: 'center' },
  recommendationCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  recommendationHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  recIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recommendationTitle: { fontSize: 15, fontWeight: '600' },
  recommendationDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  basedOn: { fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityHigh: { backgroundColor: '#FEE2E2' },
  priorityMedium: { backgroundColor: '#FEF3C7' },
  priorityLow: { backgroundColor: '#F0FDF4' },
  priorityText: { fontSize: 10, fontWeight: '600' },
  recommendationFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  timeSuggestion: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, marginTop: 12, fontWeight: '600' },
  emptyDesc: { fontSize: 14, marginTop: 4, textAlign: 'center' },
});
