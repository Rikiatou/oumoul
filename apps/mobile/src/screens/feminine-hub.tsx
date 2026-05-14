import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/theme-context';

// ── Fiqh féminin content ─────────────────────────────────────────────────────
type FiqhItem = {
  question: string;
  answer: string;
  source?: string;
  category: string;
};

const FIQH_ITEMS: FiqhItem[] = [
  {
    category: 'Purification',
    question: 'Puis-je prier pendant mes règles ?',
    answer: 'Non. La prière (salat) est interdite pendant les règles (hayd). Tu n\'es pas tenue de les rattraper après ta purification. C\'est une facilité accordée par Allah.',
    source: 'Consensus des savants (Ijmā\')',
  },
  {
    category: 'Purification',
    question: 'Puis-je lire le Coran pendant mes règles ?',
    answer: 'Les savants divergent. La majorité interdit de toucher le Mushaf sans purification, mais certains autorisent la récitation orale sans le toucher. Tu peux utiliser une application sans restriction.',
    source: 'Fiqh al-Mar\'a — Ibn \'Uthaymīn & al-Nawawī',
  },
  {
    category: 'Purification',
    question: 'Quand reprendre la prière après les règles ?',
    answer: 'Dès que tu es purifiée (ghusl accompli et saignement arrêté), tu recommences les prières. Si le saignement s\'arrête avant Fajr, tu pries Fajr ce jour-là.',
    source: 'Al-Majmūʿ — al-Nawawī',
  },
  {
    category: 'Jeûne',
    question: 'Dois-je rattraper les jours de Ramadan manqués ?',
    answer: 'Oui. Les jours de jeûne ratés à cause des règles doivent être rattrapés (qadā\') avant le prochain Ramadan. Tu n\'as pas à payer de kaffarah, juste rattraper.',
    source: 'Hadith — Aïsha (ra) rapporté dans Bukhāri & Muslim',
  },
  {
    category: 'Jeûne',
    question: 'Puis-je faire du nafl (jeûne volontaire) pendant les règles ?',
    answer: 'Non. Le jeûne est interdit pendant les règles, qu\'il soit obligatoire ou volontaire.',
    source: 'Consensus (Ijmā\')',
  },
  {
    category: 'Prière',
    question: 'Comment calculer les prières de maquillage (qadā\') ?',
    answer: 'Pour les prières manquées par oubli ou sommeil : rattrape-les dès que tu te souviens. Pour la nifās (post-partum), les règles s\'appliquent similairement au hayd.',
    source: 'Hadith — Muslim 684',
  },
  {
    category: 'Nifās (post-partum)',
    question: 'Combien de temps dure le nifās ?',
    answer: 'Le maximum du nifās est de 40 jours selon la majorité des savants. Si le saignement s\'arrête avant, tu te purifies et reprends tes obligations (prière, jeûne).',
    source: 'Al-Mughnī — Ibn Qudāma',
  },
  {
    category: 'Hajj & Umra',
    question: 'Puis-je faire le Tawaf pendant mes règles ?',
    answer: 'Non. Le Tawaf autour de la Ka\'ba nécessite la pureté rituelle. Tous les autres rites du Hajj (Sa\'y, Wuqūf, etc.) sont permis pendant les règles.',
    source: 'Hadith — Aïsha (ra) — Bukhāri 1650',
  },
  {
    category: 'Du\'as & Dhikr',
    question: 'Puis-je faire du dhikr et des du\'as pendant mes règles ?',
    answer: 'Oui, absolument. Le dhikr (SubhanAllah, Alhamdulillah, etc.), les du\'as, l\'écoute du Coran et l\'assistance aux cours islamiques sont tous permis et recommandés.',
    source: 'Al-Majmūʿ — al-Nawawī',
  },
];

const CATEGORIES = [...new Set(FIQH_ITEMS.map((i) => i.category))];

type Tab = 'cycle' | 'fiqh' | 'duas';

const FEMININE_DUAS = [
  {
    title: 'Du\'a pendant les règles',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    transliteration: 'SubḥānAllāhi wa biḥamdih',
    note: 'Reste en dhikr constant — c\'est ta façon de rester proche d\'Allah',
    emoji: '🌸',
  },
  {
    title: 'Pour la facilité',
    arabic: 'رَبِّ يَسِّرْ وَلَا تُعَسِّرْ',
    transliteration: 'Rabbi yassir wa lā tuʿassir',
    note: 'Seigneur, facilite et ne complique pas',
    emoji: '🤲',
  },
  {
    title: 'Pour la sécurité des règles',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ',
    transliteration: 'Allāhumma innī asʾaluka al-ʿāfiyah',
    note: 'Ô Allah, je Te demande la santé et le bien-être',
    emoji: '💚',
  },
  {
    title: 'Istikhara féminine',
    arabic: 'اللَّهُمَّ خِرْ لِي وَاخْتَرْ لِي',
    transliteration: 'Allāhumma khir lī wakhtār lī',
    note: 'Ô Allah, choisis pour moi ce qui est le meilleur',
    emoji: '⭐',
  },
];

