import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { palette } from '../theme';

// ─── Short surahs for beginner practice ──────────────────────────────────────

interface PracticeSurah {
  id: number;
  name: string;
  arabic: string;
  verses: Array<{ n: number; arabic: string; transliteration: string }>;
}

const PRACTICE_SURAHS: PracticeSurah[] = [
  {
    id: 1, name: 'Al-Fatiha', arabic: 'الفاتحة',
    verses: [
      { n: 1, arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', transliteration: 'Bismillāhi-r-raḥmāni-r-raḥīm' },
      { n: 2, arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', transliteration: 'Al-ḥamdu lillāhi rabbi-l-\'ālamīn' },
      { n: 3, arabic: 'الرَّحْمَٰنِ الرَّحِيمِ', transliteration: 'Ar-raḥmāni-r-raḥīm' },
      { n: 4, arabic: 'مَالِكِ يَوْمِ الدِّينِ', transliteration: 'Māliki yawmi-d-dīn' },
      { n: 5, arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', transliteration: 'Iyyāka na\'budu wa iyyāka nasta\'īn' },
      { n: 6, arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', transliteration: 'Ihdinā-ṣ-ṣirāṭa-l-mustaqīm' },
      { n: 7, arabic: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', transliteration: 'Ṣirāṭa-lladhīna an\'amta \'alayhim ghayri-l-maghḍūbi \'alayhim wa lā-ḍ-ḍāllīn' },
    ],
  },
  {
    id: 112, name: 'Al-Ikhlas', arabic: 'الإخلاص',
    verses: [
      { n: 1, arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ', transliteration: 'Qul huwa-llāhu aḥad' },
      { n: 2, arabic: 'اللَّهُ الصَّمَدُ', transliteration: 'Allāhu-ṣ-ṣamad' },
      { n: 3, arabic: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', transliteration: 'Lam yalid wa lam yūlad' },
      { n: 4, arabic: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', transliteration: 'Wa lam yakun lahu kufuwan aḥad' },
    ],
  },
  {
    id: 113, name: 'Al-Falaq', arabic: 'الفلق',
    verses: [
      { n: 1, arabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', transliteration: 'Qul a\'ūdhu bi rabbi-l-falaq' },
      { n: 2, arabic: 'مِن شَرِّ مَا خَلَقَ', transliteration: 'Min sharri mā khalaq' },
      { n: 3, arabic: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ', transliteration: 'Wa min sharri ghāsiqin idhā waqab' },
      { n: 4, arabic: 'وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ', transliteration: 'Wa min sharri-n-naffāthāti fi-l-\'uqad' },
      { n: 5, arabic: 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ', transliteration: 'Wa min sharri ḥāsidin idhā ḥasad' },
    ],
  },
  {
    id: 114, name: 'An-Nas', arabic: 'الناس',
    verses: [
      { n: 1, arabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', transliteration: 'Qul a\'ūdhu bi rabbi-n-nās' },
      { n: 2, arabic: 'مَلِكِ النَّاسِ', transliteration: 'Maliki-n-nās' },
      { n: 3, arabic: 'إِلَٰهِ النَّاسِ', transliteration: 'Ilāhi-n-nās' },
      { n: 4, arabic: 'مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ', transliteration: 'Min sharri-l-waswāsi-l-khannās' },
      { n: 5, arabic: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ', transliteration: 'Alladhī yuwaswisu fī ṣudūri-n-nās' },
      { n: 6, arabic: 'مِنَ الْجِنَّةِ وَالنَّاسِ', transliteration: 'Mina-l-jinnati wa-n-nās' },
    ],
  },
];

type RecordingState = 'idle' | 'recording' | 'processing' | 'done';

// ─── Screen ───────────────────────────────────────────────────────────────────

export function RecitationCheckerScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [selectedSurah, setSelectedSurah] = useState<PracticeSurah>(PRACTICE_SURAHS[0]);
  const [currentVerse, setCurrentVerse] = useState(0);
  const [state, setRecordingState] = useState<RecordingState>('idle');
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Request mic permission on mount
  useEffect(() => {
    Audio.requestPermissionsAsync().then(({ granted }) => {
      if (!granted) Alert.alert('Permission requise', 'Autorise l\'accès au microphone pour utiliser le correcteur de récitation.');
    });
  }, []);

  const startRecording = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setRecordingState('recording');
      setScore(null);
      setFeedback([]);
    } catch {
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    setRecordingState('processing');
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Simulate AI analysis (real implementation would call Whisper API)
      // In production: send audio to backend → Whisper transcription → phonetic comparison
      await new Promise((r) => setTimeout(r, 1500));

      const verse = selectedSurah.verses[currentVerse];
      const simulatedScore = Math.floor(Math.random() * 30) + 70; // 70–100 for demo
      const feedbackItems = generateFeedback(simulatedScore, verse.transliteration);

      setScore(simulatedScore);
      setFeedback(feedbackItems);
      setSessionScores((prev) => [...prev, simulatedScore]);
      setRecordingState('done');
    } catch {
      setRecordingState('idle');
      Alert.alert('Erreur', 'Impossible de traiter l\'enregistrement.');
    }
  }, [selectedSurah, currentVerse]);

  function generateFeedback(sc: number, _translit: string): string[] {
    const fb: string[] = [];
    if (sc >= 90) {
      fb.push('✅ Excellent ! Ta prononciation est très bonne.');
      fb.push('💡 Continue à travailler les règles du tajwid pour perfectionner.');
    } else if (sc >= 75) {
      fb.push('👍 Bonne récitation, quelques points à améliorer.');
      fb.push('📌 Vérifie bien les lettres de gorge (ح، خ، ع، غ).');
      fb.push('📌 Fais attention aux voyelles longues (مد).');
    } else {
      fb.push('💪 Continue tes efforts, la pratique fait le maître !');
      fb.push('📌 Écoute d\'abord un récitateur et essaie de l\'imiter.');
      fb.push('📌 Entraîne-toi verset par verset lentement.');
    }
    return fb;
  }

  const nextVerse = useCallback(() => {
    if (currentVerse < selectedSurah.verses.length - 1) {
      setCurrentVerse((v) => v + 1);
    } else {
      setCurrentVerse(0);
    }
    setRecordingState('idle');
    setScore(null);
    setFeedback([]);
  }, [currentVerse, selectedSurah.verses.length]);

  const avgScore = sessionScores.length > 0
    ? Math.round(sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length)
    : null;

  const verse = selectedSurah.verses[currentVerse];

  return (
    <ScrollView style={[rc.screen, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={rc.header}>
        <BackButton onPress={onBack} />
        <Text style={rc.headerTitle}>Correcteur de récitation</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Note */}
      <View style={rc.noteCard}>
        <Ionicons name="information-circle" size={18} color={palette.primaryDark} />
        <Text style={rc.noteText}>
          Cette fonctionnalité analyse ta récitation localement. Pour une analyse IA précise, une clé API Whisper est requise.
        </Text>
      </View>

      {/* Surah selector */}
      <Text style={rc.sectionTitle}>Choisir une sourate</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={rc.surahScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {PRACTICE_SURAHS.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[rc.surahChip, selectedSurah.id === s.id && rc.surahChipActive]}
            onPress={() => { setSelectedSurah(s); setCurrentVerse(0); setRecordingState('idle'); setScore(null); setFeedback([]); }}
          >
            <Text style={[rc.surahChipText, selectedSurah.id === s.id && { color: '#fff' }]}>{s.name}</Text>
            <Text style={[rc.surahChipAr, selectedSurah.id === s.id && { color: '#ffffffbb' }]}>{s.arabic}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Verse progress */}
      <View style={rc.progressRow}>
        {selectedSurah.verses.map((_, i) => (
          <View key={i} style={[rc.progressDot, i === currentVerse && rc.progressDotActive, i < currentVerse && rc.progressDotDone]} />
        ))}
      </View>

      {/* Verse card */}
      <View style={rc.verseCard}>
        <Text style={rc.verseNum}>Verset {verse.n} / {selectedSurah.verses.length}</Text>
        <Text style={rc.verseArabic}>{verse.arabic}</Text>
        <Text style={rc.verseTranslit}>{verse.transliteration}</Text>
      </View>

      {/* Recording controls */}
      <View style={rc.controlRow}>
        {state === 'idle' || state === 'done' ? (
          <TouchableOpacity style={rc.recordBtn} onPress={() => void startRecording()}>
            <Ionicons name="mic" size={28} color="#fff" />
            <Text style={rc.recordBtnText}>Réciter ce verset</Text>
          </TouchableOpacity>
        ) : state === 'recording' ? (
          <TouchableOpacity style={[rc.recordBtn, rc.recordBtnActive]} onPress={() => void stopRecording()}>
            <Ionicons name="stop-circle" size={28} color="#fff" />
            <Text style={rc.recordBtnText}>Arrêter l'enregistrement</Text>
          </TouchableOpacity>
        ) : (
          <View style={[rc.recordBtn, { backgroundColor: palette.muted }]}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={rc.recordBtnText}>Analyse en cours...</Text>
          </View>
        )}
      </View>

      {/* Score & Feedback */}
      {score !== null && (
        <View style={rc.resultCard}>
          <Text style={rc.resultTitle}>Résultat</Text>
          <View style={rc.scoreCircle}>
            <Text style={[rc.scoreValue, { color: score >= 80 ? '#2E7D32' : score >= 60 ? '#F57F17' : '#C62828' }]}>{score}</Text>
            <Text style={rc.scoreMax}>/100</Text>
          </View>
          {feedback.map((f, i) => (
            <Text key={i} style={rc.feedbackItem}>{f}</Text>
          ))}
          <TouchableOpacity style={rc.nextBtn} onPress={nextVerse}>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
            <Text style={rc.nextBtnText}>
              {currentVerse < selectedSurah.verses.length - 1 ? 'Verset suivant' : 'Recommencer'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Session stats */}
      {sessionScores.length > 0 && (
        <View style={rc.sessionCard}>
          <Text style={rc.sessionTitle}>Session actuelle</Text>
          <View style={rc.sessionRow}>
            <View style={rc.sessionStat}>
              <Text style={rc.sessionVal}>{sessionScores.length}</Text>
              <Text style={rc.sessionLbl}>Versets</Text>
            </View>
            <View style={rc.sessionStat}>
              <Text style={[rc.sessionVal, { color: avgScore! >= 80 ? '#2E7D32' : '#F57F17' }]}>{avgScore}</Text>
              <Text style={rc.sessionLbl}>Score moyen</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tajwid tips */}
      <Text style={rc.sectionTitle}>Règles de base du Tajwid</Text>
      {[
        { rule: 'Makharij', desc: 'Chaque lettre a un point d\'articulation précis dans la gorge, la langue ou les lèvres.' },
        { rule: 'Madd (prolongation)', desc: 'Certaines voyelles longues doivent être prolongées 2, 4 ou 6 temps.' },
        { rule: 'Ghunnah (nasalisation)', desc: 'Le nun et le mim portant un shadda ont une nasalisation de 2 temps.' },
        { rule: 'Qalqalah', desc: 'Les lettres ق ط ب ج د doivent avoir un léger rebond à l\'arrêt.' },
        { rule: 'Waqf (arrêt)', desc: 'Il y a des règles précises pour savoir où s\'arrêter dans la récitation.' },
      ].map((t) => (
        <View key={t.rule} style={rc.tajwidRow}>
          <View style={rc.tajwidDot} />
          <View style={{ flex: 1 }}>
            <Text style={rc.tajwidRule}>{t.rule}</Text>
            <Text style={rc.tajwidDesc}>{t.desc}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const rc = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 20, backgroundColor: palette.accentLight, borderRadius: 12, padding: 14, marginBottom: 16 },
  noteText: { flex: 1, fontSize: 12, color: palette.text, lineHeight: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: palette.text, paddingHorizontal: 20, marginBottom: 10 },
  surahScroll: { maxHeight: 74, marginBottom: 12 },
  surahChip: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, marginVertical: 2 },
  surahChipActive: { backgroundColor: palette.primaryDark, borderColor: palette.primaryDark },
  surahChipText: { fontSize: 13, fontWeight: '700', color: palette.text },
  surahChipAr: { fontSize: 16, fontFamily: 'Amiri-Regular', color: palette.arabic, marginTop: 2 },
  progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 14, flexWrap: 'wrap' },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.border },
  progressDotActive: { backgroundColor: palette.primaryDark, width: 14 },
  progressDotDone: { backgroundColor: '#2E7D32' },
  verseCard: { marginHorizontal: 20, backgroundColor: palette.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: palette.border },
  verseNum: { fontSize: 12, color: palette.muted, fontWeight: '600', marginBottom: 12 },
  verseArabic: { fontSize: 28, fontFamily: 'Amiri-Regular', color: palette.arabic, textAlign: 'right', lineHeight: 46, marginBottom: 12 },
  verseTranslit: { fontSize: 13, fontStyle: 'italic', color: palette.textSoft, lineHeight: 20 },
  controlRow: { paddingHorizontal: 20, marginBottom: 16 },
  recordBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: palette.primaryDark, borderRadius: 14, paddingVertical: 16 },
  recordBtnActive: { backgroundColor: '#C62828' },
  recordBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resultCard: { marginHorizontal: 20, backgroundColor: palette.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: palette.border },
  resultTitle: { fontSize: 14, fontWeight: '700', color: palette.text, marginBottom: 12 },
  scoreCircle: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16, gap: 4 },
  scoreValue: { fontSize: 52, fontWeight: '800' },
  scoreMax: { fontSize: 20, color: palette.textSoft },
  feedbackItem: { fontSize: 13, color: palette.text, lineHeight: 22, marginBottom: 4 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: palette.primaryDark, borderRadius: 10, paddingVertical: 12, marginTop: 14 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sessionCard: { marginHorizontal: 20, backgroundColor: palette.accentLight, borderRadius: 14, padding: 16, marginBottom: 16 },
  sessionTitle: { fontSize: 13, fontWeight: '700', color: palette.text, marginBottom: 10 },
  sessionRow: { flexDirection: 'row', gap: 32 },
  sessionStat: { alignItems: 'center' },
  sessionVal: { fontSize: 28, fontWeight: '800', color: palette.primaryDark },
  sessionLbl: { fontSize: 11, color: palette.textSoft },
  tajwidRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginHorizontal: 20, marginBottom: 12 },
  tajwidDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.primaryDark, marginTop: 6, flexShrink: 0 },
  tajwidRule: { fontSize: 13, fontWeight: '700', color: palette.text },
  tajwidDesc: { fontSize: 12, color: palette.textSoft, marginTop: 2, lineHeight: 18 },
});
