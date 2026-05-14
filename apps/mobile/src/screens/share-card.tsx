import { useCallback, useMemo, useState } from 'react';
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
import { BackButton } from '../components/BackButton';
import { palette } from '../theme';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 40;

// ─── Templates ────────────────────────────────────────────────────────────────

interface CardTemplate {
  id: string;
  category: 'ayah' | 'hadith' | 'dhikr' | 'name' | 'custom';
  label: string;
  arabic: string;
  transliteration?: string;
  translation: string;
  source: string;
  bg: string;
  accent: string;
  textColor: string;
}

const TEMPLATES: CardTemplate[] = [
  {
    id: 't1', category: 'ayah', label: 'Ayah — Confiance en Allah',
    arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
    translation: 'Celui qui place sa confiance en Allah — Il lui suffit.',
    source: 'Coran 65:3',
    bg: '#1B4332', accent: '#52B788', textColor: '#fff',
  },
  {
    id: 't2', category: 'ayah', label: 'Ayah — Rappel d\'Allah',
    arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    translation: 'C\'est par le rappel d\'Allah que les cœurs se tranquillisent.',
    source: 'Coran 13:28',
    bg: '#1A237E', accent: '#7986CB', textColor: '#fff',
  },
  {
    id: 't3', category: 'ayah', label: 'Ayah — Après la difficulté',
    arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
    translation: 'Car avec la difficulté vient la facilité.',
    source: 'Coran 94:5',
    bg: '#4A0E0E', accent: '#EF9A9A', textColor: '#fff',
  },
  {
    id: 't4', category: 'hadith', label: 'Hadith — Actions selon intentions',
    arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
    transliteration: 'Innamā al-a\'mālu bin-niyyāt',
    translation: 'Les actes ne valent que par les intentions.',
    source: 'Bukhari 1 — Muslim 1907',
    bg: '#33691E', accent: '#AED581', textColor: '#fff',
  },
  {
    id: 't5', category: 'hadith', label: 'Hadith — Sourire',
    arabic: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ صَدَقَةٌ',
    transliteration: 'Tabassumukal fī wajhi akhīka ṣadaqah',
    translation: 'Ton sourire à ton frère est une aumône.',
    source: 'Tirmidhi 1956',
    bg: '#F57F17', accent: '#FFD54F', textColor: '#333',
  },
  {
    id: 't6', category: 'dhikr', label: 'SubhanAllah wa bihamdih',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    transliteration: 'SubḥānAllāhi wa biḥamdih',
    translation: 'Gloire à Allah et Sa louange.',
    source: 'Muslim 2692',
    bg: '#006064', accent: '#80DEEA', textColor: '#fff',
  },
  {
    id: 't7', category: 'dhikr', label: 'Astaghfirullah',
    arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullāha wa atūbu ilayh',
    translation: 'Je demande pardon à Allah et me repens vers Lui.',
    source: 'Muslim 2702',
    bg: '#4A148C', accent: '#CE93D8', textColor: '#fff',
  },
  {
    id: 't8', category: 'name', label: 'Al-Rahman — Le Tout-Miséricordieux',
    arabic: 'الرَّحْمَٰنُ',
    transliteration: 'Ar-Raḥmān',
    translation: 'Le Tout-Miséricordieux — Sa miséricorde englobe toutes choses.',
    source: 'Coran 1:1',
    bg: '#880E4F', accent: '#F48FB1', textColor: '#fff',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ShareCardScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string>(TEMPLATES[0].id);
  const [customText, setCustomText] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const selectedCard = useMemo(
    () => TEMPLATES.find((t) => t.id === selectedId) ?? TEMPLATES[0],
    [selectedId]
  );

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return TEMPLATES;
    return TEMPLATES.filter((t) => t.category === activeFilter);
  }, [activeFilter]);

  const handleShare = useCallback(async () => {
    const card = selectedCard;
    const msg = [
      card.arabic,
      card.transliteration ? `\n${card.transliteration}` : '',
      `\n\n${card.translation}`,
      `\n\n— ${card.source}`,
      customText ? `\n\n${customText}` : '',
      '\n\n📲 Via Oumoul App',
    ].join('');

    await Share.share({ message: msg });
  }, [selectedCard, customText]);

  const FILTERS = [
    { id: 'all', label: 'Tout' },
    { id: 'ayah', label: 'Ayahs' },
    { id: 'hadith', label: 'Hadiths' },
    { id: 'dhikr', label: 'Dhikr' },
    { id: 'name', label: 'Noms Allah' },
  ];

  return (
    <View style={[sc.screen, { paddingTop: insets.top }]}>
      <View style={sc.header}>
        <BackButton onPress={onBack} />
        <Text style={sc.headerTitle}>Partager une citation</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Preview card */}
        <View style={[sc.previewCard, { backgroundColor: selectedCard.bg, width: CARD_W }]}>
          <View style={[sc.accentBar, { backgroundColor: selectedCard.accent }]} />
          <Text style={[sc.previewArabic, { color: selectedCard.textColor }]}>{selectedCard.arabic}</Text>
          {selectedCard.transliteration && (
            <Text style={[sc.previewTranslit, { color: selectedCard.accent }]}>{selectedCard.transliteration}</Text>
          )}
          <Text style={[sc.previewTrans, { color: selectedCard.textColor, opacity: 0.9 }]}>{selectedCard.translation}</Text>
          <View style={[sc.sourceRow, { borderTopColor: selectedCard.accent + '60' }]}>
            <Text style={[sc.previewSource, { color: selectedCard.accent }]}>{selectedCard.source}</Text>
            <Text style={[sc.appBrand, { color: selectedCard.accent }]}>Oumoul ✦</Text>
          </View>
          {customText ? (
            <Text style={[sc.previewCustom, { color: selectedCard.textColor, opacity: 0.7 }]}>{customText}</Text>
          ) : null}
        </View>

        {/* Share button */}
        <TouchableOpacity style={sc.shareBtn} onPress={() => void handleShare()}>
          <Ionicons name="share-social" size={20} color="#fff" />
          <Text style={sc.shareBtnText}>Partager cette citation</Text>
        </TouchableOpacity>

        {/* Custom message */}
        <View style={sc.customSection}>
          <Text style={sc.sectionLabel}>Message personnalisé (optionnel)</Text>
          <TextInput
            style={sc.customInput}
            placeholder="Ajouter un message personnel..."
            placeholderTextColor={palette.muted}
            value={customText}
            onChangeText={setCustomText}
            multiline
          />
        </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sc.filterScroll} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[sc.filterChip, activeFilter === f.id && sc.filterChipActive]}
              onPress={() => setActiveFilter(f.id)}
            >
              <Text style={[sc.filterText, activeFilter === f.id && { color: '#fff' }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Template grid */}
        <Text style={sc.sectionLabel2}>Choisir un modèle</Text>
        <View style={sc.grid}>
          {filtered.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[sc.gridItem, { backgroundColor: t.bg }, selectedId === t.id && sc.gridItemActive]}
              onPress={() => setSelectedId(t.id)}
            >
              <Text style={[sc.gridArabic, { color: t.textColor }]} numberOfLines={2}>{t.arabic}</Text>
              <Text style={[sc.gridLabel, { color: t.accent }]} numberOfLines={1}>{t.label}</Text>
              {selectedId === t.id && (
                <View style={[sc.selectedBadge, { backgroundColor: t.accent }]}>
                  <Ionicons name="checkmark" size={12} color={t.bg} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  previewCard: { alignSelf: 'center', borderRadius: 20, padding: 24, marginHorizontal: 20, marginTop: 8, marginBottom: 16 },
  accentBar: { height: 3, borderRadius: 2, width: 40, marginBottom: 16 },
  previewArabic: { fontSize: 26, fontFamily: 'Amiri-Regular', textAlign: 'right', lineHeight: 42, marginBottom: 12 },
  previewTranslit: { fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
  previewTrans: { fontSize: 15, lineHeight: 24, marginBottom: 16 },
  sourceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12 },
  previewSource: { fontSize: 12, fontWeight: '700' },
  appBrand: { fontSize: 11, fontWeight: '700', opacity: 0.8 },
  previewCustom: { fontSize: 12, fontStyle: 'italic', marginTop: 10 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, backgroundColor: palette.primaryDark, borderRadius: 14, paddingVertical: 14, marginBottom: 16 },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  customSection: { paddingHorizontal: 20, marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: palette.textSoft, marginBottom: 8 },
  customInput: { backgroundColor: palette.card, borderRadius: 10, padding: 12, fontSize: 14, color: palette.text, borderWidth: 1, borderColor: palette.border, minHeight: 60, textAlignVertical: 'top' },
  filterScroll: { marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  filterChipActive: { backgroundColor: palette.primaryDark, borderColor: palette.primaryDark },
  filterText: { fontSize: 13, fontWeight: '600', color: palette.textSoft },
  sectionLabel2: { fontSize: 13, fontWeight: '700', color: palette.textSoft, paddingHorizontal: 20, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  gridItem: { width: (SW - 52) / 2, borderRadius: 14, padding: 14, position: 'relative' },
  gridItemActive: { opacity: 1, borderWidth: 3, borderColor: '#fff' },
  gridArabic: { fontSize: 16, fontFamily: 'Amiri-Regular', textAlign: 'right', lineHeight: 26, marginBottom: 8 },
  gridLabel: { fontSize: 10, fontWeight: '700' },
  selectedBadge: { position: 'absolute', top: 8, left: 8, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
