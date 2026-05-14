import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '@oumoul/api';
import { palette } from '../theme';
import { HelpTip } from '../components/HelpTip';
import { BackButton } from '../components/BackButton';
import { ALLAH_NAMES, AllahNameLocal } from '../data/allah-names';

const NAMES_PROGRESS_KEY = 'oumoul_allah_names_progress';

type ViewMode = 'grid' | 'list' | 'quiz';

export function AllahNamesScreen({ user, onBack, initialNameId }: { user: AuthUser; onBack: () => void; initialNameId?: number }) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(initialNameId ? 'list' : 'grid');
  const [memorized, setMemorized] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(initialNameId ?? null);
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Load persisted memorization progress
  useEffect(() => {
    SecureStore.getItemAsync(NAMES_PROGRESS_KEY).then((raw: string | null) => {
      if (raw) {
        try { setMemorized(new Set(JSON.parse(raw) as number[])); } catch {}
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  // Persist memorization progress
  useEffect(() => {
    if (!loaded) return;
    SecureStore.setItemAsync(NAMES_PROGRESS_KEY, JSON.stringify([...memorized])).catch(() => {});
  }, [memorized, loaded]);

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [shuffledNames, setShuffledNames] = useState<AllahNameLocal[]>([]);

  const filteredNames = useMemo(() => {
    if (!search.trim()) return ALLAH_NAMES;
    const q = search.toLowerCase();
    return ALLAH_NAMES.filter(
      (n) =>
        n.transliteration.toLowerCase().includes(q) ||
        n.meaning.toLowerCase().includes(q) ||
        n.name.includes(q) ||
        n.id.toString() === q
    );
  }, [search]);

  const toggleMemorized = useCallback((id: number) => {
    setMemorized((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const startQuiz = useCallback(() => {
    const shuffled = [...ALLAH_NAMES].sort(() => Math.random() - 0.5);
    setShuffledNames(shuffled);
    setQuizIndex(0);
    setQuizAnswer(null);
    setQuizScore(0);
    setQuizTotal(0);
    setViewMode('quiz');
  }, []);

  const handleQuizAnswer = useCallback((answer: string) => {
    const current = shuffledNames[quizIndex];
    const correct = answer === current.meaning;
    setQuizAnswer(answer);
    setQuizTotal((p) => p + 1);
    if (correct) setQuizScore((p) => p + 1);

    setTimeout(() => {
      setQuizAnswer(null);
      if (quizIndex < shuffledNames.length - 1) {
        setQuizIndex((p) => p + 1);
      } else {
        setViewMode('grid');
      }
    }, 1200);
  }, [quizIndex, shuffledNames]);

  const quizOptions = useMemo(() => {
    if (shuffledNames.length === 0 || quizIndex >= shuffledNames.length) return [];
    const current = shuffledNames[quizIndex];
    const others = ALLAH_NAMES.filter((n) => n.id !== current.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((n) => n.meaning);
    const options = [current.meaning, ...others].sort(() => Math.random() - 0.5);
    return options;
  }, [quizIndex, shuffledNames]);

  // Auto-scroll to initialNameId after load
  useEffect(() => {
    if (!initialNameId || !loaded) return;
    const idx = ALLAH_NAMES.findIndex((n) => n.id === initialNameId);
    if (idx >= 0) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
      }, 400);
    }
  }, [initialNameId, loaded]);

  const memorizedCount = memorized.size;
  const progressPct = Math.round((memorizedCount / 99) * 100);

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={st.header}>
        <BackButton onPress={onBack} />
        <Text style={st.headerTitle} accessibilityRole="header">99 Noms d'Allah</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <HelpTip screenName="99 Noms d'Allah" tips={[
            { icon: 'heart', title: 'Mémorisation', description: 'Appuie sur un nom pour le marquer comme mémorisé. Ta progression est sauvegardée.' },
            { icon: 'school', title: 'Mode quiz', description: 'Appuie sur l\'icône école pour tester ta mémorisation avec un quiz interactif.' },
            { icon: 'search', title: 'Recherche', description: 'Utilise la barre de recherche pour trouver un nom spécifique.' },
            { icon: 'grid', title: 'Vue grille / liste', description: 'Bascule entre la vue grille et la vue liste selon ta préférence.' },
            { icon: 'sparkles', title: 'Bienfaits', description: 'Chaque nom a un bienfait associé pour enrichir ta pratique.' },
          ]} />
          <TouchableOpacity onPress={startQuiz} style={st.backBtn} accessibilityLabel="Lancer le quiz" accessibilityRole="button">
            <Ionicons name="school" size={20} color={palette.primaryDark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quiz Mode */}
      {viewMode === 'quiz' && shuffledNames.length > 0 && quizIndex < shuffledNames.length ? (
        <View style={st.quizContainer}>
          <Text style={st.quizProgress}>{quizIndex + 1} / {Math.min(10, shuffledNames.length)}</Text>
          <Text style={st.quizScore}>Score: {quizScore}/{quizTotal}</Text>

          <View style={st.quizCard}>
            <Text style={st.quizArabic}>{shuffledNames[quizIndex].name}</Text>
            <Text style={st.quizTranslit}>{shuffledNames[quizIndex].transliteration}</Text>
          </View>

          <Text style={st.quizQuestion}>Quelle est la signification ?</Text>

          <View style={st.quizOptions}>
            {quizOptions.map((opt, i) => {
              const isCorrect = opt === shuffledNames[quizIndex].meaning;
              const isSelected = quizAnswer === opt;
              let bg: string = palette.card;
              if (quizAnswer) {
                if (isCorrect) bg = '#E8F5E9';
                else if (isSelected) bg = '#FFEBEE';
              }
              return (
                <TouchableOpacity
                  key={i}
                  style={[st.quizOption, { backgroundColor: bg }]}
                  onPress={() => !quizAnswer && handleQuizAnswer(opt)}
                  disabled={!!quizAnswer}
                >
                  <Text style={st.quizOptionText}>{opt}</Text>
                  {quizAnswer && isCorrect && <Ionicons name="checkmark-circle" size={18} color="#388E3C" />}
                  {quizAnswer && isSelected && !isCorrect && <Ionicons name="close-circle" size={18} color="#D32F2F" />}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={st.quizExit} onPress={() => setViewMode('grid')}>
            <Text style={st.quizExitText}>Quitter le quiz</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Progress Banner */}
          <View style={st.progressBanner}>
            <View style={{ flex: 1 }}>
              <Text style={st.progressTitle}>{memorizedCount}/99 mémorisés</Text>
              <View style={st.progressBarBg}>
                <View style={[st.progressBarFill, { width: `${progressPct}%` }]} />
              </View>
            </View>
            <View style={st.progressCircle}>
              <Text style={st.progressPct}>{progressPct}%</Text>
            </View>
          </View>

          {/* Search */}
          <View style={st.searchRow}>
            <View style={st.searchBox}>
              <Ionicons name="search" size={16} color={palette.textSoft} />
              <TextInput
                style={st.searchInput}
                placeholder="Rechercher un nom..."
                placeholderTextColor={palette.muted}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity
              style={st.viewToggle}
              onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              <Ionicons name={viewMode === 'grid' ? 'list' : 'grid'} size={20} color={palette.primaryDark} />
            </TouchableOpacity>
          </View>

          {/* Names */}
          {viewMode === 'grid' ? (
            <FlatList
              ref={listRef}
              data={filteredNames}
              key="grid"
              numColumns={3}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
              onScrollToIndexFailed={() => {}}
              renderItem={({ item }) => {
                const isMemo = memorized.has(item.id);
                return (
                  <TouchableOpacity
                    style={[st.gridCard, isMemo && st.gridCardMemo]}
                    onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    onLongPress={() => toggleMemorized(item.id)}
                  >
                    <Text style={st.gridNum}>{item.id}</Text>
                    <Text style={[st.gridArabic, isMemo && { color: '#fff' }]}>{item.name}</Text>
                    <Text style={[st.gridTranslit, isMemo && { color: 'rgba(255,255,255,0.85)' }]}>{item.transliteration}</Text>
                    <Text style={[st.gridMeaning, isMemo && { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={2}>{item.meaning}</Text>
                    {isMemo && <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ position: 'absolute', top: 6, right: 6 }} />}
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            <FlatList
              ref={listRef}
              data={filteredNames}
              key="list"
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
              onScrollToIndexFailed={() => {}}
              renderItem={({ item }) => {
                const isMemo = memorized.has(item.id);
                const isExpanded = expandedId === item.id;
                return (
                  <TouchableOpacity
                    style={[st.listRow, isMemo && { borderLeftColor: palette.primaryDark, borderLeftWidth: 3 }]}
                    onPress={() => setExpandedId(isExpanded ? null : item.id)}
                    onLongPress={() => toggleMemorized(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={st.listHeader}>
                      <View style={[st.listNum, isMemo && { backgroundColor: palette.primaryDark }]}>
                        <Text style={[st.listNumText, isMemo && { color: '#fff' }]}>{item.id}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={st.listArabic}>{item.name}</Text>
                        <Text style={st.listTranslit}>{item.transliteration} — {item.meaning}</Text>
                      </View>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textSoft} />
                    </View>
                    {isExpanded && (
                      <View style={st.listDetail}>
                        <Text style={st.listBenefit}>{item.benefit}</Text>
                        <TouchableOpacity
                          style={[st.memoBtn, isMemo && st.memoBtnActive]}
                          onPress={() => toggleMemorized(item.id)}
                        >
                          <Ionicons name={isMemo ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={isMemo ? '#fff' : palette.primaryDark} />
                          <Text style={[st.memoBtnText, isMemo && { color: '#fff' }]}>
                            {isMemo ? 'Mémorisé' : 'Marquer comme mémorisé'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  progressBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: palette.primary, borderRadius: 14, padding: 16, marginBottom: 12 },
  progressTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 8 },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3 },
  progressBarFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  progressCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginLeft: 16 },
  progressPct: { fontSize: 14, fontWeight: '800', color: '#fff' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: palette.border },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: palette.text },
  viewToggle: { width: 40, height: 40, borderRadius: 10, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border },
  gridCard: { flex: 1, backgroundColor: palette.card, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: palette.border, minHeight: 110 },
  gridCardMemo: { backgroundColor: palette.primaryDark, borderColor: palette.primaryDark },
  gridNum: { fontSize: 10, color: palette.muted, fontWeight: '600', position: 'absolute', top: 6, left: 8 },
  gridArabic: { fontSize: 20, color: palette.arabic, fontFamily: 'Amiri-Regular', marginTop: 4 },
  gridTranslit: { fontSize: 10, color: palette.textSoft, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  gridMeaning: { fontSize: 9, color: palette.muted, textAlign: 'center', marginTop: 2 },
  listRow: { backgroundColor: palette.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: palette.border },
  listHeader: { flexDirection: 'row', alignItems: 'center' },
  listNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  listNumText: { fontSize: 12, fontWeight: '700', color: palette.text },
  listArabic: { fontSize: 20, color: palette.arabic, fontFamily: 'Amiri-Regular' },
  listTranslit: { fontSize: 12, color: palette.textSoft, marginTop: 2 },
  listDetail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: palette.border },
  listBenefit: { fontSize: 13, color: palette.text, lineHeight: 20, marginBottom: 10 },
  memoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F5F5F5', alignSelf: 'flex-start' },
  memoBtnActive: { backgroundColor: palette.primaryDark },
  memoBtnText: { fontSize: 12, fontWeight: '600', color: palette.primaryDark },
  quizContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  quizProgress: { fontSize: 14, color: palette.textSoft, textAlign: 'center', fontWeight: '600' },
  quizScore: { fontSize: 13, color: palette.primaryDark, textAlign: 'center', fontWeight: '700', marginTop: 4 },
  quizCard: { backgroundColor: palette.primary, borderRadius: 20, padding: 32, alignItems: 'center', marginVertical: 24 },
  quizArabic: { fontSize: 36, color: '#fff', fontFamily: 'Amiri-Bold' },
  quizTranslit: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: 8, fontWeight: '600' },
  quizQuestion: { fontSize: 16, fontWeight: '700', color: palette.text, textAlign: 'center', marginBottom: 16 },
  quizOptions: { gap: 10 },
  quizOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: palette.border },
  quizOptionText: { fontSize: 14, fontWeight: '600', color: palette.text, flex: 1 },
  quizExit: { marginTop: 24, alignItems: 'center' },
  quizExitText: { fontSize: 14, color: palette.textSoft, fontWeight: '600' },
});
