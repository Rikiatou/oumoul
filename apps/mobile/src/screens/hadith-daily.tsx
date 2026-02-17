import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser, HadithItem } from '@oumoul/api';
import { palette } from '../theme';
import { HelpTip } from '../components/HelpTip';
import { offlineCache, CACHE_KEYS, CACHE_TTL } from '../utils/offline-cache';

const HADITH_FAVS_KEY = 'oumoul_hadith_favorites';

const TOPICS = [
  { key: 'all', label: 'Tous' },
  { key: 'faith', label: 'Foi' },
  { key: 'prayer', label: 'Prière' },
  { key: 'charity', label: 'Charité' },
  { key: 'patience', label: 'Patience' },
  { key: 'knowledge', label: 'Savoir' },
  { key: 'family', label: 'Famille' },
  { key: 'manners', label: 'Bonnes manières' },
];

// Offline hadith collection for when API is unavailable
const OFFLINE_HADITHS: Array<{ topic: string; hadith: HadithItem }> = [
  {
    topic: 'faith',
    hadith: {
      collection: 'Sahih al-Bukhari',
      hadithNumber: '1',
      text: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى\n\nLes actes ne valent que par les intentions, et chacun n\'aura que ce qu\'il a eu réellement l\'intention de faire.',
      reference: 'Sahih al-Bukhari 1',
    },
  },
  {
    topic: 'manners',
    hadith: {
      collection: 'Sahih Muslim',
      hadithNumber: '2564',
      text: 'لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ\n\nAucun d\'entre vous ne sera véritablement croyant tant qu\'il n\'aimera pas pour son frère ce qu\'il aime pour lui-même.',
      reference: 'Sahih Muslim 45',
    },
  },
  {
    topic: 'prayer',
    hadith: {
      collection: 'Sahih al-Bukhari',
      hadithNumber: '527',
      text: 'أَقْرَبُ مَا يَكُونُ الْعَبْدُ مِنْ رَبِّهِ وَهُوَ سَاجِدٌ\n\nLe serviteur est le plus proche de son Seigneur lorsqu\'il est en prosternation.',
      reference: 'Sahih Muslim 482',
    },
  },
  {
    topic: 'charity',
    hadith: {
      collection: 'Sahih al-Bukhari',
      hadithNumber: '1410',
      text: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ\n\nTon sourire à ton frère est une aumône.',
      reference: 'Jami at-Tirmidhi 1956',
    },
  },
  {
    topic: 'patience',
    hadith: {
      collection: 'Sahih Muslim',
      hadithNumber: '2999',
      text: 'عَجَبًا لأَمْرِ الْمُؤْمِنِ إِنَّ أَمْرَهُ كُلَّهُ خَيْرٌ\n\nQue l\'affaire du croyant est étonnante ! Tout ce qui lui arrive est un bien pour lui.',
      reference: 'Sahih Muslim 2999',
    },
  },
  {
    topic: 'knowledge',
    hadith: {
      collection: 'Sunan Ibn Majah',
      hadithNumber: '224',
      text: 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ\n\nLa recherche du savoir est une obligation pour chaque musulman.',
      reference: 'Sunan Ibn Majah 224',
    },
  },
  {
    topic: 'family',
    hadith: {
      collection: 'Sahih al-Bukhari',
      hadithNumber: '5971',
      text: 'الْجَنَّةُ تَحْتَ أَقْدَامِ الأُمَّهَاتِ\n\nLe Paradis se trouve sous les pieds des mères.',
      reference: 'Sunan an-Nasa\'i 3104',
    },
  },
  {
    topic: 'faith',
    hadith: {
      collection: 'Sahih Muslim',
      hadithNumber: '2687',
      text: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ\n\nCelui qui emprunte un chemin à la recherche du savoir, Allah lui facilite un chemin vers le Paradis.',
      reference: 'Sahih Muslim 2699',
    },
  },
  {
    topic: 'manners',
    hadith: {
      collection: 'Jami at-Tirmidhi',
      hadithNumber: '2018',
      text: 'خَيْرُكُمْ خَيْرُكُمْ لأَهْلِهِ وَأَنَا خَيْرُكُمْ لأَهْلِي\n\nLe meilleur d\'entre vous est celui qui est le meilleur envers sa famille, et je suis le meilleur d\'entre vous envers ma famille.',
      reference: 'Jami at-Tirmidhi 3895',
    },
  },
  {
    topic: 'prayer',
    hadith: {
      collection: 'Sahih al-Bukhari',
      hadithNumber: '6502',
      text: 'إِنَّ اللَّهَ قَالَ مَنْ عَادَى لِي وَلِيًّا فَقَدْ آذَنْتُهُ بِالْحَرْبِ وَمَا تَقَرَّبَ إِلَيَّ عَبْدِي بِشَيْءٍ أَحَبَّ إِلَيَّ مِمَّا افْتَرَضْتُ عَلَيْهِ\n\nMon serviteur ne se rapproche pas de Moi par quelque chose de plus aimé de Moi que ce que Je lui ai rendu obligatoire.',
      reference: 'Sahih al-Bukhari 6502',
    },
  },
];

