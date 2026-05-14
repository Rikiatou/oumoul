import { useCallback, useMemo, useState } from 'react';
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
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { palette } from '../theme';
import { ALLAH_NAMES } from '../data/allah-names';
import { QURAN_WORDS } from '../data/quran-words';

interface SearchResult {
  id: string;
  type: 'feature' | 'allah_name' | 'quran_word' | 'tool';
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen?: string;
  meta?: string;
}

const FEATURE_ITEMS: SearchResult[] = [
  { id: 'f-prayer', type: 'feature', title: 'Horaires de prière', subtitle: 'Consulter les horaires de prière du jour', icon: 'time', screen: 'PrayerTracking' },
  { id: 'f-quran', type: 'feature', title: 'Lire le Coran', subtitle: 'Sourates, versets et traduction', icon: 'book', screen: '__CORAN_TAB__' },
  { id: 'f-track', type: 'feature', title: 'Suivi des prières', subtitle: 'Enregistrer et suivre tes prières', icon: 'checkmark-done', screen: 'PrayerTracking' },
  { id: 'f-audio', type: 'feature', title: 'Écouter le Coran', subtitle: 'Audio avec récitateurs', icon: 'musical-notes', screen: 'QuranAudio' },
  { id: 'f-hadith', type: 'feature', title: 'Hadith du jour', subtitle: 'Hadiths par thème avec favoris', icon: 'book', screen: 'HadithDaily' },
  { id: 'f-names', type: 'feature', title: '99 Noms d\'Allah', subtitle: 'Apprendre et mémoriser les noms', icon: 'heart', screen: 'AllahNames' },
  { id: 'f-tasbih', type: 'feature', title: 'Tasbih', subtitle: 'Compteur de dhikr', icon: 'radio-button-on', screen: 'Tasbih' },
  { id: 'f-mosque', type: 'feature', title: 'Mosquées à proximité', subtitle: 'Trouver les mosquées proches', icon: 'business', screen: 'MosqueFinder' },
  { id: 'f-zakat', type: 'feature', title: 'Calculateur Zakat', subtitle: 'Calculer la zakat sur tes biens', icon: 'calculator', screen: 'ZakatCalculator' },
  { id: 'f-eid', type: 'feature', title: 'Cartes de vœux', subtitle: 'Partager des vœux pour l\'Aïd', icon: 'gift', screen: 'EidGreetings' },
  { id: 'f-hijri', type: 'feature', title: 'Calendrier Hijri', subtitle: 'Dates islamiques', icon: 'calendar', screen: 'HijriCalendar' },
  { id: 'f-qibla', type: 'feature', title: 'Direction Qibla', subtitle: 'Boussole vers la Qibla', icon: 'compass', screen: 'Qibla' },
  { id: 'f-imane', type: 'feature', title: 'Programme Imane', subtitle: 'Programme de développement spirituel', icon: 'checkbox', screen: 'ImaneProgram' },
  { id: 'f-words', type: 'feature', title: 'Vocabulaire du Coran', subtitle: '400 mots les plus fréquents', icon: 'language', screen: 'QuranWords' },
  { id: 'f-ramadan', type: 'feature', title: 'Ramadan', subtitle: 'Suivi du jeûne et programme', icon: 'moon', screen: 'ImaneRamadan' },
  { id: 'f-dhikr', type: 'feature', title: 'Dhikr', subtitle: 'Invocations et rappels', icon: 'leaf', screen: 'Dhikr' },
  { id: 'f-settings', type: 'feature', title: 'Réglages prière', subtitle: 'Méthode de calcul et madhab', icon: 'settings', screen: 'PrayerSettingsMore' },
  { id: 'f-guide', type: 'feature', title: 'Guide de l\'app', subtitle: 'Découvre toutes les fonctionnalités', icon: 'help-circle', screen: 'AppGuide' },
];

function buildSearchIndex(): SearchResult[] {
  const results: SearchResult[] = [...FEATURE_ITEMS];

  // Add 99 Names of Allah
  for (const name of ALLAH_NAMES) {
    results.push({
      id: `name-${name.id}`,
      type: 'allah_name',
      title: name.name,
      subtitle: `${name.transliteration} — ${name.meaning}`,
      icon: 'heart',
      screen: 'AllahNames',
      meta: name.benefit,
    });
  }

  // Add Quran vocabulary words
  for (const word of QURAN_WORDS) {
    results.push({
      id: `word-${word.id}`,
      type: 'quran_word',
      title: word.arabic,
      subtitle: `${word.transliteration} — ${word.french}`,
      icon: 'language',
      screen: 'QuranWords',
      meta: word.category,
    });
  }

  return results;
}

