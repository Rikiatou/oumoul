import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { HelpTip } from '../components/HelpTip';
import { awardEvent } from '../gamification/gamification-events';

interface Surah {
  id: number;
  name: string;
  arabicName: string;
  versesCount: number;
  revelationType: 'meccan' | 'medinan';
}

const SURAHS: Surah[] = [
  { id: 1, name: 'Al-Fatiha', arabicName: 'الفاتحة', versesCount: 7, revelationType: 'meccan' },
  { id: 2, name: 'Al-Baqara', arabicName: 'البقرة', versesCount: 286, revelationType: 'medinan' },
  { id: 3, name: 'Ali Imran', arabicName: 'آل عمران', versesCount: 200, revelationType: 'medinan' },
  { id: 4, name: 'An-Nisa', arabicName: 'النساء', versesCount: 176, revelationType: 'medinan' },
  { id: 5, name: 'Al-Maida', arabicName: 'المائدة', versesCount: 120, revelationType: 'medinan' },
  { id: 6, name: 'Al-Anam', arabicName: 'الأنعام', versesCount: 165, revelationType: 'meccan' },
  { id: 7, name: 'Al-Araf', arabicName: 'الأعراف', versesCount: 206, revelationType: 'meccan' },
  { id: 8, name: 'Al-Anfal', arabicName: 'الأنفال', versesCount: 75, revelationType: 'medinan' },
  { id: 9, name: 'At-Tawba', arabicName: 'التوبة', versesCount: 129, revelationType: 'medinan' },
  { id: 10, name: 'Yunus', arabicName: 'يونس', versesCount: 109, revelationType: 'meccan' },
  { id: 11, name: 'Hud', arabicName: 'هود', versesCount: 123, revelationType: 'meccan' },
  { id: 12, name: 'Yusuf', arabicName: 'يوسف', versesCount: 111, revelationType: 'meccan' },
  { id: 13, name: 'Ar-Rad', arabicName: 'الرعد', versesCount: 43, revelationType: 'medinan' },
  { id: 14, name: 'Ibrahim', arabicName: 'إبراهيم', versesCount: 52, revelationType: 'meccan' },
  { id: 15, name: 'Al-Hijr', arabicName: 'الحجر', versesCount: 99, revelationType: 'meccan' },
  { id: 16, name: 'An-Nahl', arabicName: 'النحل', versesCount: 128, revelationType: 'meccan' },
  { id: 17, name: 'Al-Isra', arabicName: 'الإسراء', versesCount: 111, revelationType: 'meccan' },
  { id: 18, name: 'Al-Kahf', arabicName: 'الكهف', versesCount: 110, revelationType: 'meccan' },
  { id: 19, name: 'Maryam', arabicName: 'مريم', versesCount: 98, revelationType: 'meccan' },
  { id: 20, name: 'Ta-Ha', arabicName: 'طه', versesCount: 135, revelationType: 'meccan' },
  { id: 21, name: 'Al-Anbiya', arabicName: 'الأنبياء', versesCount: 112, revelationType: 'meccan' },
  { id: 22, name: 'Al-Hajj', arabicName: 'الحج', versesCount: 78, revelationType: 'medinan' },
  { id: 23, name: 'Al-Muminun', arabicName: 'المؤمنون', versesCount: 118, revelationType: 'meccan' },
  { id: 24, name: 'An-Nur', arabicName: 'النور', versesCount: 64, revelationType: 'medinan' },
  { id: 25, name: 'Al-Furqan', arabicName: 'الفرقان', versesCount: 77, revelationType: 'meccan' },
  { id: 26, name: 'Ash-Shuara', arabicName: 'الشعراء', versesCount: 227, revelationType: 'meccan' },
  { id: 27, name: 'An-Naml', arabicName: 'النمل', versesCount: 93, revelationType: 'meccan' },
  { id: 28, name: 'Al-Qasas', arabicName: 'القصص', versesCount: 88, revelationType: 'meccan' },
  { id: 29, name: 'Al-Ankabut', arabicName: 'العنكبوت', versesCount: 69, revelationType: 'meccan' },
  { id: 30, name: 'Ar-Rum', arabicName: 'الروم', versesCount: 60, revelationType: 'meccan' },
  { id: 31, name: 'Luqman', arabicName: 'لقمان', versesCount: 34, revelationType: 'meccan' },
  { id: 32, name: 'As-Sajda', arabicName: 'السجدة', versesCount: 30, revelationType: 'meccan' },
  { id: 33, name: 'Al-Ahzab', arabicName: 'الأحزاب', versesCount: 73, revelationType: 'medinan' },
  { id: 34, name: 'Saba', arabicName: 'سبأ', versesCount: 54, revelationType: 'meccan' },
  { id: 35, name: 'Fatir', arabicName: 'فاطر', versesCount: 45, revelationType: 'meccan' },
  { id: 36, name: 'Ya-Sin', arabicName: 'يس', versesCount: 83, revelationType: 'meccan' },
  { id: 37, name: 'As-Saffat', arabicName: 'الصافات', versesCount: 182, revelationType: 'meccan' },
  { id: 38, name: 'Sad', arabicName: 'ص', versesCount: 88, revelationType: 'meccan' },
  { id: 39, name: 'Az-Zumar', arabicName: 'الزمر', versesCount: 75, revelationType: 'meccan' },
  { id: 40, name: 'Ghafir', arabicName: 'غافر', versesCount: 85, revelationType: 'meccan' },
  { id: 41, name: 'Fussilat', arabicName: 'فصلت', versesCount: 54, revelationType: 'meccan' },
  { id: 42, name: 'Ash-Shura', arabicName: 'الشورى', versesCount: 53, revelationType: 'meccan' },
  { id: 43, name: 'Az-Zukhruf', arabicName: 'الزخرف', versesCount: 89, revelationType: 'meccan' },
  { id: 44, name: 'Ad-Dukhan', arabicName: 'الدخان', versesCount: 59, revelationType: 'meccan' },
  { id: 45, name: 'Al-Jathiya', arabicName: 'الجاثية', versesCount: 37, revelationType: 'meccan' },
  { id: 46, name: 'Al-Ahqaf', arabicName: 'الأحقاف', versesCount: 35, revelationType: 'meccan' },
  { id: 47, name: 'Muhammad', arabicName: 'محمد', versesCount: 38, revelationType: 'medinan' },
  { id: 48, name: 'Al-Fath', arabicName: 'الفتح', versesCount: 29, revelationType: 'medinan' },
  { id: 49, name: 'Al-Hujurat', arabicName: 'الحجرات', versesCount: 18, revelationType: 'medinan' },
  { id: 50, name: 'Qaf', arabicName: 'ق', versesCount: 45, revelationType: 'meccan' },
  { id: 51, name: 'Ad-Dhariyat', arabicName: 'الذاريات', versesCount: 60, revelationType: 'meccan' },
  { id: 52, name: 'At-Tur', arabicName: 'الطور', versesCount: 49, revelationType: 'meccan' },
  { id: 53, name: 'An-Najm', arabicName: 'النجم', versesCount: 62, revelationType: 'meccan' },
  { id: 54, name: 'Al-Qamar', arabicName: 'القمر', versesCount: 55, revelationType: 'meccan' },
  { id: 55, name: 'Ar-Rahman', arabicName: 'الرحمن', versesCount: 78, revelationType: 'medinan' },
  { id: 56, name: 'Al-Waqia', arabicName: 'الواقعة', versesCount: 96, revelationType: 'meccan' },
  { id: 57, name: 'Al-Hadid', arabicName: 'الحديد', versesCount: 29, revelationType: 'medinan' },
  { id: 58, name: 'Al-Mujadila', arabicName: 'المجادلة', versesCount: 22, revelationType: 'medinan' },
  { id: 59, name: 'Al-Hashr', arabicName: 'الحشر', versesCount: 24, revelationType: 'medinan' },
  { id: 60, name: 'Al-Mumtahina', arabicName: 'الممتحنة', versesCount: 13, revelationType: 'medinan' },
  { id: 61, name: 'As-Saff', arabicName: 'الصف', versesCount: 14, revelationType: 'medinan' },
  { id: 62, name: 'Al-Jumua', arabicName: 'الجمعة', versesCount: 11, revelationType: 'medinan' },
  { id: 63, name: 'Al-Munafiqun', arabicName: 'المنافقون', versesCount: 11, revelationType: 'medinan' },
  { id: 64, name: 'At-Taghabun', arabicName: 'التغابن', versesCount: 18, revelationType: 'medinan' },
  { id: 65, name: 'At-Talaq', arabicName: 'الطلاق', versesCount: 12, revelationType: 'medinan' },
  { id: 66, name: 'At-Tahrim', arabicName: 'التحريم', versesCount: 12, revelationType: 'medinan' },
  { id: 67, name: 'Al-Mulk', arabicName: 'الملك', versesCount: 30, revelationType: 'meccan' },
  { id: 68, name: 'Al-Qalam', arabicName: 'القلم', versesCount: 52, revelationType: 'meccan' },
  { id: 69, name: 'Al-Haqqa', arabicName: 'الحقّة', versesCount: 52, revelationType: 'meccan' },
  { id: 70, name: 'Al-Maarij', arabicName: 'المعارج', versesCount: 44, revelationType: 'meccan' },
  { id: 71, name: 'Nuh', arabicName: 'نوح', versesCount: 28, revelationType: 'meccan' },
  { id: 72, name: 'Al-Jinn', arabicName: 'الجن', versesCount: 28, revelationType: 'meccan' },
  { id: 73, name: 'Al-Muzzammil', arabicName: 'المزمل', versesCount: 20, revelationType: 'meccan' },
  { id: 74, name: 'Al-Muddaththir', arabicName: 'المدثر', versesCount: 56, revelationType: 'meccan' },
  { id: 75, name: 'Al-Qiyama', arabicName: 'القيامة', versesCount: 40, revelationType: 'meccan' },
  { id: 76, name: 'Al-Insan', arabicName: 'الإنسان', versesCount: 31, revelationType: 'medinan' },
  { id: 77, name: 'Al-Mursalat', arabicName: 'المرسلات', versesCount: 50, revelationType: 'meccan' },
  { id: 78, name: 'An-Naba', arabicName: 'النبأ', versesCount: 40, revelationType: 'meccan' },
  { id: 79, name: 'An-Nazi', arabicName: 'النازعات', versesCount: 46, revelationType: 'meccan' },
  { id: 80, name: 'Abasa', arabicName: 'عبس', versesCount: 42, revelationType: 'meccan' },
  { id: 81, name: 'At-Takwir', arabicName: 'التكوير', versesCount: 29, revelationType: 'meccan' },
  { id: 82, name: 'Al-Infitar', arabicName: 'الانفطار', versesCount: 19, revelationType: 'meccan' },
  { id: 83, name: 'Al-Mutaffifin', arabicName: 'المطففين', versesCount: 36, revelationType: 'meccan' },
  { id: 84, name: 'Al-Inshiqaq', arabicName: 'الانشقاق', versesCount: 25, revelationType: 'meccan' },
  { id: 85, name: 'Al-Buruj', arabicName: 'البروج', versesCount: 22, revelationType: 'meccan' },
  { id: 86, name: 'At-Tariq', arabicName: 'الطارق', versesCount: 17, revelationType: 'meccan' },
  { id: 87, name: 'Al-Ala', arabicName: 'الأعلى', versesCount: 19, revelationType: 'meccan' },
  { id: 88, name: 'Al-Ghashiya', arabicName: 'الغاشية', versesCount: 26, revelationType: 'meccan' },
  { id: 89, name: 'Al-Fajr', arabicName: 'الفجر', versesCount: 30, revelationType: 'meccan' },
  { id: 90, name: 'Al-Balad', arabicName: 'البلد', versesCount: 20, revelationType: 'meccan' },
  { id: 91, name: 'Ash-Shams', arabicName: 'الشمس', versesCount: 15, revelationType: 'meccan' },
  { id: 92, name: 'Al-Lail', arabicName: 'الليل', versesCount: 21, revelationType: 'meccan' },
  { id: 93, name: 'Ad-Duha', arabicName: 'الضحى', versesCount: 11, revelationType: 'meccan' },
  { id: 94, name: 'Ash-Sharh', arabicName: 'الشرح', versesCount: 8, revelationType: 'meccan' },
  { id: 95, name: 'At-Tin', arabicName: 'التين', versesCount: 8, revelationType: 'meccan' },
  { id: 96, name: 'Al-Alaq', arabicName: 'العلق', versesCount: 19, revelationType: 'meccan' },
  { id: 97, name: 'Al-Qadr', arabicName: 'القدر', versesCount: 5, revelationType: 'meccan' },
  { id: 98, name: 'Al-Bayyina', arabicName: 'البينة', versesCount: 8, revelationType: 'medinan' },
  { id: 99, name: 'Az-Zalzala', arabicName: 'الزلزلة', versesCount: 8, revelationType: 'medinan' },
  { id: 100, name: 'Al-Adiyat', arabicName: 'العاديات', versesCount: 11, revelationType: 'meccan' },
  { id: 101, name: 'Al-Qaria', arabicName: 'القارعة', versesCount: 11, revelationType: 'meccan' },
  { id: 102, name: 'At-Takathur', arabicName: 'التكاثر', versesCount: 8, revelationType: 'meccan' },
  { id: 103, name: 'Al-Asr', arabicName: 'العصر', versesCount: 3, revelationType: 'meccan' },
  { id: 104, name: 'Al-Humaza', arabicName: 'الهمزة', versesCount: 9, revelationType: 'meccan' },
  { id: 105, name: 'Al-Fil', arabicName: 'الفيل', versesCount: 5, revelationType: 'meccan' },
  { id: 106, name: 'Quraysh', arabicName: 'قريش', versesCount: 4, revelationType: 'meccan' },
  { id: 107, name: 'Al-Maun', arabicName: 'الماعون', versesCount: 7, revelationType: 'meccan' },
  { id: 108, name: 'Al-Kawthar', arabicName: 'الكوثر', versesCount: 3, revelationType: 'meccan' },
  { id: 109, name: 'Al-Kafirun', arabicName: 'الكافرون', versesCount: 6, revelationType: 'meccan' },
  { id: 110, name: 'An-Nasr', arabicName: 'النصر', versesCount: 3, revelationType: 'medinan' },
  { id: 111, name: 'Al-Masad', arabicName: 'المسد', versesCount: 5, revelationType: 'meccan' },
  { id: 112, name: 'Al-Ikhlas', arabicName: 'الإخلاص', versesCount: 4, revelationType: 'meccan' },
  { id: 113, name: 'Al-Falaq', arabicName: 'الفلق', versesCount: 5, revelationType: 'meccan' },
  { id: 114, name: 'An-Nas', arabicName: 'الناس', versesCount: 6, revelationType: 'medinan' },
];