function getDailyHadith(): { topic: string; hadith: HadithItem } {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return OFFLINE_HADITHS[dayOfYear % OFFLINE_HADITHS.length];
}

function getHadithsByTopic(topic: string): Array<{ topic: string; hadith: HadithItem }> {
  if (topic === 'all') return OFFLINE_HADITHS;
  return OFFLINE_HADITHS.filter((h) => h.topic === topic);
}

export function HadithDailyScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [favsLoaded, setFavsLoaded] = useState(false);

  // Load persisted favorites
  useEffect(() => {
    SecureStore.getItemAsync(HADITH_FAVS_KEY).then((raw: string | null) => {
      if (raw) {
        try { setFavorites(new Set(JSON.parse(raw) as string[])); } catch {}
      }
      setFavsLoaded(true);
    }).catch(() => setFavsLoaded(true));
  }, []);

  // Persist favorites on change
  useEffect(() => {
    if (!favsLoaded) return;
    SecureStore.setItemAsync(HADITH_FAVS_KEY, JSON.stringify([...favorites])).catch(() => {});
  }, [favorites, favsLoaded]);

  const dailyHadith = useMemo(() => getDailyHadith(), []);
  const topicHadiths = useMemo(() => getHadithsByTopic(selectedTopic), [selectedTopic]);

  const toggleFavorite = useCallback((ref: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  }, []);

  const shareHadith = useCallback(async (hadith: HadithItem) => {
    try {
      await Share.share({
        message: `${hadith.text}\n\n— ${hadith.reference ?? hadith.collection}\n\nPartagé via Oumoul`,
      });
    } catch {}
  }, []);

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.backBtn} accessibilityLabel="Retour" accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <Text style={st.headerTitle} accessibilityRole="header">Hadith du jour</Text>
        <HelpTip screenName="Hadith du jour" tips={[
          { icon: 'book', title: 'Hadith quotidien', description: 'Un nouveau hadith est affiché chaque jour automatiquement.' },
          { icon: 'pricetags', title: 'Filtrer par thème', description: 'Appuie sur un thème (foi, prière, charité...) pour filtrer les hadiths.' },
          { icon: 'heart', title: 'Favoris', description: 'Appuie sur le cœur pour sauvegarder un hadith. Tes favoris sont persistants.' },
          { icon: 'share-social', title: 'Partager', description: 'Appuie sur l\'icône de partage pour envoyer un hadith à tes proches.' },
        ]} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Daily Hadith Card */}
        <View style={st.dailyCard}>
          <View style={st.dailyBadge}>
            <Ionicons name="star" size={14} color="#FFC107" />
            <Text style={st.dailyBadgeText}>Hadith du jour</Text>
          </View>
          <Text style={st.dailyArabic}>
            {dailyHadith.hadith.text.split('\n\n')[0]}
          </Text>
          <Text style={st.dailyTranslation}>
            {dailyHadith.hadith.text.split('\n\n')[1] ?? dailyHadith.hadith.text}
          </Text>
          <View style={st.dailyFooter}>
            <Text style={st.dailyRef}>{dailyHadith.hadith.reference ?? dailyHadith.hadith.collection}</Text>
            <View style={st.dailyActions}>
              <TouchableOpacity onPress={() => toggleFavorite(dailyHadith.hadith.hadithNumber)}>
                <Ionicons
                  name={favorites.has(dailyHadith.hadith.hadithNumber) ? 'heart' : 'heart-outline'}
                  size={20}
                  color={favorites.has(dailyHadith.hadith.hadithNumber) ? '#D32F2F' : palette.textSoft}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void shareHadith(dailyHadith.hadith)}>
                <Ionicons name="share-outline" size={20} color={palette.textSoft} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Topic Filter */}
        <Text style={st.sectionTitle}>Explorer par thème</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
          {TOPICS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[st.topicChip, selectedTopic === t.key && st.topicChipActive]}
              onPress={() => setSelectedTopic(t.key)}
            >
              <Text style={[st.topicChipText, selectedTopic === t.key && st.topicChipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Hadith List */}
        {topicHadiths.map((item, idx) => {
          const isExpanded = expandedIdx === idx;
          const arabicPart = item.hadith.text.split('\n\n')[0];
          const translationPart = item.hadith.text.split('\n\n')[1] ?? item.hadith.text;
          const isFav = favorites.has(item.hadith.hadithNumber);

          return (
            <TouchableOpacity
              key={idx}
              style={st.hadithCard}
              onPress={() => setExpandedIdx(isExpanded ? null : idx)}
              activeOpacity={0.7}
            >
              <View style={st.hadithHeader}>
                <View style={st.hadithTopicBadge}>
                  <Text style={st.hadithTopicText}>
                    {TOPICS.find((t) => t.key === item.topic)?.label ?? item.topic}
                  </Text>
                </View>
                <Text style={st.hadithCollection}>{item.hadith.collection}</Text>
              </View>

              <Text style={st.hadithArabic} numberOfLines={isExpanded ? undefined : 2}>{arabicPart}</Text>
              <Text style={st.hadithTranslation} numberOfLines={isExpanded ? undefined : 3}>{translationPart}</Text>

              {isExpanded && (
                <View style={st.hadithFooter}>
                  <Text style={st.hadithRef}>{item.hadith.reference}</Text>
                  <View style={st.hadithActions}>
                    <TouchableOpacity onPress={() => toggleFavorite(item.hadith.hadithNumber)}>
                      <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? '#D32F2F' : palette.textSoft} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => void shareHadith(item.hadith)}>
                      <Ionicons name="share-outline" size={18} color={palette.textSoft} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  dailyCard: { backgroundColor: palette.primary, borderRadius: 16, padding: 20, marginBottom: 20 },
  dailyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  dailyBadgeText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  dailyArabic: { fontSize: 20, color: '#fff', fontFamily: 'Amiri-Bold', lineHeight: 32, marginBottom: 12, textAlign: 'right' },
  dailyTranslation: { fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 22, marginBottom: 12 },
  dailyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dailyRef: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  dailyActions: { flexDirection: 'row', gap: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: palette.text, marginBottom: 12 },
  topicChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  topicChipActive: { backgroundColor: palette.primaryDark, borderColor: palette.primaryDark },
  topicChipText: { fontSize: 13, fontWeight: '600', color: palette.textSoft },
  topicChipTextActive: { color: '#fff' },
  hadithCard: { backgroundColor: palette.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: palette.border },
  hadithHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  hadithTopicBadge: { backgroundColor: palette.accentLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  hadithTopicText: { fontSize: 10, fontWeight: '700', color: palette.primaryDark },
  hadithCollection: { fontSize: 10, color: palette.muted, fontWeight: '500' },
  hadithArabic: { fontSize: 17, color: palette.arabic, fontFamily: 'Amiri-Regular', lineHeight: 28, textAlign: 'right', marginBottom: 8 },
  hadithTranslation: { fontSize: 13, color: palette.text, lineHeight: 20 },
  hadithFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: palette.border },
  hadithRef: { fontSize: 11, color: palette.muted, fontWeight: '600' },
  hadithActions: { flexDirection: 'row', gap: 16 },
});
