import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/theme-context';

// ── Mood → Islamic guidance mapping ──────────────────────────────────────────
type Guidance = {
  ayah?: string;
  surahRef?: string;
  hadith?: string;
  dua?: string;
  duaArabic?: string;
  advice: string;
  color: string;
};

type Mood = {
  key: string;
  emoji: string;
  label: string;
  sub: string;
  color: string;
  guidance: Guidance[];
};

const MOODS: Mood[] = [
  {
    key: 'stress',
    emoji: '😰',
    label: 'Stressé / Anxieux',
    sub: 'Inquiétude, pression, tension',
    color: '#EF4444',
    guidance: [
      {
        ayah: '«  أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ  »',
        surahRef: `Ar-Ra’d 13:28`,
        advice: `C'est par le dhikr d'Allah que les cœurs trouvent la tranquillité. Répète "Subhan Allah" 33 fois.`,
        dua: 'Allāhumma inni aʿudhu bika minal-hammi wal-ḥazan',
        duaArabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ',
        color: '#EF4444',
      },
      {
        hadith: 'Le Prophète ﷺ a dit : "Que la paix et la tranquillité descendent sur celui qui dit : Lā ilāha illā Allāh"',
        advice: 'Fais 2 rak\'ats de prière nawafil. Allah est avec les patients.',
        color: '#EF4444',
      },
    ],
  },
  {
    key: 'sad',
    emoji: '😢',
    label: 'Triste / Déprimé',
    sub: 'Chagrin, mélancolie, vide intérieur',
    color: '#6366F1',
    guidance: [
      {
        ayah: '«  إِنَّ مَعَ الْعُسْرِ يُسْرًا  »',
        surahRef: 'Al-Inshirah 94:6',
        advice: 'Après chaque épreuve vient l\'aisance. Allah n\'abandonne jamais Ses serviteurs sincères.',
        dua: 'Ḥasbunallāhu wa niʿmal-wakīl',
        duaArabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
        color: '#6366F1',
      },
      {
        ayah: '«  وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ  »',
        surahRef: 'Āl ʿImrān 3:139',
        advice: 'Ne te décourage pas. Lis Sourate Ad-Duha — elle fut révélée pour consoler le Prophète ﷺ dans sa peine.',
        color: '#6366F1',
      },
    ],
  },
  {
    key: 'angry',
    emoji: '😡',
    label: 'En colère',
    sub: 'Frustration, irritation, injustice',
    color: '#F97316',
    guidance: [
      {
        hadith: 'Le Prophète ﷺ a dit : "Ce n\'est pas le fort celui qui terrasse les gens, mais celui qui se maîtrise au moment de la colère."',
        advice: 'Dis "Aʿūdhu billāhi minash-shayṭāni r-rajīm", fais les ablutions et change de position.',
        dua: 'Aʿūdhu billāhi minash-shayṭāni r-rajīm',
        duaArabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
        color: '#F97316',
      },
      {
        ayah: '«  وَالْكَاظِمِينَ الْغَيْظَ وَالْعَافِينَ عَنِ النَّاسِ  »',
        surahRef: 'Āl ʿImrān 3:134',
        advice: 'Ceux qui ravallent leur colère et pardonnent aux gens — Allah les aime. Pardonne et sois élevé.',
        color: '#F97316',
      },
    ],
  },
  {
    key: 'lonely',
    emoji: '🫂',
    label: 'Seul / Isolé',
    sub: 'Solitude, sentiment d\'abandon',
    color: '#8B5CF6',
    guidance: [
      {
        ayah: '«  وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ  »',
        surahRef: 'Al-Ḥadīd 57:4',
        advice: 'Allah est avec toi où que tu sois. Tu n\'es jamais vraiment seul. Parle-Lui dans tes sajdas.',
        color: '#8B5CF6',
      },
      {
        hadith: 'Allah dit : "Je suis avec Mon serviteur quand il pense à Moi et Mes lèvres bougent en Mon souvenir."',
        advice: 'Fais une longue sajda et parle à Allah comme tu parles à un ami. Il entend tout.',
        dua: 'Yā Ḥayyu yā Qayyūm, bi-raḥmatika astaghīth',
        duaArabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ',
        color: '#8B5CF6',
      },
    ],
  },
  {
    key: 'grateful',
    emoji: '🤲',
    label: 'Reconnaissant',
    sub: 'Paix intérieure, bonheur, gratitude',
    color: '#10B981',
    guidance: [
      {
        ayah: '«  لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ  »',
        surahRef: 'Ibrāhīm 14:7',
        advice: 'Si tu es reconnaissant, Allah augmentera Ses bienfaits. Exprime ta gratitude par 2 rak\'ats de chukr.',
        dua: 'Alḥamdu lillāhi ʿalā kulli ḥāl',
        duaArabic: 'الْحَمْدُ لِلَّهِ عَلَى كُلِّ حَالٍ',
        color: '#10B981',
      },
    ],
  },
  {
    key: 'lost',
    emoji: '😕',
    label: 'Perdu / Incertain',
    sub: 'Doutes, pas de direction, hésitation',
    color: '#0EA5E9',
    guidance: [
      {
        ayah: '«  اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ  »',
        surahRef: 'Al-Fātiḥa 1:6',
        advice: 'Tu récites cette demande 17 fois par jour dans tes prières. Allah guide ceux qui cherchent sincèrement.',
        dua: 'Allāhumma inna nasʾaluka al-hudā',
        duaArabic: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ الْهُدَى',
        color: '#0EA5E9',
      },
      {
        hadith: 'Le Prophète ﷺ faisait l\'Istikharah pour toute décision. Fais 2 rak\'ats et demande à Allah de guider ton choix.',
        advice: 'Lis Sourate Al-Kahf. Fais l\'Istikharah. La clarté vient avec la patience et la tawakkul.',
        color: '#0EA5E9',
      },
    ],
  },
  {
    key: 'weak',
    emoji: '😔',
    label: 'Faible dans ma foi',
    sub: 'Imane bas, éloigné d\'Allah',
    color: '#D97706',
    guidance: [
      {
        hadith: 'Le Prophète ﷺ a dit : "L\'imane s\'use comme se déchire un vêtement, alors renouvelez votre foi avec Lā ilāha illā Allāh."',
        advice: 'Commence petit : une sourate le matin, un hadith le soir. Ne te juge pas — reviens juste.',
        dua: 'Yā Muqallibal-qulūb, thabbit qalbī ʿalā dīnik',
        duaArabic: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ',
        color: '#D97706',
      },
      {
        ayah: '«  قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ  »',
        surahRef: 'Az-Zumar 39:53',
        advice: 'Dis : "Ô Mes serviteurs qui avez péché contre vous-mêmes, ne désespérez jamais de la miséricorde d\'Allah."',
        color: '#D97706',
      },
    ],
  },
  {
    key: 'happy',
    emoji: '😊',
    label: 'Heureux / En forme',
    sub: 'Énergie, motivation, joie',
    color: '#1A7F64',
    guidance: [
      {
        advice: 'Al-Hamdulillah ! C\'est le moment de donner : une Sadaqa, un Quran récité, une aide apportée.',
        dua: 'Allāhumma kama aḥsanta khalqī fa-aḥsin khuluqī',
        duaArabic: 'اللَّهُمَّ كَمَا أَحْسَنتَ خَلْقِي فَأَحْسِنْ خُلُقِي',
        color: '#1A7F64',
      },
      {
        ayah: '«  وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ  »',
        surahRef: 'Aḍ-Ḍuḥā 93:11',
        advice: 'Parle des bienfaits d\'Allah autour de toi. Le bonheur partagé se multiplie.',
        color: '#1A7F64',
      },
    ],
  },
];

