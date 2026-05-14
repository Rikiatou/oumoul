import { useState, useCallback, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/theme-context';

function speak(text: string, lang = 'ar-SA') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
    const S = require('expo-speech') as { stop: () => void; speak: (t: string, o: object) => void };
    S.stop();
    S.speak(text, { language: lang, rate: 0.75, pitch: 1.0 });
  } catch { /* expo-speech not installed */ }
}

// ── Arabic Alphabet Data ──────────────────────────────────────────────────────
const ARABIC_LETTERS = [
  { letter: 'ا', name: 'Alif', example: 'أسد', emoji: '🦁', transliteration: 'a' },
  { letter: 'ب', name: 'Ba', example: 'باب', emoji: '🚪', transliteration: 'b' },
  { letter: 'ت', name: 'Ta', example: 'تفاحة', emoji: '🍎', transliteration: 't' },
  { letter: 'ث', name: 'Tha', example: 'ثعلب', emoji: '🦊', transliteration: 'th' },
  { letter: 'ج', name: 'Jim', example: 'جمل', emoji: '🐪', transliteration: 'j' },
  { letter: 'ح', name: 'Ha', example: 'حصان', emoji: '🐴', transliteration: 'ħ' },
  { letter: 'خ', name: 'Kha', example: 'خروف', emoji: '🐑', transliteration: 'kh' },
  { letter: 'د', name: 'Dal', example: 'دجاج', emoji: '🐔', transliteration: 'd' },
  { letter: 'ذ', name: 'Dhal', example: 'ذئب', emoji: '🐺', transliteration: 'dh' },
  { letter: 'ر', name: 'Ra', example: 'رمان', emoji: '🍎', transliteration: 'r' },
  { letter: 'ز', name: 'Zay', example: 'زرافة', emoji: '🦒', transliteration: 'z' },
  { letter: 'س', name: 'Sin', example: 'سمكة', emoji: '🐟', transliteration: 's' },
  { letter: 'ش', name: 'Shin', example: 'شمس', emoji: '☀️', transliteration: 'sh' },
  { letter: 'ص', name: 'Sad', example: 'صقر', emoji: '🦅', transliteration: 'ṣ' },
  { letter: 'ض', name: 'Dad', example: 'ضفدع', emoji: '🐸', transliteration: 'ḍ' },
  { letter: 'ط', name: 'Ta', example: 'طاووس', emoji: '🦚', transliteration: 'ṭ' },
  { letter: 'ظ', name: 'Dha', example: 'ظبي', emoji: '🦌', transliteration: 'ẓ' },
  { letter: 'ع', name: 'Ain', example: 'عنب', emoji: '🍇', transliteration: 'ʿ' },
  { letter: 'غ', name: 'Ghain', example: 'غزال', emoji: '🦌', transliteration: 'gh' },
  { letter: 'ف', name: 'Fa', example: 'فراشة', emoji: '🦋', transliteration: 'f' },
  { letter: 'ق', name: 'Qaf', example: 'قمر', emoji: '🌙', transliteration: 'q' },
  { letter: 'ك', name: 'Kaf', example: 'كتاب', emoji: '📚', transliteration: 'k' },
  { letter: 'ل', name: 'Lam', example: 'ليمون', emoji: '🍋', transliteration: 'l' },
  { letter: 'م', name: 'Mim', example: 'مسجد', emoji: '🕌', transliteration: 'm' },
  { letter: 'ن', name: 'Nun', example: 'نجمة', emoji: '⭐', transliteration: 'n' },
  { letter: 'ه', name: 'Ha', example: 'هلال', emoji: '🌙', transliteration: 'h' },
  { letter: 'و', name: 'Waw', example: 'وردة', emoji: '🌹', transliteration: 'w' },
  { letter: 'ي', name: 'Ya', example: 'يد', emoji: '✋', transliteration: 'y' },
];

// ── Prophets Stories ──────────────────────────────────────────────────────────
const PROPHETS = [
  { name: 'Adam ﷤', emoji: '🌿', short: 'Le premier homme créé par Allah', color: '#1A7F64' },
  { name: 'Nouh ﷤', emoji: '🚢', short: 'Le prophète qui construisit l\'arche', color: '#2563EB' },
  { name: 'Ibrahim ﷤', emoji: '🔥', short: 'Le Khalilullah, ami d\'Allah', color: '#D97706' },
  { name: 'Moussa ﷤', emoji: '🪄', short: 'Le prophète qui parla à Allah', color: '#7C3AED' },
  { name: 'Issa ﷤', emoji: '✨', short: 'Le prophète né d\'une vierge', color: '#0891B2' },
  { name: 'Muhammad ﷺ', emoji: '🕌', short: 'Le dernier et plus grand des prophètes', color: '#059669' },
];

