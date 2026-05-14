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
import { QURAN_WORDS, WORD_CATEGORIES, QuranWord } from '../data/quran-words';
import { HelpTip } from '../components/HelpTip';
import { BackButton } from '../components/BackButton';

const LEARNED_KEY = 'oumoul_quran_words_learned';

export function QuranWordsScreen({ user, onBack, initialWordId }: { user: AuthUser; onBack: () => void; initialWordId?: number }) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [learned, setLearned] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [showLearnedOnly, setShowLearnedOnly] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Load persisted learned words
  useEffect(() => {
    SecureStore.getItemAsync(LEARNED_KEY).then((raw: string | null) => {
      if (raw) {
        try { setLearned(new Set(JSON.parse(raw) as number[])); } catch {}
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  // Persist learned words
  useEffect(() => {
    if (!loaded) return;
    SecureStore.setItemAsync(LEARNED_KEY, JSON.stringify([...learned])).catch(() => {});
  }, [learned, loaded]);

  const toggleLearned = useCallback((id: number) => {
    setLearned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Auto-scroll to initialWordId after load
  useEffect(() => {
    if (!initialWordId || !loaded) return;
    const idx = QURAN_WORDS.findIndex((w) => w.id === initialWordId);
    if (idx >= 0) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: Math.floor(idx / 2), animated: true, viewPosition: 0.3 });
      }, 400);
    }
  }, [initialWordId, loaded]);

  const filteredWords = useMemo(() => {
    let words = QURAN_WORDS;
    if (selectedCategory) {
      words = words.filter((w) => w.category === selectedCategory);
    }
    if (showLearnedOnly) {
      words = words.filter((w) => learned.has(w.id));
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      words = words.filter(
        (w) =>
          w.arabic.includes(q) ||
          w.transliteration.toLowerCase().includes(q) ||
          w.french.toLowerCase().includes(q)
      );
    }
    return words;
  }, [search, selectedCategory, showLearnedOnly, learned]);

  const stats = useMemo(() => {
    const total = QURAN_WORDS.length;
    const learnedCount = learned.size;
    const pct = total > 0 ? Math.round((learnedCount / total) * 100) : 0;
    return { total, learnedCount, pct };
  }, [learned]);

  const renderWord = useCallback(({ item }: { item: QuranWord }) => {
    const isLearned = learned.has(item.id);
    return (
      <TouchableOpacity
        style={[st.wordCard, isLearned && st.wordCardLearned]}
        onPress={() => toggleLearned(item.id)}
        activeOpacity={0.7}
        accessibilityLabel={`${item.arabic}, ${item.transliteration}, ${item.french}. ${isLearned ? 'Appris' : 'Non appris'}`}
        accessibilityRole="button"
      >
        <View style={st.wordTop}>
          <Text style={st.wordArabic}>{item.arabic}</Text>
          {isLearned && <Ionicons name="checkmark-circle" size={18} color="#388E3C" />}
        </View>
        <Text style={st.wordTranslit}>{item.transliteration}</Text>
        <Text style={st.wordFrench}>{item.french}</Text>
        <View style={st.wordMeta}>
          <Text style={st.wordCategory}>{item.category}</Text>
          <Text style={st.wordFreq}>×{item.frequency}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [learned, toggleLearned]);

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={st.header}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.headerTitle} accessibilityRole="header" numberOfLines={1}>Vocabulaire du Coran</Text>
          <Text style={st.headerSub}>{stats.learnedCount}/{stats.total} mots appris ({stats.pct}%)</Text>
        </View>
        <HelpTip screenName="Vocabulaire du Coran" tips={[
          { icon: 'language', title: '400 mots fréquents', description: 'Les 400 mots les plus fréquents du Coran, classés par catégorie.' },
          { icon: 'checkmark-circle', title: 'Marquer comme appris', description: 'Appuie sur un mot pour le marquer comme appris. Ta progression est sauvegardée.' },
          { icon: 'funnel', title: 'Filtrer par catégorie', description: 'Utilise les puces en haut pour filtrer par thème (Allah, Foi, Prière, etc.).' },
          { icon: 'filter', title: 'Mots appris uniquement', description: 'Appuie sur le bouton coché pour n\'afficher que les mots déjà appris.' },
          { icon: 'stats-chart', title: 'Fréquence', description: 'Le chiffre ×N indique combien de fois le mot apparaît dans le Coran.' },
        ]} />
        <TouchableOpacity
          onPress={() => setShowLearnedOnly(!showLearnedOnly)}
          style={[st.filterBtn, showLearnedOnly && st.filterBtnActive]}
        >
          <Ionicons name={showLearnedOnly ? 'checkmark-circle' : 'checkmark-circle-outline'} size={18} color={showLearnedOnly ? '#fff' : palette.primaryDark} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={st.progressBg}>
        <View style={[st.progressFill, { width: `${stats.pct}%` }]} />
      </View>

      {/* Search */}
      <View style={st.searchRow}>
        <Ionicons name="search" size={16} color={palette.muted} />
        <TextInput
          style={st.searchInput}
          placeholder="Rechercher un mot..."
          placeholderTextColor={palette.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={palette.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[null, ...WORD_CATEGORIES]}
        keyExtractor={(item) => item ?? 'all'}
        style={st.chipList}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item }) => {
          const isActive = item === selectedCategory;
          const label = item ?? 'Toutes';
          const count = item ? QURAN_WORDS.filter((w) => w.category === item).length : QURAN_WORDS.length;
          return (
            <TouchableOpacity
              style={[st.chip, isActive && st.chipActive]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[st.chipText, isActive && st.chipTextActive]} numberOfLines={2}>
                {label} ({count})
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Word list */}
      <FlatList
        ref={listRef}
        data={filteredWords}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderWord}
        numColumns={2}
        columnWrapperStyle={st.row}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        onScrollToIndexFailed={() => {}}
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons name="book-outline" size={40} color={palette.muted} />
            <Text style={st.emptyText}>Aucun mot trouvé</Text>
          </View>
        }
      />
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: palette.text },
  headerSub: { fontSize: 12, color: palette.muted, marginTop: 2 },
  filterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border },
  filterBtnActive: { backgroundColor: palette.primaryDark, borderColor: palette.primaryDark },
  progressBg: { height: 4, backgroundColor: palette.border, marginHorizontal: 16, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: palette.primaryDark, borderRadius: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, backgroundColor: palette.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderWidth: 1, borderColor: palette.border },
  searchInput: { flex: 1, fontSize: 14, color: palette.text, padding: 0 },
  chipList: { maxHeight: 64, marginTop: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, minHeight: 34, justifyContent: 'center' },
  chipActive: { backgroundColor: palette.primaryDark, borderColor: palette.primaryDark },
  chipText: { fontSize: 12, color: palette.text, fontWeight: '500', lineHeight: 14 },
  chipTextActive: { color: '#fff' },
  row: { gap: 10, marginTop: 10 },
  wordCard: { flex: 1, backgroundColor: palette.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: palette.border },
  wordCardLearned: { borderColor: '#388E3C', backgroundColor: '#E8F5E9' },
  wordTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordArabic: { fontSize: 24, fontWeight: '700', color: palette.primaryDark, fontFamily: undefined },
  wordTranslit: { fontSize: 13, color: palette.text, fontWeight: '600', marginTop: 4 },
  wordFrench: { fontSize: 12, color: palette.muted, marginTop: 2 },
  wordMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  wordCategory: { fontSize: 9, color: palette.muted, backgroundColor: palette.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  wordFreq: { fontSize: 9, color: palette.muted },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: palette.muted },
});