type JournalEntry = {
  id: string;
  date: string; // ISO
  moodKey: string;
  moodEmoji: string;
  moodLabel: string;
  note: string;
};

const JOURNAL_KEY = 'oumoul.mood.journal';

export function MoodGuidanceScreen({ onBack, user }: { onBack: () => void; user?: { email: string } }) {
  const insets = useSafeAreaInsets();
  const { palette: p } = useTheme();
  const [selected, setSelected] = useState<Mood | null>(null);
  const [tab, setTab] = useState<'guidance' | 'journal'>('guidance');
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [journalLoaded, setJournalLoaded] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [savedMood, setSavedMood] = useState<Mood | null>(null);
  const journalKey = `${JOURNAL_KEY}.${user?.email ?? 'guest'}`;

  useEffect(() => {
    SecureStore.getItemAsync(journalKey).then((raw) => {
      if (raw) setJournal(JSON.parse(raw) as JournalEntry[]);
    }).catch(() => {}).finally(() => setJournalLoaded(true));
  }, [journalKey]);

  const saveEntry = useCallback((mood: Mood, note: string) => {
    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      moodKey: mood.key,
      moodEmoji: mood.emoji,
      moodLabel: mood.label,
      note: note.trim(),
    };
    setJournal((prev) => {
      const updated = [entry, ...prev].slice(0, 200);
      void SecureStore.setItemAsync(journalKey, JSON.stringify(updated));
      return updated;
    });
    setSavedMood(mood);
    setNoteInput('');
    setTab('journal');
  }, [journalKey]);

  const deleteEntry = useCallback((id: string) => {
    setJournal((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      void SecureStore.setItemAsync(journalKey, JSON.stringify(updated));
      return updated;
    });
  }, [journalKey]);

  if (selected && tab === 'guidance') {
    return (
      <View style={[m.screen, { paddingTop: insets.top, backgroundColor: p.bg }]}>
        <View style={m.header}>
          <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color={p.primaryDark} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[m.headerTitle, { color: p.text }]}>{selected.emoji} {selected.label}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <View style={[m.moodBanner, { backgroundColor: selected.color + '12', borderColor: selected.color + '30' }]}>
            <Text style={m.moodBannerEmoji}>{selected.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[m.moodBannerLabel, { color: selected.color }]}>{selected.label}</Text>
              <Text style={[m.moodBannerSub, { color: p.textSoft }]}>{selected.sub}</Text>
            </View>
          </View>

          {selected.guidance.map((g, i) => (
            <View key={i} style={[m.guidanceCard, { backgroundColor: p.card, borderColor: p.border }]}>
              {g.ayah && (
                <View style={m.ayahBlock}>
                  <Text style={[m.ayahText, { color: p.primaryDark }]}>{g.ayah}</Text>
                  {g.surahRef && <Text style={[m.surahRef, { color: p.textSoft }]}>{g.surahRef}</Text>}
                </View>
              )}
              {g.hadith && (
                <View style={[m.hadithBlock, { backgroundColor: p.bg, borderColor: p.border }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={p.primaryDark} style={{ marginBottom: 6 }} />
                  <Text style={[m.hadithText, { color: p.text }]}>{g.hadith}</Text>
                </View>
              )}
              <Text style={[m.adviceText, { color: p.text }]}>{g.advice}</Text>
              {g.duaArabic && (
                <View style={[m.duaBox, { backgroundColor: p.primaryDark + '0D', borderColor: p.primaryDark + '25' }]}>
                  <Text style={[m.duaArabic, { color: p.primaryDark }]}>{g.duaArabic}</Text>
                  {g.dua && <Text style={[m.duaTranslit, { color: p.textSoft }]}>{g.dua}</Text>}
                </View>
              )}
            </View>
          ))}

          {/* Journal quick-save from guidance */}
          <View style={[m.journalSaveBox, { backgroundColor: p.card, borderColor: p.border }]}>
            <Text style={[m.journalSaveTitle, { color: p.text }]}>📝 Note dans ton journal</Text>
            <TextInput
              style={[m.journalInput, { backgroundColor: p.bg, color: p.text, borderColor: p.border }]}
              placeholder="Une réflexion, une gratitude, une dua reçue..."
              placeholderTextColor={p.textSoft}
              multiline
              numberOfLines={3}
              value={noteInput}
              onChangeText={setNoteInput}
            />
            <TouchableOpacity
              style={[m.journalSaveBtn, { backgroundColor: p.primaryDark }]}
              onPress={() => saveEntry(selected!, noteInput)}
            >
              <Text style={m.journalSaveBtnText}>Sauvegarder dans le journal</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[m.backBtn, { backgroundColor: p.primaryDark }]}
            onPress={() => setSelected(null)}
          >
            <Text style={m.backBtnText}>← Choisir un autre état</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[m.screen, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      <View style={m.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={p.primaryDark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[m.headerTitle, { color: p.text }]}>💚 Guidance selon ton état</Text>
          <Text style={[m.headerSub, { color: p.textSoft }]}>Allah a une réponse pour chaque moment</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={m.tabRow}>
        <TouchableOpacity style={[m.tabBtn, tab === 'guidance' && { backgroundColor: p.primaryDark }]} onPress={() => setTab('guidance')}>
          <Text style={[m.tabBtnText, tab === 'guidance' && { color: '#fff' }]}>Guidance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[m.tabBtn, tab === 'journal' && { backgroundColor: p.primaryDark }]} onPress={() => setTab('journal')}>
          <Text style={[m.tabBtnText, tab === 'journal' && { color: '#fff' }]}>Journal ({journal.length})</Text>
        </TouchableOpacity>
      </View>

      {tab === 'guidance' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={[m.question, { color: p.text }]}>Comment tu te sens en ce moment ?</Text>
          <Text style={[m.questionSub, { color: p.textSoft }]}>
            Choisis ce qui se rapproche le plus de ton état et reçois des versets, hadiths et du'as adaptés.
          </Text>

          {MOODS.map((mood) => (
            <TouchableOpacity
              key={mood.key}
              style={[m.moodCard, { backgroundColor: p.card, borderColor: p.border }]}
              onPress={() => setSelected(mood)}
              activeOpacity={0.75}
            >
              <View style={[m.moodIcon, { backgroundColor: mood.color + '15' }]}>
                <Text style={m.moodEmoji}>{mood.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[m.moodLabel, { color: p.text }]}>{mood.label}</Text>
                <Text style={[m.moodSub, { color: p.textSoft }]}>{mood.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={p.tabInactive} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {tab === 'journal' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {savedMood && (
            <View style={[m.savedBanner, { backgroundColor: p.primaryDark + '15', borderColor: p.primaryDark + '30' }]}>
              <Text style={[m.savedBannerText, { color: p.primaryDark }]}>✓ Entrée enregistrée — {savedMood.emoji} {savedMood.label}</Text>
            </View>
          )}
          {journal.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 48 }}>📖</Text>
              <Text style={[m.question, { color: p.text, fontSize: 16, textAlign: 'center' }]}>Aucune entrée</Text>
              <Text style={[m.questionSub, { color: p.textSoft, textAlign: 'center' }]}>Choisis un état et note ta réflexion</Text>
            </View>
          ) : journal.map((entry) => (
            <View key={entry.id} style={[m.journalCard, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={m.journalCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text style={{ fontSize: 20 }}>{entry.moodEmoji}</Text>
                  <View>
                    <Text style={[m.journalCardMood, { color: p.text }]}>{entry.moodLabel}</Text>
                    <Text style={[m.journalCardDate, { color: p.textSoft }]}>
                      {new Date(entry.date).toLocaleDateString('fr', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => deleteEntry(entry.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={16} color={p.muted} />
                </TouchableOpacity>
              </View>
              {entry.note ? <Text style={[m.journalCardNote, { color: p.textSoft }]}>{entry.note}</Text> : null}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const m = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },

  question: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  questionSub: { fontSize: 13, lineHeight: 20, marginBottom: 20 },

  moodCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 16, borderWidth: 1, marginBottom: 10,
  },
  moodIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  moodEmoji: { fontSize: 26 },
  moodLabel: { fontSize: 15, fontWeight: '700' },
  moodSub: { fontSize: 12, marginTop: 3 },

  moodBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 20,
  },
  moodBannerEmoji: { fontSize: 40 },
  moodBannerLabel: { fontSize: 17, fontWeight: '800' },
  moodBannerSub: { fontSize: 13, marginTop: 4 },

  guidanceCard: {
    borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 14,
    gap: 14,
  },
  ayahBlock: { gap: 6 },
  ayahText: { fontSize: 20, fontFamily: 'Amiri-Bold', textAlign: 'right', lineHeight: 38 },
  surahRef: { fontSize: 12, fontStyle: 'italic', textAlign: 'right' },
  hadithBlock: { borderRadius: 12, borderWidth: 1, padding: 14 },
  hadithText: { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  adviceText: { fontSize: 14, lineHeight: 22 },
  duaBox: { borderRadius: 14, borderWidth: 1, padding: 16, alignItems: 'center', gap: 8 },
  duaArabic: { fontSize: 20, fontFamily: 'Amiri-Regular', textAlign: 'center' },
  duaTranslit: { fontSize: 13, fontStyle: 'italic', textAlign: 'center' },

  backBtn: { padding: 14, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // ── Tabs ──
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.06)' },
  tabBtnText: { fontSize: 13, fontWeight: '700', color: '#555' },

  // ── Journal ──
  journalSaveBox: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 8, gap: 10 },
  journalSaveTitle: { fontSize: 14, fontWeight: '700' },
  journalInput: {
    borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14,
    minHeight: 80, textAlignVertical: 'top',
  },
  journalSaveBtn: { padding: 12, borderRadius: 12, alignItems: 'center' },
  journalSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  savedBanner: {
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16, alignItems: 'center',
  },
  savedBannerText: { fontSize: 13, fontWeight: '700' },

  journalCard: {
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10, gap: 8,
  },
  journalCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  journalCardMood: { fontSize: 14, fontWeight: '700' },
  journalCardDate: { fontSize: 11, marginTop: 2 },
  journalCardNote: { fontSize: 13, lineHeight: 20 },
});
