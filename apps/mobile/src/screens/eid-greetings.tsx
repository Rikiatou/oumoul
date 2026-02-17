import { useCallback, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AuthUser } from '@oumoul/api';
import { palette } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

interface GreetingCard {
  id: string;
  occasion: 'eid_fitr' | 'eid_adha' | 'ramadan' | 'general';
  title: string;
  arabic: string;
  message: string;
  bgColor: string;
  accentColor: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const GREETING_CARDS: GreetingCard[] = [
  {
    id: 'fitr1',
    occasion: 'eid_fitr',
    title: 'Eid al-Fitr Moubarak',
    arabic: 'عِيدُ الْفِطْرِ مُبَارَكٌ',
    message: 'Qu\'Allah accepte notre jeûne et nos bonnes actions. Eid Moubarak à toi et ta famille !',
    bgColor: '#1A7F64',
    accentColor: '#FFC107',
    icon: 'moon',
  },
  {
    id: 'fitr2',
    occasion: 'eid_fitr',
    title: 'Taqabbal Allahu Minna',
    arabic: 'تَقَبَّلَ اللَّهُ مِنَّا وَمِنْكُمْ',
    message: 'Qu\'Allah accepte de nous et de vous. Que cette fête apporte joie et bénédictions.',
    bgColor: '#0D47A1',
    accentColor: '#64B5F6',
    icon: 'star',
  },
  {
    id: 'adha1',
    occasion: 'eid_adha',
    title: 'Eid al-Adha Moubarak',
    arabic: 'عِيدُ الْأَضْحَى مُبَارَكٌ',
    message: 'Qu\'Allah accepte nos sacrifices et nos prières. Eid Moubarak !',
    bgColor: '#BF360C',
    accentColor: '#FFAB91',
    icon: 'heart',
  },
  {
    id: 'adha2',
    occasion: 'eid_adha',
    title: 'Kull Am wa Antum Bikhair',
    arabic: 'كُلُّ عَامٍ وَأَنْتُمْ بِخَيْرٍ',
    message: 'Que chaque année vous trouve en bonne santé et dans la foi. Eid Moubarak !',
    bgColor: '#4A148C',
    accentColor: '#CE93D8',
    icon: 'sparkles',
  },
  {
    id: 'ramadan1',
    occasion: 'ramadan',
    title: 'Ramadan Moubarak',
    arabic: 'رَمَضَانُ مُبَارَكٌ',
    message: 'Qu\'Allah nous accorde un mois béni rempli de miséricorde et de pardon.',
    bgColor: '#1B5E20',
    accentColor: '#A5D6A7',
    icon: 'moon',
  },
  {
    id: 'ramadan2',
    occasion: 'ramadan',
    title: 'Ramadan Kareem',
    arabic: 'رَمَضَانُ كَرِيمٌ',
    message: 'Que ce Ramadan illumine ton cœur et renforce ta foi. Ramadan Kareem !',
    bgColor: '#004D40',
    accentColor: '#80CBC4',
    icon: 'sunny',
  },
  {
    id: 'general1',
    occasion: 'general',
    title: 'Barakallahu Fik',
    arabic: 'بَارَكَ اللَّهُ فِيكَ',
    message: 'Qu\'Allah te bénisse et bénisse ta famille. Que Sa lumière guide ton chemin.',
    bgColor: '#37474F',
    accentColor: '#B0BEC5',
    icon: 'hand-left',
  },
  {
    id: 'general2',
    occasion: 'general',
    title: 'Jumu\'ah Moubarak',
    arabic: 'جُمُعَةٌ مُبَارَكَةٌ',
    message: 'Que ce vendredi soit rempli de bénédictions et de prières exaucées.',
    bgColor: '#1A237E',
    accentColor: '#7986CB',
    icon: 'calendar',
  },
];

const OCCASIONS = [
  { key: 'all', label: 'Toutes' },
  { key: 'eid_fitr', label: 'Eid al-Fitr' },
  { key: 'eid_adha', label: 'Eid al-Adha' },
  { key: 'ramadan', label: 'Ramadan' },
  { key: 'general', label: 'Général' },
];

export function EidGreetingsScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [selectedOccasion, setSelectedOccasion] = useState('all');
  const [customMessage, setCustomMessage] = useState('');
  const [selectedCard, setSelectedCard] = useState<GreetingCard | null>(null);

  const filteredCards = selectedOccasion === 'all'
    ? GREETING_CARDS
    : GREETING_CARDS.filter((c) => c.occasion === selectedOccasion);