export function FeminineHubScreen({
  onBack,
  onOpenCycle,
}: {
  onBack: () => void;
  onOpenCycle: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { palette: p } = useTheme();
  const [tab, setTab] = useState<Tab>('cycle');
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const filteredItems = FIQH_ITEMS.filter((i) => i.category === activeCategory);

  return (
    <View style={[f.screen, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      {/* Header */}
      <View style={f.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={p.primaryDark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[f.headerTitle, { color: p.text }]}>🌸 Espace Sœurs</Text>
          <Text style={[f.headerSub, { color: p.textSoft }]}>Cycle, Fiqh féminin & Du'as</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={f.tabBar}>
        {([
          { key: 'cycle', label: 'Suivi cycle', emoji: '📅' },
          { key: 'fiqh', label: 'Fiqh', emoji: '📚' },
          { key: 'duas', label: "Du'as", emoji: '🤲' },
        ] as Array<{ key: Tab; label: string; emoji: string }>).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[f.tab, tab === t.key && { backgroundColor: '#EC4899' }]}
            onPress={() => setTab(t.key)}
          >
            <Text style={f.tabEmoji}>{t.emoji}</Text>
            <Text style={[f.tabLabel, tab === t.key && { color: '#fff' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── CYCLE TAB ── */}
      {tab === 'cycle' && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[f.cycleCard, { backgroundColor: '#EC489915', borderColor: '#EC489940' }]}
            onPress={onOpenCycle}
            activeOpacity={0.8}
          >
            <View style={[f.cycleIcon, { backgroundColor: '#EC489920' }]}>
              <Text style={{ fontSize: 32 }}>🌸</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[f.cycleTitle, { color: '#EC4899' }]}>Suivi du cycle</Text>
              <Text style={[f.cycleSub, { color: p.textSoft }]}>
                Suis tes règles, reçois des rappels pour reprendre tes prières et ton jeûne
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#EC4899" />
          </TouchableOpacity>

          <View style={[f.infoCard, { backgroundColor: p.card, borderColor: p.border }]}>
            <Text style={[f.infoTitle, { color: p.text }]}>📋 Rappels automatiques</Text>
            <Text style={[f.infoText, { color: p.textSoft }]}>
              L'app te rappellera discrètement de reprendre tes prières et ton jeûne après la fin de tes règles — sans jamais afficher de message explicite sur l'écran de verrouillage.
            </Text>
          </View>

          <View style={[f.infoCard, { backgroundColor: p.card, borderColor: p.border, marginTop: 12 }]}>
            <Text style={[f.infoTitle, { color: p.text }]}>🔒 Vie privée totale</Text>
            <Text style={[f.infoText, { color: p.textSoft }]}>
              Toutes tes données de cycle sont stockées uniquement sur ton appareil. Rien n'est envoyé à nos serveurs.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ── FIQH TAB ── */}
      {tab === 'fiqh' && (
        <View style={{ flex: 1 }}>
          {/* Category filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexShrink: 0 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[f.catChip, activeCategory === cat && { backgroundColor: '#EC4899', borderColor: '#EC4899' }, { borderColor: p.border }]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[f.catChipText, activeCategory === cat && { color: '#fff' }, { color: p.text }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {filteredItems.map((item) => {
              const isExpanded = expandedItem === item.question;
              return (
                <TouchableOpacity
                  key={item.question}
                  style={[f.fiqhCard, { backgroundColor: p.card, borderColor: isExpanded ? '#EC4899' : p.border }]}
                  onPress={() => setExpandedItem(isExpanded ? null : item.question)}
                  activeOpacity={0.8}
                >
                  <View style={f.fiqhQuestion}>
                    <Text style={[f.questionText, { color: p.text, flex: 1 }]}>{item.question}</Text>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={p.tabInactive} />
                  </View>
                  {isExpanded && (
                    <View style={f.fiqhAnswer}>
                      <Text style={[f.answerText, { color: p.text }]}>{item.answer}</Text>
                      {item.source && (
                        <Text style={[f.sourceText, { color: '#EC4899' }]}>📖 {item.source}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── DUAS TAB ── */}
      {tab === 'duas' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={[f.sectionLabel, { color: p.textSoft }]}>
            Ces du'as peuvent être récitées à tout moment, y compris pendant les règles.
          </Text>
          {FEMININE_DUAS.map((dua) => (
            <View key={dua.title} style={[f.duaCard, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={f.duaHeader}>
                <Text style={f.duaEmoji}>{dua.emoji}</Text>
                <Text style={[f.duaTitle, { color: p.text }]}>{dua.title}</Text>
              </View>
              <Text style={[f.duaArabic, { color: '#EC4899' }]}>{dua.arabic}</Text>
              <Text style={[f.duaTranslit, { color: p.textSoft }]}>{dua.transliteration}</Text>
              <Text style={[f.duaNote, { color: p.text }]}>{dua.note}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const f = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },

  tabBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)' },
  tabEmoji: { fontSize: 14 },
  tabLabel: { fontSize: 12, fontWeight: '700', color: '#555' },

  cycleCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, borderWidth: 1.5, marginBottom: 16, gap: 14 },
  cycleIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cycleTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  cycleSub: { fontSize: 13, lineHeight: 20 },

  infoCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  infoTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  infoText: { fontSize: 13, lineHeight: 20 },

  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, backgroundColor: 'transparent' },
  catChipText: { fontSize: 13, fontWeight: '600' },

  fiqhCard: { borderRadius: 16, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  fiqhQuestion: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  questionText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  fiqhAnswer: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  answerText: { fontSize: 14, lineHeight: 22 },
  sourceText: { fontSize: 12, fontStyle: 'italic' },

  sectionLabel: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  duaCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12, gap: 8 },
  duaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  duaEmoji: { fontSize: 22 },
  duaTitle: { fontSize: 15, fontWeight: '700' },
  duaArabic: { fontSize: 22, fontFamily: 'Amiri-Regular', textAlign: 'right' },
  duaTranslit: { fontSize: 13, fontStyle: 'italic' },
  duaNote: { fontSize: 13, lineHeight: 20 },
});