// ── Islamic Kids Lessons ──────────────────────────────────────────────────────
const KIDS_LESSONS = [
  { title: 'Les 5 piliers', emoji: '🕌', desc: 'Shahada, Salat, Zakat, Sawm, Hajj', color: '#1A7F64', ageGroup: '7+' },
  { title: 'La Wudou', emoji: '💧', desc: 'Comment faire les ablutions étape par étape', color: '#2563EB', ageGroup: '5+' },
  { title: 'La Salat', emoji: '🤲', desc: 'Les étapes de la prière en images', color: '#7C3AED', ageGroup: '7+' },
  { title: 'Les Du\'as simples', emoji: '🌟', desc: 'Invocations du quotidien pour enfants', color: '#D97706', ageGroup: '3+' },
  { title: 'Les Bonnes manières', emoji: '😊', desc: 'Salam, respect des parents, partage', color: '#EC4899', ageGroup: '3+' },
  { title: 'Ramadan pour enfants', emoji: '🌙', desc: 'Comprendre le Ramadan et ses bénédictions', color: '#6366F1', ageGroup: '7+' },
  { title: 'Les Anges', emoji: '👼', desc: 'Qui sont les anges et leur rôle', color: '#0891B2', ageGroup: '7+' },
  { title: 'Le Paradis', emoji: '🌺', desc: 'Les belles descriptions du Jannah', color: '#059669', ageGroup: '5+' },
];