interface QariOption {
  id: string;
  name: string;
  arabicName: string;
  baseUrl: string;
}

const QARIS: QariOption[] = [
  { id: 'mishary', name: 'Mishary Rashid Alafasy', arabicName: 'مشاري العفاسي', baseUrl: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy' },
  { id: 'sudais', name: 'Abdurrahman As-Sudais', arabicName: 'عبدالرحمن السديس', baseUrl: 'https://cdn.islamic.network/quran/audio-surah/128/ar.abdurrahmaansudais' },
  { id: 'husary', name: 'Mahmoud Khalil Al-Husary', arabicName: 'محمود خليل الحصري', baseUrl: 'https://cdn.islamic.network/quran/audio-surah/128/ar.husary' },
  { id: 'minshawi', name: 'Mohamed Siddiq Al-Minshawi', arabicName: 'محمد صديق المنشاوي', baseUrl: 'https://cdn.islamic.network/quran/audio-surah/128/ar.minshawi' },
];

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused';

export function QuranAudioScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [selectedQari, setSelectedQari] = useState<QariOption>(QARIS[0]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const playbackStateRef = useRef<PlaybackState>('idle');
  const [showQariPicker, setShowQariPicker] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  const repeatModeRef = useRef<'none' | 'one' | 'all'>('none');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [search, setSearch] = useState('');
  const soundRef = useRef<Audio.Sound | null>(null);
  const isCleaningUpRef = useRef(false);

  const setPlayback = (state: PlaybackState) => {
    playbackStateRef.current = state;
    setPlaybackState(state);
  };

  const filteredSurahs = useMemo(() => {
    if (!search.trim()) return SURAHS;
    const q = search.toLowerCase();
    return SURAHS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.arabicName.includes(q) || s.id.toString() === q
    );
  }, [search]);

  const cleanup = useCallback(async () => {
    isCleaningUpRef.current = true;
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) {
      try {
        await sound.stopAsync();
      } catch {}
      try {
        await sound.unloadAsync();
      } catch {}
    }
    setPlayback('idle');
    setProgress(0);
    setDuration(0);
    isCleaningUpRef.current = false;
  }, []);

  // Intentionally do NOT cleanup on unmount.
  // This allows audio to keep playing in background when leaving the screen.

  const playSurah = useCallback(async (surah: Surah) => {
    await cleanup();
    setSelectedSurah(surah);
    setPlayback('loading');

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const audioUrl = `${selectedQari.baseUrl}/${surah.id}.mp3`;
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => {
          if (isCleaningUpRef.current) return;
          if (!status.isLoaded) return;
          setProgress(status.positionMillis ?? 0);
          setDuration(status.durationMillis ?? 0);
          if (status.isPlaying && playbackStateRef.current === 'loading') {
            setPlayback('playing');
          }
          if (status.didJustFinish) {
            if (repeatModeRef.current === 'one') {
              void sound.replayAsync();
            } else {
              setPlayback('idle');
            }
          }
        }
      );
      if (isCleaningUpRef.current) {
        try { await sound.unloadAsync(); } catch {}
        return;
      }
      soundRef.current = sound;
      setPlayback('playing');
      void awardEvent('quran_read');
    } catch (err) {
      setPlayback('idle');
    }
  }, [cleanup, selectedQari]);

  const getSurahIndex = useCallback((id: number) => SURAHS.findIndex((s) => s.id === id), []);

  const playPrevSurah = useCallback(async () => {
    if (!selectedSurah) return;
    const idx = getSurahIndex(selectedSurah.id);
    if (idx <= 0) return;
    await playSurah(SURAHS[idx - 1]);
  }, [getSurahIndex, playSurah, selectedSurah]);

  const playNextSurah = useCallback(async () => {
    if (!selectedSurah) return;
    const idx = getSurahIndex(selectedSurah.id);
    if (idx < 0 || idx >= SURAHS.length - 1) return;
    await playSurah(SURAHS[idx + 1]);
  }, [getSurahIndex, playSurah, selectedSurah]);

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) return;
    const current = playbackStateRef.current;
    if (current === 'playing') {
      await soundRef.current.pauseAsync();
      setPlayback('paused');
    } else if (current === 'paused') {
      await soundRef.current.playAsync();
      setPlayback('playing');
    }
  }, []);

  const stopPlayback = useCallback(async () => {
    setSelectedSurah(null);
    await cleanup();
  }, [cleanup]);

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={st.header}>
        <BackButton onPress={onBack} />
        <Text style={st.headerTitle} accessibilityRole="header">Écouter le Coran</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <HelpTip screenName="Écouter le Coran" tips={[
            { icon: 'person', title: 'Choix du récitateur', description: 'Appuie sur l\'icône personne pour choisir parmi plusieurs récitateurs célèbres.' },
            { icon: 'musical-notes', title: 'Lecture audio', description: 'Sélectionne une sourate dans la liste pour lancer la lecture.' },
            { icon: 'play', title: 'Contrôles', description: 'Utilise les boutons play/pause/stop pour contrôler la lecture.' },
            { icon: 'list', title: 'Liste des sourates', description: 'Parcours les 114 sourates classées par ordre.' },
          ]} />
          <TouchableOpacity onPress={() => setShowQariPicker(!showQariPicker)} style={st.backBtn}>
            <Ionicons name="person" size={20} color={palette.primaryDark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Qari Picker */}
      {showQariPicker && (
        <View style={st.qariPicker}>
          <Text style={st.qariPickerTitle}>Choisir un récitateur</Text>
          {QARIS.map((q) => (
            <TouchableOpacity
              key={q.id}
              style={[st.qariItem, selectedQari.id === q.id && st.qariItemActive]}
              onPress={() => { setSelectedQari(q); setShowQariPicker(false); }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[st.qariName, selectedQari.id === q.id && { color: '#fff' }]}>{q.name}</Text>
                <Text style={[st.qariArabic, selectedQari.id === q.id && { color: 'rgba(255,255,255,0.8)' }]}>{q.arabicName}</Text>
              </View>
              {selectedQari.id === q.id && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Now Playing Bar */}
      {(selectedSurah || playbackState !== 'idle') && (
        <View style={st.nowPlaying}>
          <View style={{ flex: 1 }}>
            <Text style={st.npTitle}>{selectedSurah ? `${selectedSurah.arabicName} — ${selectedSurah.name}` : '...'} </Text>
            <Text style={st.npQari}>{selectedQari.name}</Text>
            {duration > 0 && (
              <View style={st.npProgressRow}>
                <Text style={st.npTime}>{formatMs(progress)}</Text>
                <View style={st.npBarBg}>
                  <View style={[st.npBarFill, { width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }]} />
                </View>
                <Text style={st.npTime}>{formatMs(duration)}</Text>
              </View>
            )}
          </View>
          <View style={st.npControls}>
            <TouchableOpacity onPress={playPrevSurah} style={st.npBtn} disabled={!selectedSurah || selectedSurah.id === 1}>
              <Ionicons name="play-skip-back" size={20} color={(!selectedSurah || selectedSurah.id === 1) ? palette.muted : palette.textSoft} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { const next = repeatMode === 'none' ? 'one' : 'none'; repeatModeRef.current = next; setRepeatMode(next); }}
              style={st.npBtn}
            >
              <Ionicons name="repeat" size={20} color={repeatMode === 'one' ? palette.primaryDark : palette.textSoft} />
            </TouchableOpacity>
            {playbackState === 'loading' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <TouchableOpacity onPress={togglePlayPause} style={st.npPlayBtn}>
                <Ionicons name={playbackState === 'playing' ? 'pause' : 'play'} size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={stopPlayback} style={st.npBtn}>
              <Ionicons name="stop" size={20} color={palette.textSoft} />
            </TouchableOpacity>
            <TouchableOpacity onPress={playNextSurah} style={st.npBtn} disabled={!selectedSurah || selectedSurah.id === 114}>
              <Ionicons name="play-skip-forward" size={20} color={(!selectedSurah || selectedSurah.id === 114) ? palette.muted : palette.textSoft} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Surah List */}
      <FlatList
        data={filteredSurahs}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        renderItem={({ item }) => {
          const isActive = selectedSurah?.id === item.id;
          return (
            <TouchableOpacity
              style={[st.surahRow, isActive && st.surahRowActive]}
              onPress={() => void playSurah(item)}
              activeOpacity={0.7}
            >
              <View style={[st.surahNum, isActive && { backgroundColor: palette.primaryDark }]}>
                <Text style={[st.surahNumText, isActive && { color: '#fff' }]}>{item.id}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[st.surahName, isActive && { color: palette.primaryDark }]}>{item.name}</Text>
                <Text style={st.surahMeta}>{item.versesCount} versets · {item.revelationType === 'meccan' ? 'Mecquoise' : 'Médinoise'}</Text>
              </View>
              <Text style={st.surahArabic}>{item.arabicName}</Text>
              {isActive && playbackState === 'playing' && (
                <Ionicons name="musical-notes" size={16} color={palette.primaryDark} style={{ marginLeft: 8 }} />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  qariPicker: { marginHorizontal: 20, backgroundColor: palette.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: palette.border },
  qariPickerTitle: { fontSize: 14, fontWeight: '700', color: palette.text, marginBottom: 12 },
  qariItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 6 },
  qariItemActive: { backgroundColor: palette.primaryDark },
  qariName: { fontSize: 14, fontWeight: '600', color: palette.text },
  qariArabic: { fontSize: 13, color: palette.textSoft, fontFamily: 'Amiri-Regular', marginTop: 2 },
  nowPlaying: { marginHorizontal: 20, backgroundColor: palette.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: palette.border, flexDirection: 'row', alignItems: 'center' },
  npTitle: { fontSize: 15, fontWeight: '700', color: palette.text, fontFamily: 'Amiri-Regular' },
  npQari: { fontSize: 12, color: palette.textSoft, marginTop: 2 },
  npProgressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  npTime: { fontSize: 10, color: palette.muted, fontWeight: '500', width: 32 },
  npBarBg: { flex: 1, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2 },
  npBarFill: { height: 4, backgroundColor: palette.primaryDark, borderRadius: 2 },
  npControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 },
  npBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  npPlayBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.primaryDark, alignItems: 'center', justifyContent: 'center' },
  surahRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: palette.border },
  surahRowActive: { borderColor: palette.primaryDark, borderWidth: 2 },
  surahNum: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  surahNumText: { fontSize: 13, fontWeight: '700', color: palette.text },
  surahName: { fontSize: 15, fontWeight: '600', color: palette.text },
  surahMeta: { fontSize: 11, color: palette.textSoft, marginTop: 2 },
  surahArabic: { fontSize: 18, color: palette.arabic, fontFamily: 'Amiri-Regular' },
});