const TYPE_LABELS: Record<string, string> = {
  feature: 'Fonctionnalité',
  allah_name: 'Nom d\'Allah',
  quran_word: 'Vocabulaire',
  tool: 'Outil',
};

const TYPE_COLORS: Record<string, string> = {
  feature: palette.primaryDark,
  allah_name: '#E91E63',
  quran_word: '#FF9800',
  tool: '#607D8B',
};

export function GlobalSearchScreen({ user, onBack, onNavigate }: { user: AuthUser; onBack: () => void; onNavigate: (screen: string) => void }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const searchIndex = useMemo(() => buildSearchIndex(), []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const scored = searchIndex
      .map((item) => {
        let score = 0;
        const titleLower = item.title.toLowerCase();
        const subtitleLower = item.subtitle.toLowerCase();
        const metaLower = (item.meta ?? '').toLowerCase();

        if (titleLower === q) score += 100;
        else if (titleLower.startsWith(q)) score += 80;
        else if (titleLower.includes(q)) score += 60;

        if (subtitleLower.includes(q)) score += 40;
        if (metaLower.includes(q)) score += 20;

        // Boost features
        if (item.type === 'feature') score += 10;

        return { item, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    return scored.map((r) => r.item);
  }, [query, searchIndex]);

  const recentFeatures = useMemo(() => FEATURE_ITEMS.slice(0, 8), []);

  const renderResult = useCallback(({ item }: { item: SearchResult }) => {
    const typeColor = TYPE_COLORS[item.type] ?? palette.muted;
    return (
      <TouchableOpacity
        style={st.resultCard}
        onPress={() => item.screen && onNavigate(item.screen)}
        activeOpacity={0.7}
      >
        <View style={[st.resultIcon, { backgroundColor: typeColor + '18' }]}>
          <Ionicons name={item.icon} size={20} color={typeColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.resultTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={st.resultSub} numberOfLines={1}>{item.subtitle}</Text>
        </View>
        <View style={[st.typeBadge, { backgroundColor: typeColor + '18' }]}>
          <Text style={[st.typeText, { color: typeColor }]}>{TYPE_LABELS[item.type] ?? item.type}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [onNavigate]);

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={st.header}>
        <BackButton onPress={onBack} />
        <View style={st.searchBar}>
          <Ionicons name="search" size={18} color={palette.muted} />
          <TextInput
            style={st.searchInput}
            placeholder="Rechercher dans l'app..."
            placeholderTextColor={palette.muted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={palette.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {query.trim().length === 0 ? (
        /* Quick access */
        <View style={st.quickSection}>
          <Text style={st.sectionTitle}>Accès rapide</Text>
          {recentFeatures.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={st.quickItem}
              onPress={() => item.screen && onNavigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={[st.quickIcon, { backgroundColor: palette.primaryDark + '18' }]}>
                <Ionicons name={item.icon} size={18} color={palette.primaryDark} />
              </View>
              <Text style={st.quickText}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={16} color={palette.muted} />
            </TouchableOpacity>
          ))}
        </View>
      ) : results.length === 0 ? (
        <View style={st.empty}>
          <Ionicons name="search-outline" size={48} color={palette.muted} />
          <Text style={st.emptyText}>Aucun résultat pour "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderResult}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ListHeaderComponent={
            <Text style={st.resultCount}>{results.length} résultat{results.length > 1 ? 's' : ''}</Text>
          }
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderWidth: 1, borderColor: palette.border },
  searchInput: { flex: 1, fontSize: 15, color: palette.text, padding: 0 },
  quickSection: { paddingHorizontal: 16, paddingTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: palette.text, marginBottom: 12 },
  quickItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  quickIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickText: { flex: 1, fontSize: 14, fontWeight: '500', color: palette.text },
  resultCount: { fontSize: 12, color: palette.muted, marginTop: 8, marginBottom: 8 },
  resultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: palette.border },
  resultIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 15, fontWeight: '600', color: palette.text },
  resultSub: { fontSize: 12, color: palette.muted, marginTop: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeText: { fontSize: 9, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, color: palette.muted },
});