// ── Kid Duas ─────────────────────────────────────────────────────────────────
const KIDS_DUAS = [
  { title: 'Avant de manger', arabic: 'بِسْمِ اللَّهِ', transliteration: 'Bismillah', french: 'Au nom d\'Allah', emoji: '🍽️' },
  { title: 'Après avoir mangé', arabic: 'الْحَمْدُ لِلَّهِ', transliteration: 'Al-ḥamdu lillāh', french: 'Louange à Allah', emoji: '✅' },
  { title: 'En entrant chez soi', arabic: 'بِسْمِ اللَّهِ وَلَجْنَا', transliteration: 'Bismillahi walajna', french: 'Au nom d\'Allah nous entrons', emoji: '🏠' },
  { title: 'Avant de dormir', arabic: 'اللَّهُمَّ بِاسْمِكَ أَمُوتُ وَأَحْيَا', transliteration: 'Allāhumma bismika amūtu wa aḥyā', french: 'Ô Allah en Ton nom je meurs et je vis', emoji: '😴' },
  { title: 'Au réveil', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا', transliteration: 'Al-ḥamdu lillāhil-ladhī aḥyānā', french: 'Louange à Allah qui nous a redonné vie', emoji: '☀️' },
  { title: 'En sortant de chez soi', arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ', transliteration: 'Bismillāhi tawakkaltu ʿalallāh', french: 'Au nom d\'Allah, je me confie à Allah', emoji: '🚪' },
];

type Tab = 'alphabet' | 'prophets' | 'lessons' | 'duas';

export function KidsModuleScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { palette: p } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('alphabet');
  const [selectedLetter, setSelectedLetter] = useState<typeof ARABIC_LETTERS[0] | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizChosen, setQuizChosen] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const starAnim = useRef(new Animated.Value(0)).current;

  const playWithFeedback = useCallback((id: string, text: string, lang = 'ar-SA') => {
    setPlayingId(id);
    speak(text, lang);
    setTimeout(() => setPlayingId(null), 2000);
  }, []);

  const showStarReward = useCallback(() => {
    starAnim.setValue(0);
    Animated.sequence([
      Animated.spring(starAnim, { toValue: 1, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(starAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [starAnim]);

  const tabs: Array<{ key: Tab; label: string; emoji: string }> = [
    { key: 'alphabet', label: 'Alphabet', emoji: 'ا' },
    { key: 'prophets', label: 'Prophètes', emoji: '🌟' },
    { key: 'lessons', label: 'Islam', emoji: '📚' },
    { key: 'duas', label: 'Du\'as', emoji: '🤲' },
  ];

  // ── Quiz helpers ──
  const quizLetter = ARABIC_LETTERS[quizIndex % ARABIC_LETTERS.length];
  const quizOptions = useCallback(() => {
    const correct = quizLetter.name;
    const others = ARABIC_LETTERS
      .filter((l) => l.name !== correct)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((l) => l.name);
    return [...others, correct].sort(() => Math.random() - 0.5);
  }, [quizLetter.name]);

  const handleQuizAnswer = (answer: string) => {
    if (quizAnswered) return;
    setQuizChosen(answer);
    setQuizAnswered(true);
    if (answer === quizLetter.name) {
      setQuizScore((s) => s + 1);
      Vibration.vibrate(80);
      showStarReward();
      speak(quizLetter.letter);
    } else {
      Vibration.vibrate([0, 60, 60, 60]);
    }
  };

  const nextQuizQuestion = () => {
    setQuizIndex((i) => i + 1);
    setQuizAnswered(false);
    setQuizChosen(null);
  };

  return (
    <View style={[k.screen, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      {/* Header */}
      <View style={k.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={p.primaryDark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[k.headerTitle, { color: p.text }]}>👶 Module Enfants</Text>
          <Text style={[k.headerSub, { color: p.textSoft }]}>Apprends l'Islam en s'amusant</Text>
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={k.tabBar} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingRight: 8 }}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[k.tab, activeTab === tab.key && { backgroundColor: p.primaryDark }]}
            onPress={() => { setActiveTab(tab.key); setSelectedLetter(null); setQuizMode(false); }}
            activeOpacity={0.75}
          >
            <Text style={k.tabEmoji}>{tab.emoji}</Text>
            <Text style={[k.tabLabel, activeTab === tab.key && { color: '#fff' }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── ALPHABET TAB ── */}
      {activeTab === 'alphabet' && !selectedLetter && !quizMode && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 12 }}>
            <Text style={[k.sectionTitle, { color: p.text }]}>Alphabet Arabe</Text>
            <TouchableOpacity
              style={[k.quizBtn, { backgroundColor: p.primaryDark }]}
              onPress={() => { setQuizMode(true); setQuizIndex(0); setQuizScore(0); setQuizAnswered(false); setQuizChosen(null); }}
            >
              <Ionicons name="game-controller" size={14} color="#fff" />
              <Text style={k.quizBtnText}>Quiz</Text>
            </TouchableOpacity>
          </View>
          <View style={k.alphabetGrid}>
            {ARABIC_LETTERS.map((item) => (
              <TouchableOpacity
                key={item.letter}
                style={[k.letterCard, { backgroundColor: p.card, borderColor: playingId === item.letter ? p.primaryDark : p.border }]}
                onPress={() => setSelectedLetter(item)}
                onLongPress={() => playWithFeedback(item.letter, item.letter)}
                activeOpacity={0.75}
              >
                <Text style={k.letterEmoji}>{item.emoji}</Text>
                <Text style={[k.letterBig, { color: p.primaryDark }]}>{item.letter}</Text>
                <Text style={[k.letterName, { color: p.text }]}>{item.name}</Text>
                {playingId === item.letter && (
                  <Ionicons name="volume-high" size={12} color={p.primaryDark} style={{ marginTop: 2 }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[k.hintText, { color: p.textSoft }]}>💡 Appuie long sur une lettre pour l'entendre</Text>
        </ScrollView>
      )}

      {/* ── LETTER DETAIL ── */}
      {activeTab === 'alphabet' && selectedLetter && (
        <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setSelectedLetter(null)} style={{ alignSelf: 'flex-start', marginBottom: 16 }}>
            <Text style={[k.backLink, { color: p.primaryDark }]}>← Retour</Text>
          </TouchableOpacity>
          <View style={[k.letterDetail, { backgroundColor: p.card }]}>
            <Text style={k.detailEmoji}>{selectedLetter.emoji}</Text>
            <Text style={[k.detailLetter, { color: p.primaryDark }]}>{selectedLetter.letter}</Text>
            <Text style={[k.detailName, { color: p.text }]}>{selectedLetter.name}</Text>
            <Text style={[k.detailTranslit, { color: p.textSoft }]}>/{selectedLetter.transliteration}/</Text>

            {/* Audio button */}
            <TouchableOpacity
              style={[k.audioBtn, { backgroundColor: playingId === selectedLetter.letter ? '#D1FAE5' : p.primaryDark + '18', borderColor: p.primaryDark }]}
              onPress={() => playWithFeedback(selectedLetter.letter, selectedLetter.letter)}
              activeOpacity={0.8}
            >
              <Ionicons name={playingId === selectedLetter.letter ? 'volume-high' : 'play-circle'} size={22} color={p.primaryDark} />
              <Text style={[k.audioBtnText, { color: p.primaryDark }]}>
                {playingId === selectedLetter.letter ? 'Écoute...' : 'Écouter la lettre'}
              </Text>
            </TouchableOpacity>

            <View style={[k.exampleBox, { backgroundColor: p.bgAlt ?? p.bg, borderColor: p.border }]}>
              <Text style={[k.exampleArabic, { color: p.text }]}>{selectedLetter.example}</Text>
              <Text style={k.exampleEmoji}>{selectedLetter.emoji}</Text>
              <TouchableOpacity
                style={[k.audioBtn, { backgroundColor: p.primaryDark + '18', borderColor: p.primaryDark, marginTop: 8 }]}
                onPress={() => playWithFeedback(`ex-${selectedLetter.letter}`, selectedLetter.example)}
              >
                <Ionicons name="volume-medium" size={18} color={p.primaryDark} />
                <Text style={[k.audioBtnText, { color: p.primaryDark }]}>Écouter l'exemple</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── QUIZ MODE ── */}
      {activeTab === 'alphabet' && quizMode && (
        <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[k.quizScore, { color: p.primaryDark }]}>Score: {quizScore} / {quizIndex}</Text>
          <View style={[k.quizCard, { backgroundColor: p.card }]}>
            <Text style={[k.quizLetter, { color: p.primaryDark }]}>{quizLetter.letter}</Text>
            <Text style={[k.quizEmoji]}>{quizLetter.emoji}</Text>
            <Text style={[k.quizQuestion, { color: p.textSoft }]}>Quel est ce lettre ?</Text>
          </View>
          <View style={k.quizOptions}>
            {quizOptions().map((opt) => {
              const isCorrect = opt === quizLetter.name;
              const isChosen = opt === quizChosen;
              let bg = p.card;
              if (quizAnswered && isCorrect) bg = '#D1FAE5';
              if (quizAnswered && isChosen && !isCorrect) bg = '#FEE2E2';
              return (
                <TouchableOpacity
                  key={opt}
                  style={[k.quizOption, { backgroundColor: bg, borderColor: p.border }]}
                  onPress={() => handleQuizAnswer(opt)}
                  activeOpacity={0.75}
                >
                  <Text style={[k.quizOptionText, { color: p.text }]}>{opt}</Text>
                  {quizAnswered && isCorrect && <Ionicons name="checkmark-circle" size={20} color="#059669" />}
                  {quizAnswered && isChosen && !isCorrect && <Ionicons name="close-circle" size={20} color="#DC2626" />}
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Star reward animation */}
          <Animated.Text style={[
            k.starReward,
            { opacity: starAnim, transform: [{ scale: starAnim }, { translateY: starAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) }] },
          ]}>⭐ Bravo !</Animated.Text>

          {quizAnswered && (
            <TouchableOpacity style={[k.nextBtn, { backgroundColor: p.primaryDark }]} onPress={nextQuizQuestion}>
              <Text style={k.nextBtnText}>Question suivante →</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setQuizMode(false)} style={{ marginTop: 16 }}>
            <Text style={[k.backLink, { color: p.textSoft }]}>Arrêter le quiz</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── PROPHETS TAB ── */}
      {activeTab === 'prophets' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={[k.sectionTitle, { color: p.text, marginBottom: 12 }]}>Les Prophètes d'Allah</Text>
          {PROPHETS.map((prophet) => (
            <View key={prophet.name} style={[k.prophetCard, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={[k.prophetIcon, { backgroundColor: prophet.color + '18' }]}>
                <Text style={k.prophetEmoji}>{prophet.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[k.prophetName, { color: p.text }]}>{prophet.name}</Text>
                <Text style={[k.prophetDesc, { color: p.textSoft }]}>{prophet.short}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── LESSONS TAB ── */}
      {activeTab === 'lessons' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={[k.sectionTitle, { color: p.text, marginBottom: 12 }]}>Apprendre l'Islam</Text>
          {KIDS_LESSONS.map((lesson) => (
            <View key={lesson.title} style={[k.lessonCard, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={[k.lessonIcon, { backgroundColor: lesson.color + '18' }]}>
                <Text style={k.lessonEmoji}>{lesson.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[k.lessonTitle, { color: p.text }]}>{lesson.title}</Text>
                <Text style={[k.lessonDesc, { color: p.textSoft }]}>{lesson.desc}</Text>
              </View>
              <View style={[k.ageBadge, { backgroundColor: lesson.color + '18' }]}>
                <Text style={[k.ageBadgeText, { color: lesson.color }]}>{lesson.ageGroup}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── DUAS TAB ── */}
      {activeTab === 'duas' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={[k.sectionTitle, { color: p.text, marginBottom: 12 }]}>Du'as pour Enfants</Text>
          {KIDS_DUAS.map((dua) => (
            <View key={dua.title} style={[k.duaCard, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={k.duaHeader}>
                <Text style={k.duaEmoji}>{dua.emoji}</Text>
                <Text style={[k.duaTitle, { color: p.text }]}>{dua.title}</Text>
                <TouchableOpacity
                  style={[k.duaPlayBtn, { backgroundColor: playingId === dua.title ? '#D1FAE5' : p.primaryDark + '15' }]}
                  onPress={() => playWithFeedback(dua.title, dua.arabic)}
                >
                  <Ionicons
                    name={playingId === dua.title ? 'volume-high' : 'play'}
                    size={16}
                    color={p.primaryDark}
                  />
                </TouchableOpacity>
              </View>
              <Text style={[k.duaArabic, { color: p.primaryDark }]}>{dua.arabic}</Text>
              <Text style={[k.duaTranslit, { color: p.textSoft }]}>{dua.transliteration}</Text>
              <Text style={[k.duaFrench, { color: p.text }]}>{dua.french}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const k = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },
  tabBar: { flexShrink: 0, marginBottom: 4 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  tabEmoji: { fontSize: 16 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#555' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  backLink: { fontSize: 14, fontWeight: '600' },

  // Alphabet grid
  alphabetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  letterCard: {
    width: '28%', alignItems: 'center', padding: 12,
    borderRadius: 16, borderWidth: 1, minWidth: 90,
  },
  letterEmoji: { fontSize: 22 },
  letterBig: { fontSize: 32, fontFamily: 'Amiri-Bold', marginTop: 4 },
  letterName: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  // Quiz
  quizBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  quizBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  quizScore: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  quizCard: { width: '100%', alignItems: 'center', padding: 32, borderRadius: 24, marginBottom: 24 },
  quizLetter: { fontSize: 72, fontFamily: 'Amiri-Bold' },
  quizEmoji: { fontSize: 36, marginTop: 8 },
  quizQuestion: { fontSize: 14, marginTop: 8 },
  quizOptions: { width: '100%', gap: 10 },
  quizOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, borderWidth: 1 },
  quizOptionText: { fontSize: 16, fontWeight: '600' },
  nextBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Letter detail
  letterDetail: { width: '100%', alignItems: 'center', borderRadius: 24, padding: 32 },
  detailEmoji: { fontSize: 56 },
  detailLetter: { fontSize: 96, fontFamily: 'Amiri-Bold', marginTop: 8 },
  detailName: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  detailTranslit: { fontSize: 16, marginTop: 4 },
  exampleBox: { marginTop: 24, padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', width: '100%' },
  exampleArabic: { fontSize: 32, fontFamily: 'Amiri-Regular' },
  exampleEmoji: { fontSize: 32, marginTop: 8 },

  // Prophets
  prophetCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  prophetIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  prophetEmoji: { fontSize: 26 },
  prophetName: { fontSize: 15, fontWeight: '700' },
  prophetDesc: { fontSize: 12, marginTop: 3 },

  // Lessons
  lessonCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  lessonIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  lessonEmoji: { fontSize: 26 },
  lessonTitle: { fontSize: 15, fontWeight: '700' },
  lessonDesc: { fontSize: 12, marginTop: 3 },
  ageBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  ageBadgeText: { fontSize: 11, fontWeight: '700' },

  // Duas
  duaCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  duaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  duaEmoji: { fontSize: 22 },
  duaTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  duaArabic: { fontSize: 22, fontFamily: 'Amiri-Regular', textAlign: 'right', marginBottom: 6 },
  duaTranslit: { fontSize: 13, fontStyle: 'italic', marginBottom: 4 },
  duaFrench: { fontSize: 13 },
  duaPlayBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Audio & hints
  audioBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginTop: 16 },
  audioBtnText: { fontSize: 14, fontWeight: '600' },
  hintText: { fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 4, fontStyle: 'italic' },
  starReward: { fontSize: 28, position: 'absolute', top: '30%' },
});