  const shareCard = useCallback(async (card: GreetingCard, extra?: string) => {
    const msg = [
      card.arabic,
      '',
      card.title,
      '',
      card.message,
      extra ? `\n${extra}` : '',
      '',
      '— Partagé via Oumoul',
    ].filter(Boolean).join('\n');

    try {
      await Share.share({ message: msg });
    } catch {}
  }, []);

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.backBtn}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Cartes de vœux</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Occasion Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterScroll} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {OCCASIONS.map((o) => (
          <TouchableOpacity
            key={o.key}
            style={[st.filterChip, selectedOccasion === o.key && st.filterChipActive]}
            onPress={() => setSelectedOccasion(o.key)}
          >
            <Text style={[st.filterChipText, selectedOccasion === o.key && st.filterChipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Card Detail */}
        {selectedCard ? (
          <View>
            <TouchableOpacity style={st.backToCards} onPress={() => setSelectedCard(null)}>
              <Ionicons name="arrow-back" size={16} color={palette.primaryDark} />
              <Text style={st.backToCardsText}>Retour aux cartes</Text>
            </TouchableOpacity>

            {/* Large Card Preview */}
            <View style={[st.cardLarge, { backgroundColor: selectedCard.bgColor }]}>
              <View style={st.cardDecor}>
                <Ionicons name={selectedCard.icon} size={80} color={selectedCard.accentColor} style={{ opacity: 0.2 }} />
              </View>
              <Ionicons name={selectedCard.icon} size={32} color={selectedCard.accentColor} />
              <Text style={st.cardLargeArabic}>{selectedCard.arabic}</Text>
              <Text style={st.cardLargeTitle}>{selectedCard.title}</Text>
              <Text style={st.cardLargeMsg}>{selectedCard.message}</Text>
              {customMessage.trim() ? (
                <Text style={st.cardCustomMsg}>{customMessage}</Text>
              ) : null}
            </View>

            {/* Custom Message */}
            <Text style={st.sectionTitle}>Message personnalisé (optionnel)</Text>
            <TextInput
              style={st.customInput}
              placeholder="Ajoute un message personnel..."
              placeholderTextColor={palette.muted}
              value={customMessage}
              onChangeText={setCustomMessage}
              multiline
              numberOfLines={3}
            />

            {/* Share Button */}
            <TouchableOpacity
              style={st.shareBtn}
              onPress={() => void shareCard(selectedCard, customMessage.trim())}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social" size={20} color="#fff" />
              <Text style={st.shareBtnText}>Partager</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Card Grid */
          <View style={st.cardGrid}>
            {filteredCards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={[st.cardSmall, { backgroundColor: card.bgColor }]}
                onPress={() => { setSelectedCard(card); setCustomMessage(''); }}
                activeOpacity={0.8}
              >
                <Ionicons name={card.icon} size={24} color={card.accentColor} />
                <Text style={st.cardSmallArabic}>{card.arabic}</Text>
                <Text style={st.cardSmallTitle}>{card.title}</Text>
                <Text style={st.cardSmallMsg} numberOfLines={2}>{card.message}</Text>
                <View style={st.cardShareHint}>
                  <Ionicons name="share-outline" size={14} color="rgba(255,255,255,0.6)" />
                  <Text style={st.cardShareHintText}>Partager</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  filterScroll: { maxHeight: 44, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  filterChipActive: { backgroundColor: palette.primaryDark, borderColor: palette.primaryDark },
  filterChipText: { fontSize: 13, fontWeight: '600', color: palette.textSoft },
  filterChipTextActive: { color: '#fff' },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardSmall: { width: (CARD_WIDTH - 12) / 2, borderRadius: 16, padding: 16, minHeight: 180 },
  cardSmallArabic: { fontSize: 16, color: '#fff', fontFamily: 'Amiri-Bold', marginTop: 10, textAlign: 'right' },
  cardSmallTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 8 },
  cardSmallMsg: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 4, lineHeight: 16 },
  cardShareHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: 10 },
  cardShareHintText: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  backToCards: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backToCardsText: { fontSize: 14, color: palette.primaryDark, fontWeight: '600' },
  cardLarge: { borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  cardDecor: { position: 'absolute', top: -20, right: -20 },
  cardLargeArabic: { fontSize: 28, color: '#fff', fontFamily: 'Amiri-Bold', marginTop: 16, textAlign: 'center' },
  cardLargeTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 12 },
  cardLargeMsg: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 12, textAlign: 'center', lineHeight: 22 },
  cardCustomMsg: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', marginTop: 12, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: palette.text, marginBottom: 10 },
  customInput: { backgroundColor: palette.card, borderRadius: 12, padding: 14, fontSize: 14, color: palette.text, borderWidth: 1, borderColor: palette.border, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: palette.primaryDark, borderRadius: 14, paddingVertical: 16 },
  shareBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
