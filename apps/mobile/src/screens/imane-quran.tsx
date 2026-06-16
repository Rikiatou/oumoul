import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AuthUser } from '@oumoul/api';
import type { QuranSurahSummary, QuranVerse } from '@oumoul/api';
import { quranApi, tafsirApi } from '../api';
import * as SecureStore from 'expo-secure-store';
import { offlineCache, CACHE_KEYS, CACHE_TTL } from '../utils/offline-cache';
import TrackPlayer from 'react-native-track-player';
import { State, usePlaybackState, useProgress, Capability, Event, useTrackPlayerEvents } from 'react-native-track-player';
import { sc, ss } from '../ui/theme';
import { palette } from '../theme';
import { HelpTip } from '../components/HelpTip';

type LastReadState = {
  surahId: number;
  ayah: number;
  language: 'fr' | 'en';
};

type QuranBookmark = {
  surahId: number;
  ayah: number;
};

function LanguageToggle({
  language,
  onChange,
}: {
  language: 'fr' | 'en';
  onChange: (next: 'fr' | 'en') => void;
}) {
  return (
    <View style={[ss.row, ss.gap6]}>
      {(['fr', 'en'] as const).map((lang) => {
        const isActive = language === lang;
        return (
          <TouchableOpacity
            key={lang}
            style={[ss.chip, isActive && ss.chipActive]}
            onPress={() => onChange(lang)}
          >
            <Text style={[ss.chipText, isActive && ss.chipTextActive]}>
              {lang === 'fr' ? 'Français' : 'Anglais'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function useQuranSurahs(language: 'fr' | 'en') {
  const [surahs, setSurahs] = useState<QuranSurahSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);

  const loadSurahs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cacheKey = `${CACHE_KEYS.QURAN_SURAHS}_${language}`;
      let response = await offlineCache.getWithFallback(
        cacheKey,
        () => quranApi.listSurahs(language),
        CACHE_TTL.WEEK,
      );
      // Defensive fallback: if API returns empty list, retry with French
      if (!response?.surahs?.length && language !== 'fr') {
        const frCacheKey = `${CACHE_KEYS.QURAN_SURAHS}_fr`;
        response = await offlineCache.getWithFallback(
          frCacheKey,
          () => quranApi.listSurahs('fr'),
          CACHE_TTL.WEEK,
        );
      }
      setSurahs(response.surahs ?? []);
      if (response.surahs?.length > 0) {
        setSelectedSurahId((prev) => prev ?? response.surahs[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de charger la liste des sourates.';
      setError(message);
      setSurahs([]);
      setSelectedSurahId(null);
      // Clear stale cache to force fresh fetch on next attempt
      await offlineCache.remove(`${CACHE_KEYS.QURAN_SURAHS}_${language}`);
      if (language !== 'fr') {
        await offlineCache.remove(`${CACHE_KEYS.QURAN_SURAHS}_fr`);
      }
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void loadSurahs();
  }, [loadSurahs]);

  return {
    surahs,
    loadingSurahs: loading,
    error,
    selectedSurahId,
    setSelectedSurahId,
    reload: loadSurahs,
  } as const;
}

function useQuranVerses({ selectedSurahId, language }: { selectedSurahId: number | null; language: 'fr' | 'en' }) {
  const [verses, setVerses] = useState<QuranVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVerses = useCallback(async () => {
    if (selectedSurahId === null) {
      setVerses([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cacheKey = `quran_surah_${selectedSurahId}_${language}`;
      const response = await offlineCache.getWithFallback(
        cacheKey,
        () => quranApi.getSurah(selectedSurahId, language),
        CACHE_TTL.WEEK,
      );
      setVerses(response.verses);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de charger les versets.';
      setError(message);
      setVerses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSurahId, language]);

  useEffect(() => {
    void loadVerses();
  }, [loadVerses]);

  return { verses, loadingVerses: loading, error, reload: loadVerses } as const;
}

const FONT_SIZES = [
  { arabic: 18, trans: 12, label: 'Petit' },
  { arabic: 22, trans: 13, label: 'Normal' },
  { arabic: 26, trans: 14, label: 'Grand' },
  { arabic: 32, trans: 16, label: 'Très grand' },
  { arabic: 40, trans: 18, label: 'Maximum' },
];

function formatAudioTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const RECITERS = [
  { id: 'mishary', name: 'Mishary Alafasy', nameAr: 'مشاري العفاسي' },
  { id: 'sudais', name: 'Abdur-Rahman As-Sudais', nameAr: 'عبد الرحمن السديس' },
  { id: 'minshawi', name: 'Mohamed Siddiq Al-Minshawi', nameAr: 'محمد صديق المنشاوي' },
];

// Exact Juz start positions (surah + ayah)
const JUZ_TO_SURAH = [
  { juz: 1,  startSurah: 1,  startAyah: 1,   label: 'Al-Fatiha — Al-Baqara 141'   },
  { juz: 2,  startSurah: 2,  startAyah: 142, label: 'Al-Baqara 142—252'           },
  { juz: 3,  startSurah: 2,  startAyah: 253, label: 'Al-Baqara 253 — Al-Imran 92' },
  { juz: 4,  startSurah: 3,  startAyah: 93,  label: 'Al-Imran 93 — An-Nisa 23'    },
  { juz: 5,  startSurah: 4,  startAyah: 24,  label: 'An-Nisa 24—147'              },
  { juz: 6,  startSurah: 4,  startAyah: 148, label: 'An-Nisa 148 — Al-Maida 81'   },
  { juz: 7,  startSurah: 5,  startAyah: 82,  label: 'Al-Maida 82 — Al-Anam 110'   },
  { juz: 8,  startSurah: 6,  startAyah: 111, label: 'Al-Anam 111 — Al-Araf 87'    },
  { juz: 9,  startSurah: 7,  startAyah: 88,  label: 'Al-Araf 88 — Al-Anfal 40'    },
  { juz: 10, startSurah: 8,  startAyah: 41,  label: 'Al-Anfal 41 — At-Tawba 92'   },
  { juz: 11, startSurah: 9,  startAyah: 93,  label: 'At-Tawba 93 — Hud 5'         },
  { juz: 12, startSurah: 11, startAyah: 6,   label: 'Hud 6 — Yusuf 52'            },
  { juz: 13, startSurah: 12, startAyah: 53,  label: 'Yusuf 53 — Ibrahim 52'       },
  { juz: 14, startSurah: 15, startAyah: 1,   label: 'Al-Hijr — An-Nahl 128'       },
  { juz: 15, startSurah: 17, startAyah: 1,   label: 'Al-Isra — Al-Kahf 74'        },
  { juz: 16, startSurah: 18, startAyah: 75,  label: 'Al-Kahf 75 — Ta-Ha 135'      },
  { juz: 17, startSurah: 21, startAyah: 1,   label: 'Al-Anbiya — Al-Hajj 78'      },
  { juz: 18, startSurah: 23, startAyah: 1,   label: 'Al-Muminun — Al-Furqan 20'   },
  { juz: 19, startSurah: 25, startAyah: 21,  label: 'Al-Furqan 21 — An-Naml 55'   },
  { juz: 20, startSurah: 27, startAyah: 56,  label: 'An-Naml 56 — Al-Ankabut 45'  },
  { juz: 21, startSurah: 29, startAyah: 46,  label: 'Al-Ankabut 46 — Al-Ahzab 30' },
  { juz: 22, startSurah: 33, startAyah: 31,  label: 'Al-Ahzab 31 — Ya-Sin 27'     },
  { juz: 23, startSurah: 36, startAyah: 28,  label: 'Ya-Sin 28 — Az-Zumar 31'     },
  { juz: 24, startSurah: 39, startAyah: 32,  label: 'Az-Zumar 32 — Fussilat 46'   },
  { juz: 25, startSurah: 41, startAyah: 47,  label: 'Fussilat 47 — Al-Jathiya 37' },
  { juz: 26, startSurah: 46, startAyah: 1,   label: 'Al-Ahqaf — Adh-Dhariyat 30'  },
  { juz: 27, startSurah: 51, startAyah: 31,  label: 'Adh-Dhariyat 31 — Al-Hadid'  },
  { juz: 28, startSurah: 58, startAyah: 1,   label: 'Al-Mujadila — At-Tahrim'     },
  { juz: 29, startSurah: 67, startAyah: 1,   label: 'Al-Mulk — Al-Mursalat'       },
  { juz: 30, startSurah: 78, startAyah: 1,   label: 'An-Naba — An-Nas'            },
];

export function ImaneQuranScreen({
  user,
  onBack,
  onOpenTafsir,
  onOpenAudio,
  onOpenWords,
  onOpenRecitation,
}: {
  user: AuthUser;
  onBack: () => void;
  onOpenTafsir?: (surahId: number, ayah: number, locale: 'fr' | 'en') => void;
  onOpenAudio?: () => void;
  onOpenWords?: () => void;
  onOpenRecitation?: () => void;
}) {
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [searchQuery, setSearchQuery] = useState('');
  const [fontSizeIndex, setFontSizeIndex] = useState(2);
  const [showSurahList, setShowSurahList] = useState(true);
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);

  // Force show surah list on mount to ensure correct initial state
  useEffect(() => {
    setShowSurahList(true);
  }, []);

  const lastReadKey = useRef(`oumoul.quran.lastRead.${user.email}`).current;
  const bookmarksKey = useRef(`oumoul.quran.bookmarks.${user.email}`).current;
  const fontSizeKey = useRef(`oumoul.quran.fontSize.${user.email}`).current;
  const [lastRead, setLastRead] = useState<LastReadState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>([]);
  const [bookmarksHydrated, setBookmarksHydrated] = useState(false);

  // Persist font size
  useEffect(() => {
    SecureStore.getItemAsync(fontSizeKey).then((v) => {
      if (v !== null) {
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n >= 0 && n < FONT_SIZES.length) setFontSizeIndex(n);
      }
    }).catch(() => {});
  }, [fontSizeKey]);

  const setFontSizeIndexPersisted = useCallback((idx: number) => {
    setFontSizeIndex(idx);
    SecureStore.setItemAsync(fontSizeKey, String(idx)).catch(() => {});
  }, [fontSizeKey]);

  const {
    surahs,
    loadingSurahs,
    error: surahError,
    selectedSurahId,
    setSelectedSurahId,
  } = useQuranSurahs(language);

  const { verses, loadingVerses, error: versesError } = useQuranVerses({ selectedSurahId, language });

  const selectedSurah = useMemo(() => surahs.find((s) => s.id === selectedSurahId), [surahs, selectedSurahId]);

  const [tafsirError, setTafsirError] = useState<string | null>(null);

  const error = surahError ?? versesError ?? tafsirError;
  const [tafsirOpenKey, setTafsirOpenKey] = useState<string | null>(null);
  const [tafsirLoadingKey, setTafsirLoadingKey] = useState<string | null>(null);
  const [tafsirTextByKey, setTafsirTextByKey] = useState<Record<string, string>>({});
  const tafsirRequestIdRef = useRef(0);

  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioReciter, setAudioReciter] = useState<string | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState('mishary');
  const [pendingAutoPlay, setPendingAutoPlay] = useState(false);

  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing || playbackState.state === State.Buffering;
  const progress = useProgress(500);
  const audioPosition = Math.round(progress.position * 1000);
  const audioDuration = Math.round(progress.duration * 1000);
  const [continuousPlayback, setContinuousPlayback] = useState(false);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [showJuzModal, setShowJuzModal] = useState(false);
  const [readSurahs, setReadSurahs] = useState<Set<number>>(new Set());
  const readSurahsKey = useRef(`oumoul.quran.readSurahs.${user.email}`).current;
  const [juzTargetAyah, setJuzTargetAyah] = useState<number | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const [verseOffsets, setVerseOffsets] = useState<Record<number, number>>({});
  const [didAutoScroll, setDidAutoScroll] = useState(false);

  // ── TrackPlayer setup (once per app session) ──
  useEffect(() => {
    TrackPlayer.setupPlayer({ autoHandleInterruptions: true })
      .then(() => TrackPlayer.updateOptions({
        capabilities: [Capability.Play, Capability.Pause, Capability.Stop, Capability.SeekTo],
        compactCapabilities: [Capability.Play, Capability.Pause],
        notificationCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
      }))
      .catch(() => { /* player already initialised */ });
  }, []);

  const stopAndUnloadSound = useCallback(async () => {
    try { await TrackPlayer.reset(); } catch { /* ignore */ }
    setAudioLoaded(false);
    setAudioReciter(null);
  }, []);

  // Intentionally do NOT stop audio on unmount — allows background playback when leaving screen.

  useEffect(() => {
    setAudioError(null);
    void stopAndUnloadSound();
  }, [selectedSurahId, stopAndUnloadSound]);

  const loadAndPlayTrack = useCallback(async (autoPlay = false) => {
    if (selectedSurahId === null) return;
    setAudioLoading(true);
    setAudioError(null);
    try {
      const response = await quranApi.getSurahAudio(selectedSurahId, selectedReciter);
      setAudioReciter(response.reciter);
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: `surah-${selectedSurahId}`,
        url: response.audioUrl,
        title: selectedSurah?.nameSimple ?? `Sourate ${selectedSurahId}`,
        artist: response.reciter ?? 'Récitateur',
        album: 'Sirat An-Nour — القرآن الكريم',
      });
      setAudioLoaded(true);
      if (autoPlay) await TrackPlayer.play();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger l'audio.";
      setAudioError(message);
      setAudioLoaded(false);
    } finally {
      setAudioLoading(false);
    }
  }, [selectedSurahId, selectedReciter, selectedSurah?.nameSimple]);

  const toggleAudio = useCallback(async () => {
    if (!audioLoaded) {
      await loadAndPlayTrack(true);
      return;
    }
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }, [audioLoaded, isPlaying, loadAndPlayTrack]);

  const stopAudio = useCallback(async () => {
    await stopAndUnloadSound();
  }, [stopAndUnloadSound]);

  const seekAudio = useCallback(async (offsetMs: number) => {
    const nextSec = Math.max(0, Math.min(progress.duration, progress.position + offsetMs / 1000));
    await TrackPlayer.seekTo(nextSec);
  }, [progress.duration, progress.position]);

  // ── Continuous playback via TrackPlayer events ──
  const continuousPlaybackRef = useRef(continuousPlayback);
  useEffect(() => { continuousPlaybackRef.current = continuousPlayback; }, [continuousPlayback]);
  const selectedSurahIdRef = useRef(selectedSurahId);
  useEffect(() => { selectedSurahIdRef.current = selectedSurahId; }, [selectedSurahId]);

  useTrackPlayerEvents([Event.PlaybackQueueEnded], () => {
    if (continuousPlaybackRef.current && selectedSurahIdRef.current !== null && selectedSurahIdRef.current < 114) {
      setSelectedSurahId((prev) => prev !== null ? prev + 1 : null);
      setPendingAutoPlay(true);
    }
  });

  useEffect(() => {
    if (!pendingAutoPlay || selectedSurahId === null) return;
    setPendingAutoPlay(false);
    void loadAndPlayTrack(true);
  }, [pendingAutoPlay, selectedSurahId, loadAndPlayTrack]);

  // ── Verse search & memorization ──
  const [verseQuery, setVerseQuery] = useState('');
  const [memorizationMode, setMemorizationMode] = useState(false);
  const [copiedVerse, setCopiedVerse] = useState<number | null>(null);

  const filteredVerses = useMemo(() => {
    if (!verseQuery.trim()) return verses;
    const q = verseQuery.toLowerCase().trim();
    return verses.filter(
      (v) =>
        v.textArabic?.includes(q) ||
        v.textTransliteration?.toLowerCase().includes(q) ||
        v.textTranslated?.toLowerCase().includes(q) ||
        String(v.verseNumber) === q,
    );
  }, [verses, verseQuery]);

  const copyVerseText = useCallback((verse: QuranVerse) => {
    const text = `${verse.textArabic}\n${verse.textTranslated ?? ''}\n— ${selectedSurah?.nameSimple ?? 'Coran'} ${verse.verseNumber}`;
    try {
      // @ts-ignore - dynamic require for optional clipboard support
      const Clipboard = require('expo-clipboard');
      if (Clipboard?.setStringAsync) {
        void Clipboard.setStringAsync(text);
      }
    } catch {
      // clipboard module not available
    }
    setCopiedVerse(verse.verseNumber);
    setTimeout(() => setCopiedVerse(null), 2000);
  }, [selectedSurah?.nameSimple]);

  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      try {
        const raw = await SecureStore.getItemAsync(lastReadKey);
        if (!raw || !isMounted) {
          if (isMounted) setHydrated(true);
          return;
        }
        const parsed = JSON.parse(raw) as Partial<LastReadState>;
        if (
          typeof parsed.surahId === 'number' &&
          typeof parsed.ayah === 'number' &&
          (parsed.language === 'fr' || parsed.language === 'en')
        ) {
          setLastRead({ surahId: parsed.surahId, ayah: parsed.ayah, language: parsed.language });
          setLanguage(parsed.language);
        }
      } catch { /* ignore */ } finally {
        if (isMounted) setHydrated(true);
      }
    };
    void hydrate();
    return () => {
      isMounted = false;
    };
  }, [lastReadKey]);

  useEffect(() => {
    let isMounted = true;
    const hydrateBookmarks = async () => {
      try {
        const raw = await SecureStore.getItemAsync(bookmarksKey);
        if (!raw || !isMounted) {
          if (isMounted) setBookmarksHydrated(true);
          return;
        }
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
          if (isMounted) setBookmarksHydrated(true);
          return;
        }
        const cleaned: QuranBookmark[] = parsed
          .map((item) => {
            const candidate = item as Partial<QuranBookmark>;
            if (typeof candidate.surahId !== 'number' || typeof candidate.ayah !== 'number') return null;
            if (!Number.isFinite(candidate.surahId) || !Number.isFinite(candidate.ayah)) return null;
            return { surahId: candidate.surahId, ayah: candidate.ayah };
          })
          .filter((x): x is QuranBookmark => Boolean(x));
        if (isMounted) setBookmarks(cleaned);
      } catch { /* ignore */ } finally {
        if (isMounted) setBookmarksHydrated(true);
      }
    };
    void hydrateBookmarks();
    return () => {
      isMounted = false;
    };
  }, [bookmarksKey]);

  useEffect(() => {
    if (didAutoScroll) return;
    // Priority: Juz target > last read
    const targetAyah = juzTargetAyah ?? (hydrated && lastRead && selectedSurahId === lastRead.surahId ? lastRead.ayah : null);
    if (!targetAyah) return;
    if (!selectedSurahId) return;
    const y = verseOffsets[targetAyah];
    if (typeof y !== 'number') return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    setDidAutoScroll(true);
    setJuzTargetAyah(null);
  }, [didAutoScroll, hydrated, juzTargetAyah, lastRead, selectedSurahId, verseOffsets]);

  useEffect(() => {
    setTafsirOpenKey(null);
    setTafsirLoadingKey(null);
    setTafsirTextByKey({});
    setTafsirError(null);
    setVerseOffsets({});
    setDidAutoScroll(false);
  }, [selectedSurahId, language]);

  useEffect(() => {
    if (!hydrated) return;
    if (!lastRead) return;
    if (selectedSurahId !== null) return;
    setSelectedSurahId(lastRead.surahId);
  }, [hydrated, lastRead, selectedSurahId, setSelectedSurahId]);

  const persistLastRead = useCallback(
    async (next: LastReadState) => {
      try {
        await SecureStore.setItemAsync(lastReadKey, JSON.stringify(next));
      } catch { /* ignore */ }
    },
    [lastReadKey],
  );

  const persistBookmarks = useCallback(
    async (next: QuranBookmark[]) => {
      try {
        await SecureStore.setItemAsync(bookmarksKey, JSON.stringify(next));
      } catch { /* ignore */ }
    },
    [bookmarksKey],
  );

  const setAndPersistLastRead = useCallback(
    (next: LastReadState) => {
      setLastRead(next);
      void persistLastRead(next);
    },
    [persistLastRead],
  );

  const markLastRead = useCallback(
    (ayahNumber: number) => {
      if (selectedSurahId === null) return;
      setAndPersistLastRead({ surahId: selectedSurahId, ayah: ayahNumber, language });
    },
    [language, selectedSurahId, setAndPersistLastRead],
  );

  const bookmarkKeyFor = useCallback((surahId: number, ayah: number) => `${surahId}:${ayah}`, []);

  const bookmarkSet = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookmarks) {
      set.add(bookmarkKeyFor(b.surahId, b.ayah));
    }
    return set;
  }, [bookmarkKeyFor, bookmarks]);

  const surahNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of surahs) {
      map.set(s.id, s.nameSimple ?? `Sourate ${s.id}`);
    }
    return map;
  }, [surahs]);

  // Load persisted read surahs
  useEffect(() => {
    SecureStore.getItemAsync(readSurahsKey).then((raw) => {
      if (!raw) return;
      try {
        const ids = JSON.parse(raw) as number[];
        if (Array.isArray(ids)) setReadSurahs(new Set(ids));
      } catch { /* ignore */ }
    }).catch(() => {});
  }, [readSurahsKey]);

  // Track read surahs — update when entering a surah
  const markSurahAsRead = useCallback((surahId: number) => {
    setReadSurahs((prev) => {
      if (prev.has(surahId)) return prev;
      const next = new Set(prev);
      next.add(surahId);
      SecureStore.setItemAsync(readSurahsKey, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, [readSurahsKey]);

  const progressPercent = useMemo(() => {
    if (surahs.length === 0) return 0;
    return Math.round((readSurahs.size / surahs.length) * 100);
  }, [readSurahs.size, surahs.length]);

  const sortedBookmarks = useMemo(() => {
    return [...bookmarks].sort((a, b) => (a.surahId - b.surahId) || (a.ayah - b.ayah));
  }, [bookmarks]);

  const toggleBookmark = useCallback(
    (surahId: number, ayah: number) => {
      setBookmarks((prev) => {
        const key = bookmarkKeyFor(surahId, ayah);
        const exists = prev.some((b) => bookmarkKeyFor(b.surahId, b.ayah) === key);
        const next = exists ? prev.filter((b) => bookmarkKeyFor(b.surahId, b.ayah) !== key) : [...prev, { surahId, ayah }];
        void persistBookmarks(next);
        return next;
      });
    },
    [bookmarkKeyFor, persistBookmarks],
  );

  const removeBookmark = useCallback(
    (target: QuranBookmark) => {
      setBookmarks((prev) => {
        const key = bookmarkKeyFor(target.surahId, target.ayah);
        const next = prev.filter((b) => bookmarkKeyFor(b.surahId, b.ayah) !== key);
        void persistBookmarks(next);
        return next;
      });
    },
    [bookmarkKeyFor, persistBookmarks],
  );

  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
    void persistBookmarks([]);
  }, [persistBookmarks]);

  const jumpToBookmark = useCallback(
    (target: QuranBookmark) => {
      if (!bookmarksHydrated) return;
      setSelectedSurahId(target.surahId);
      setAndPersistLastRead({ surahId: target.surahId, ayah: target.ayah, language });
    },
    [bookmarksHydrated, language, setAndPersistLastRead, setSelectedSurahId],
  );

  const handleShowTafsir = useCallback(
    async (surahId: number, ayahNumber: number) => {
      const key = `${surahId}:${ayahNumber}:${language}`;

      if (tafsirOpenKey === key) {
        setTafsirOpenKey(null);
        return;
      }

      setTafsirOpenKey(key);
      setTafsirError(null);
      setAndPersistLastRead({ surahId, ayah: ayahNumber, language });

      if (tafsirTextByKey[key]) {
        return;
      }

      setTafsirLoadingKey(key);
      const requestId = ++tafsirRequestIdRef.current;
      try {
        const tafsirCacheKey = `tafsir_${surahId}_${ayahNumber}_${language}`;
        const response = await offlineCache.getWithFallback(
          tafsirCacheKey,
          () => tafsirApi.getTafsir({ surah: surahId, ayah: ayahNumber, locale: language }),
          CACHE_TTL.WEEK,
        );
        if (tafsirRequestIdRef.current !== requestId) return;
        setTafsirTextByKey((prev) => (prev[key] === response.text ? prev : { ...prev, [key]: response.text }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Impossible de charger le résumé.';
        setTafsirError(message);
      } finally {
        if (tafsirRequestIdRef.current === requestId) {
          setTafsirLoadingKey((prev) => (prev === key ? null : prev));
        }
      }
    },
    [language, setAndPersistLastRead, tafsirOpenKey, tafsirTextByKey],
  );

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return surahs;
    const sq = searchQuery.toLowerCase().trim();
    return surahs.filter(
      (s) =>
        s.nameSimple?.toLowerCase().includes(sq) ||
        s.nameArabic?.includes(sq) ||
        s.nameTranslated?.toLowerCase().includes(sq) ||
        s.nameSimple?.toLowerCase().replace('al-', '').includes(sq) ||
        String(s.id) === sq ||
        `sourate ${s.id}` === sq
    );
  }, [surahs, searchQuery]);

  const currentFont = FONT_SIZES[fontSizeIndex];

  const handleSelectSurah = useCallback((id: number) => {
    setSelectedSurahId(id);
    setShowSurahList(false);
    setSearchQuery('');
    markSurahAsRead(id);
  }, [setSelectedSurahId, markSurahAsRead]);

  const insets = useSafeAreaInsets();

  // ── SURAH LIST VIEW ──
  if (showSurahList) {
    return (
      <View style={[q.screen, { paddingTop: insets.top }]}>
        {/* Top bar */}
        <View style={q.topBar}>
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color={q_c.accent} />
          </TouchableOpacity>
          <Text style={q.topTitle}>القرآن الكريم</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <HelpTip screenName="Lire le Coran" tips={[
              { icon: 'book', title: 'Parcourir les sourates', description: 'Sélectionne une sourate dans la liste pour lire ses versets avec traduction.' },
              { icon: 'language', title: 'Langue', description: 'Bascule entre français et anglais avec le bouton FR/EN.' },
              { icon: 'text', title: 'Taille de police', description: 'Ajuste la taille du texte arabe et de la traduction avec le curseur.' },
              { icon: 'bookmark', title: 'Signets', description: 'Appuie sur l\'icône signet pour marquer un verset. Retrouve tes signets dans le panneau dédié.' },
              { icon: 'play', title: 'Audio', description: 'Appuie sur l\'icône lecture pour écouter la récitation du verset.' },
              { icon: 'time', title: 'Dernière lecture', description: 'Ta position de lecture est sauvegardée automatiquement.' },
            ]} />
            <LanguageToggle language={language} onChange={setLanguage} />
          </View>
        </View>

        {/* Reading intro banner with progress */}
        <View style={q.readingIntroBanner}>
          <Ionicons name="book-outline" size={20} color={q_c.accent} />
          <View style={{ flex: 1 }}>
            <Text style={q.readingIntroTitle}>Lire le Saint Coran</Text>
            <Text style={q.readingIntroSub}>Appuie sur une sourate pour lire avec traduction</Text>
          </View>
          {readSurahs.size > 0 && (
            <View style={q.progressBadge}>
              <Text style={q.progressBadgeText}>{progressPercent}%</Text>
            </View>
          )}
        </View>

        {/* Quick access tools */}
        {(onOpenAudio || onOpenWords || onOpenRecitation) && (
          <View style={q.quickToolsBar}>
            {onOpenAudio && (
              <TouchableOpacity style={q.quickToolBtn} onPress={onOpenAudio} activeOpacity={0.75}>
                <Ionicons name="musical-note" size={18} color={q_c.accent} />
                <Text style={q.quickToolBtnText}>Écouter</Text>
              </TouchableOpacity>
            )}
            {onOpenWords && (
              <TouchableOpacity style={q.quickToolBtn} onPress={onOpenWords} activeOpacity={0.75}>
                <Ionicons name="language" size={18} color={q_c.accent} />
                <Text style={q.quickToolBtnText}>Vocabulaire</Text>
              </TouchableOpacity>
            )}
            {onOpenRecitation && (
              <TouchableOpacity style={q.quickToolBtn} onPress={onOpenRecitation} activeOpacity={0.75}>
                <Ionicons name="mic" size={18} color={q_c.accent} />
                <Text style={q.quickToolBtnText}>Récitation</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Search + Juz button row */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
          <View style={[q.searchContainer, { flex: 1, marginHorizontal: 0, marginVertical: 10 }]}>
            <Ionicons name="search" size={18} color={q_c.muted} style={{ marginLeft: 14 }} />
            <TextInput
              style={q.searchInput}
              placeholder="Rechercher une sourate..."
              placeholderTextColor={q_c.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ paddingRight: 14 }}>
                <Ionicons name="close-circle" size={18} color={q_c.muted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={q.juzBtn} onPress={() => setShowJuzModal(true)}>
            <Ionicons name="book" size={18} color={q_c.accent} />
            <Text style={q.juzBtnText}>Juz</Text>
          </TouchableOpacity>
        </View>

        {/* Last read banner */}
        {lastRead && hydrated && (
          <TouchableOpacity
            style={q.lastReadBanner}
            onPress={() => { handleSelectSurah(lastRead.surahId); }}
          >
            <Ionicons name="bookmark" size={16} color="#fff" />
            <Text style={q.lastReadText}>
              Continuer : {surahNameById.get(lastRead.surahId) ?? `Sourate ${lastRead.surahId}`} · Verset {lastRead.ayah}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}

        {/* Surah list */}
        {loadingSurahs ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={q_c.accent} />
          </View>
        ) : (
          <FlatList
            data={filteredSurahs}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: surah }) => {
              const isActive = surah.id === selectedSurahId;
              const hasBookmark = bookmarks.some((b) => b.surahId === surah.id);
              return (
                <TouchableOpacity
                  style={[q.surahRow, isActive && q.surahRowActive]}
                  onPress={() => handleSelectSurah(surah.id)}
                  activeOpacity={0.7}
                >
                  <View style={q.surahNumber}>
                    <Text style={q.surahNumberText}>{surah.id}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={q.surahName}>{surah.nameSimple}</Text>
                    <Text style={q.surahNameTranslated}>{surah.nameTranslated ?? ''}</Text>
                    <Text style={q.surahMeta}>
                      {surah.revelationPlace === 'makkah' ? 'Mecquoise' : 'Médinoise'} · {surah.versesCount} versets
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={q.surahArabic}>{surah.nameArabic}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {readSurahs.has(surah.id) && <Ionicons name="checkmark-circle" size={12} color={q_c.accent} />}
                      {hasBookmark && <Ionicons name="bookmark" size={12} color={q_c.accent} />}
                      <Text style={{ fontSize: 11, color: q_c.accent, fontWeight: '600' }}>Lire →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: q_c.muted, textAlign: 'center', marginTop: 40, fontSize: 14 }}>
                Aucune sourate trouvée pour "{searchQuery}"
              </Text>
            }
          />
        )}
      </View>
    );
  }

  // ── READING VIEW ──
  return (
    <View style={[q.screen, { paddingTop: insets.top }]}>
      {/* Reading top bar */}
      <View style={q.readingBar}>
        <TouchableOpacity onPress={() => setShowSurahList(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={q_c.accent} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={q.readingTitle} numberOfLines={1}>{selectedSurah?.nameSimple ?? ''}</Text>
          <Text style={q.readingSubtitle}>{selectedSurah?.nameArabic ?? ''}</Text>
        </View>
        <View style={[ss.row, ss.gap6]}>
          <TouchableOpacity style={q.iconBtn} onPress={() => setMemorizationMode((v) => !v)}>
            <Ionicons name={memorizationMode ? 'eye-off' : 'eye'} size={18} color={memorizationMode ? q_c.accent : q_c.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={q.iconBtn} onPress={() => setShowReciterModal(true)}>
            <Ionicons name="settings-outline" size={18} color={q_c.muted} />
          </TouchableOpacity>
          {/* Audio controls */}
          <TouchableOpacity style={q.iconBtn} onPress={() => void toggleAudio()} disabled={audioLoading}>
            <Ionicons name={audioLoading ? 'hourglass-outline' : isPlaying ? 'pause' : 'play'} size={18} color={q_c.accent} />
          </TouchableOpacity>
          {audioLoaded && (
            <TouchableOpacity style={q.iconBtn} onPress={() => void stopAudio()}>
              <Ionicons name="stop" size={18} color={q_c.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Prev / Next surah navigation */}
      {surahs.length > 0 && selectedSurahId !== null && (
        <View style={q.surahNavBar}>
          <TouchableOpacity
            style={[q.surahNavBtn, selectedSurahId <= 1 && { opacity: 0.3 }]}
            onPress={() => { if (selectedSurahId > 1) { setSelectedSurahId(selectedSurahId - 1); setVerseQuery(''); } }}
            disabled={selectedSurahId <= 1}
          >
            <Ionicons name="chevron-back" size={16} color={q_c.accent} />
            <Text style={q.surahNavText} numberOfLines={1}>
              {surahs.find(s => s.id === selectedSurahId - 1)?.nameSimple ?? ''}
            </Text>
          </TouchableOpacity>
          <Text style={q.surahNavCount}>{selectedSurahId}/114</Text>
          <TouchableOpacity
            style={[q.surahNavBtn, q.surahNavBtnRight, selectedSurahId >= 114 && { opacity: 0.3 }]}
            onPress={() => { if (selectedSurahId < 114) { setSelectedSurahId(selectedSurahId + 1); setVerseQuery(''); } }}
            disabled={selectedSurahId >= 114}
          >
            <Text style={q.surahNavText} numberOfLines={1}>
              {surahs.find(s => s.id === selectedSurahId + 1)?.nameSimple ?? ''}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={q_c.accent} />
          </TouchableOpacity>
        </View>
      )}

      {/* Audio progress bar */}
      {audioDuration > 0 && (
        <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
          <View style={q.audioProgressTrack}>
            <View style={[q.audioProgressFill, { width: `${Math.min(100, (audioPosition / audioDuration) * 100)}%` }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            <Text style={{ fontSize: 11, color: q_c.muted }}>{formatAudioTime(audioPosition)}</Text>
            <Text style={{ fontSize: 11, color: q_c.muted }}>{formatAudioTime(audioDuration)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 4 }}>
            <TouchableOpacity onPress={() => void seekAudio(-15000)}>
              <Ionicons name="play-back" size={18} color={q_c.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void seekAudio(15000)}>
              <Ionicons name="play-forward" size={18} color={q_c.accent} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Font size + search + language */}
      <View style={q.fontBar}>
        <TouchableOpacity
          style={[q.fontBtn, fontSizeIndex === 0 && { opacity: 0.3 }]}
          onPress={() => setFontSizeIndexPersisted(Math.max(0, fontSizeIndex - 1))}
          disabled={fontSizeIndex === 0}
        >
          <Text style={q.fontBtnText}>A-</Text>
        </TouchableOpacity>
        <Text style={q.fontLabel}>{currentFont.label}</Text>
        <TouchableOpacity
          style={[q.fontBtn, fontSizeIndex === FONT_SIZES.length - 1 && { opacity: 0.3 }]}
          onPress={() => setFontSizeIndexPersisted(Math.min(FONT_SIZES.length - 1, fontSizeIndex + 1))}
          disabled={fontSizeIndex === FONT_SIZES.length - 1}
        >
          <Text style={q.fontBtnText}>A+</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <LanguageToggle language={language} onChange={setLanguage} />
      </View>

      {/* Verse search */}
      <View style={q.verseSearchContainer}>
        <Ionicons name="search" size={16} color={q_c.muted} style={{ marginLeft: 12 }} />
        <TextInput
          style={q.verseSearchInput}
          placeholder="Rechercher un verset..."
          placeholderTextColor={q_c.muted}
          value={verseQuery}
          onChangeText={setVerseQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {verseQuery.length > 0 && (
          <TouchableOpacity onPress={() => setVerseQuery('')} style={{ paddingRight: 12 }}>
            <Ionicons name="close-circle" size={16} color={q_c.muted} />
          </TouchableOpacity>
        )}
      </View>

      {audioError && <Text style={[ss.errorText, { paddingHorizontal: 20, marginBottom: 4 }]}>{audioError}</Text>}
      {audioReciter && <Text style={{ color: q_c.muted, fontSize: 11, paddingHorizontal: 20, marginBottom: 4 }}>Récitateur : {audioReciter}</Text>}
      {error && <Text style={[ss.errorText, { paddingHorizontal: 20, marginBottom: 4 }]}>{error}</Text>}

      {/* Bismillah header */}
      {selectedSurahId !== null && selectedSurahId !== 9 && (
        <View style={q.bismillah}>
          <Text style={q.bismillahText}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>
        </View>
      )}

      {/* Verses */}
      {loadingVerses ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={q_c.accent} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {verseQuery.trim() && filteredVerses.length === 0 && (
            <Text style={{ color: q_c.muted, textAlign: 'center', marginTop: 40, fontSize: 14 }}>
              Aucun verset trouvé pour "{verseQuery}"
            </Text>
          )}
          {filteredVerses.map((verse) => {
            const isLastRead = lastRead?.surahId === selectedSurahId && lastRead?.ayah === verse.verseNumber;
            const isBookmarked = selectedSurahId !== null && bookmarkSet.has(bookmarkKeyFor(selectedSurahId, verse.verseNumber));
            return (
              <View
                key={verse.verseNumber}
                style={[q.verseCard, isLastRead && q.verseCardActive]}
                onLayout={(e) => {
                  const y = e.nativeEvent.layout.y;
                  setVerseOffsets((prev) => (prev[verse.verseNumber] === y ? prev : { ...prev, [verse.verseNumber]: y }));
                }}
              >
                {/* Verse number badge + actions */}
                <View style={q.verseHeader}>
                  <View style={q.verseBadge}>
                    <Text style={q.verseBadgeText}>{verse.verseNumber}</Text>
                  </View>
                  <View style={[ss.row, ss.gap8]}>
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => copyVerseText(verse)}
                    >
                      <Ionicons name={copiedVerse === verse.verseNumber ? 'checkmark' : 'copy-outline'} size={18} color={copiedVerse === verse.verseNumber ? '#059669' : q_c.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => markLastRead(verse.verseNumber)}
                    >
                      <Ionicons name="eye-outline" size={18} color={isLastRead ? q_c.accent : q_c.muted} />
                    </TouchableOpacity>
                    {selectedSurahId !== null && (
                      <>
                        <TouchableOpacity
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => void handleShowTafsir(selectedSurahId, verse.verseNumber)}
                          onLongPress={() => {
                            if (!onOpenTafsir) return;
                            onOpenTafsir(selectedSurahId, verse.verseNumber, language);
                          }}
                          disabled={tafsirLoadingKey === `${selectedSurahId}:${verse.verseNumber}:${language}`}
                        >
                          <Ionicons name="book-outline" size={18} color={q_c.muted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => toggleBookmark(selectedSurahId, verse.verseNumber)}
                        >
                          <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={18} color={isBookmarked ? q_c.accent : q_c.muted} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>

                {/* Arabic text */}
                <Text style={[q.arabicText, { fontSize: currentFont.arabic, lineHeight: currentFont.arabic * 1.8 }]}>
                  {verse.textArabic}
                </Text>

                {/* Transliteration — hidden in memorization mode */}
                {!memorizationMode && verse.textTransliteration && (
                  <Text style={[q.transliterationText, { fontSize: currentFont.trans - 1, lineHeight: (currentFont.trans - 1) * 1.5 }]}>
                    {verse.textTransliteration}
                  </Text>
                )}

                {/* Divider — hidden in memorization mode */}
                {!memorizationMode && <View style={q.verseDivider} />}

                {/* Translation — hidden in memorization mode */}
                {!memorizationMode && verse.textTranslated && (
                  <Text style={[q.translationText, { fontSize: currentFont.trans, lineHeight: currentFont.trans * 1.6 }]}>
                    {verse.textTranslated}
                  </Text>
                )}

                {/* Tafsir inline */}
                {!memorizationMode && tafsirOpenKey === `${selectedSurahId}:${verse.verseNumber}:${language}` && tafsirLoadingKey === `${selectedSurahId}:${verse.verseNumber}:${language}` && (
                  <ActivityIndicator color={q_c.accent} style={{ marginTop: 8 }} />
                )}
                {!memorizationMode && tafsirOpenKey === `${selectedSurahId}:${verse.verseNumber}:${language}` && tafsirTextByKey[`${selectedSurahId}:${verse.verseNumber}:${language}`] && (
                  <View style={q.tafsirBox}>
                    <Text style={q.tafsirLabel}>Tafsir</Text>
                    <Text style={[q.tafsirText, { fontSize: currentFont.trans, lineHeight: currentFont.trans * 1.6 }]}>{tafsirTextByKey[`${selectedSurahId}:${verse.verseNumber}:${language}`]}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Bookmarks FAB */}
      {sortedBookmarks.length > 0 && (
        <View style={q.bookmarkFab}>
          <TouchableOpacity style={q.fabBtn} onPress={() => setShowBookmarksPanel(true)}>
            <Ionicons name="bookmarks" size={20} color="#fff" />
            <Text style={q.fabText}>{sortedBookmarks.length}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Juz Selection Modal */}
      {showJuzModal && (
        <View style={q.reciterModal}>
          <View style={q.reciterModalContent}>
            <View style={q.reciterModalHeader}>
              <Text style={q.reciterModalTitle}>Juz (30 parties)</Text>
              <TouchableOpacity onPress={() => setShowJuzModal(false)}>
                <Ionicons name="close" size={24} color={q_c.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {JUZ_TO_SURAH.map((juz) => (
                <TouchableOpacity
                  key={juz.juz}
                  style={q.reciterItem}
                  onPress={() => {
                    setSelectedSurahId(juz.startSurah);
                    setJuzTargetAyah(juz.startAyah);
                    setDidAutoScroll(false);
                    setShowJuzModal(false);
                    setShowSurahList(false);
                    markSurahAsRead(juz.startSurah);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={q.reciterName}>Juz {juz.juz}</Text>
                    <Text style={q.reciterNameAr}>{juz.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={q_c.muted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Settings Modal (reciter + continuous) */}
      {showReciterModal && (
        <View style={q.reciterModal}>
          <View style={q.reciterModalContent}>
            <View style={q.reciterModalHeader}>
              <Text style={q.reciterModalTitle}>Paramètres audio</Text>
              <TouchableOpacity onPress={() => setShowReciterModal(false)}>
                <Ionicons name="close" size={24} color={q_c.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Continuous playback toggle */}
              <TouchableOpacity
                style={[q.reciterItem, { justifyContent: 'space-between' }]}
                onPress={() => setContinuousPlayback((v) => !v)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={q.reciterName}>Récitation continue</Text>
                  <Text style={q.reciterNameAr}>Passer automatiquement à la sourate suivante</Text>
                </View>
                <View style={[q.continuousToggle, continuousPlayback && q.continuousToggleOn]}>
                  <Ionicons name={continuousPlayback ? 'repeat' : 'repeat-outline'} size={16} color={continuousPlayback ? '#fff' : q_c.muted} />
                </View>
              </TouchableOpacity>
              <View style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: q_c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Récitateur</Text>
              </View>
              {RECITERS.map((reciter) => (
                <TouchableOpacity
                  key={reciter.id}
                  style={[q.reciterItem, selectedReciter === reciter.id && q.reciterItemActive]}
                  onPress={() => {
                    setSelectedReciter(reciter.id);
                    setShowReciterModal(false);
                    // Reload audio with new reciter
                    void stopAndUnloadSound();
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={q.reciterName}>{reciter.name}</Text>
                    <Text style={q.reciterNameAr}>{reciter.nameAr}</Text>
                  </View>
                  {selectedReciter === reciter.id && (
                    <Ionicons name="checkmark-circle" size={20} color={q_c.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Bookmarks Panel */}
      {showBookmarksPanel && (
        <View style={q.bookmarksPanel}>
          <View style={q.bookmarksPanelHeader}>
            <Text style={q.bookmarksPanelTitle}>Mes signets ({sortedBookmarks.length})</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {sortedBookmarks.length > 0 && (
                <TouchableOpacity onPress={() => { clearBookmarks(); setShowBookmarksPanel(false); }}>
                  <Text style={{ color: '#C62828', fontWeight: '600', fontSize: 13 }}>Tout effacer</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowBookmarksPanel(false)}>
                <Ionicons name="close" size={22} color={q_c.text} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {sortedBookmarks.map((bm) => (
              <TouchableOpacity
                key={`${bm.surahId}:${bm.ayah}`}
                style={q.bookmarkItem}
                onPress={() => { jumpToBookmark(bm); setShowBookmarksPanel(false); }}
              >
                <View style={q.bookmarkItemLeft}>
                  <Ionicons name="bookmark" size={16} color={q_c.accent} />
                  <View>
                    <Text style={q.bookmarkItemTitle}>
                      {surahNameById.get(bm.surahId) ?? `Sourate ${bm.surahId}`}
                    </Text>
                    <Text style={q.bookmarkItemSub}>Verset {bm.ayah}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeBookmark(bm)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={16} color={q_c.muted} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ── Quran-specific colors & styles ──
const q_c = {
  bg: palette.bgAlt,
  card: palette.card,
  cardActive: '#F0F7F4',
  border: palette.border,
  text: palette.text,
  textSoft: palette.textSoft,
  muted: palette.muted,
  accent: palette.primaryDark,
  accentLight: palette.accentLightAlt,
  error: palette.error,
};

const q = StyleSheet.create({
  screen: { flex: 1, backgroundColor: q_c.bg },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: q_c.border,
  },
  topTitle: { fontSize: 22, fontWeight: '700', color: q_c.accent },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: q_c.border,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 15,
    color: q_c.text,
  },

  // Juz button
  juzBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: q_c.accentLight,
    borderWidth: 1,
    borderColor: q_c.accent + '30',
    marginTop: 10,
    marginBottom: 10,
  },
  juzBtnText: { fontSize: 13, fontWeight: '600', color: q_c.accent },

  // Reading intro banner
  readingIntroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: q_c.accentLight,
    marginHorizontal: 16,
    marginBottom: 4,
    marginTop: 4,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: q_c.accent + '30',
  },
  readingIntroTitle: { fontSize: 14, fontWeight: '700', color: q_c.accent },
  readingIntroSub: { fontSize: 12, color: q_c.muted, marginTop: 1 },

  // Progress badge
  progressBadge: {
    backgroundColor: q_c.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Quick tools bar
  quickToolsBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: q_c.accentLight,
    borderWidth: 1,
    borderColor: q_c.accent + '30',
  },
  quickToolBtnText: { fontSize: 13, fontWeight: '600', color: q_c.accent },

  // Last read banner
  lastReadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: q_c.accent,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  lastReadText: { flex: 1, color: '#fff', fontWeight: '600', fontSize: 13 },

  // Surah list
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: q_c.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: q_c.border,
    gap: 14,
  },
  surahRowActive: {
    borderColor: q_c.accent,
    backgroundColor: q_c.accentLight,
  },
  surahNumber: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: q_c.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNumberText: { fontSize: 14, fontWeight: '700', color: q_c.accent },
  surahName: { fontSize: 15, fontWeight: '600', color: q_c.text },
  surahNameTranslated: { fontSize: 12, color: q_c.accent, fontStyle: 'italic' },
  surahMeta: { fontSize: 12, color: q_c.muted },
  surahArabic: { fontSize: 20, color: q_c.text, fontFamily: 'Amiri-Regular' },

  // Surah navigation bar (prev/next)
  surahNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: q_c.border,
    backgroundColor: q_c.bg,
  },
  surahNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '40%',
  },
  surahNavBtnRight: { justifyContent: 'flex-end' },
  surahNavText: { fontSize: 12, color: q_c.accent, fontWeight: '500', flexShrink: 1 },
  surahNavCount: { fontSize: 12, color: q_c.muted, fontWeight: '600' },

  // Continuous toggle
  continuousToggle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: q_c.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continuousToggleOn: { backgroundColor: q_c.accent },

  // Reading bar
  readingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: q_c.border,
    gap: 8,
  },
  readingTitle: { fontSize: 16, fontWeight: '700', color: q_c.text },
  readingSubtitle: { fontSize: 14, color: q_c.muted },

  // Font bar
  fontBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: q_c.border,
  },
  fontBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontBtnText: { fontSize: 15, fontWeight: '700', color: q_c.text },
  fontLabel: { fontSize: 12, color: q_c.muted, minWidth: 60, textAlign: 'center' },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: q_c.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bismillah
  bismillah: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  bismillahText: { fontSize: 28, color: q_c.accent, fontFamily: 'Amiri-Bold' },

  // Verse card
  verseCard: {
    backgroundColor: q_c.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: q_c.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  verseCardActive: {
    borderColor: q_c.accent,
    backgroundColor: q_c.cardActive,
  },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  verseBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: q_c.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verseBadgeText: { fontSize: 12, fontWeight: '700', color: q_c.accent },

  arabicText: {
    color: '#1B3A2D',
    textAlign: 'right',
    fontFamily: 'Amiri-Bold',
    letterSpacing: 0.5,
  },
  quickTool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: q_c.accentLight,
    borderWidth: 1,
    borderColor: q_c.accent + '30',
  },
  quickToolText: { fontSize: 13, fontWeight: '600', color: q_c.accent },
  verseDivider: {
    height: 1,
    backgroundColor: q_c.border,
    marginVertical: 12,
  },
  transliterationText: {
    color: q_c.muted,
    fontStyle: 'italic',
    marginTop: 6,
  },
  translationText: {
    color: q_c.textSoft,
  },

  // Tafsir
  tafsirBox: {
    marginTop: 12,
    backgroundColor: 'rgba(26,127,100,0.06)',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: q_c.accent,
  },
  tafsirLabel: { fontSize: 11, fontWeight: '700', color: q_c.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  tafsirText: { color: q_c.text },

  // Bookmark FAB
  bookmarkFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
  },
  fabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: q_c.accent,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Bookmarks panel
  bookmarksPanel: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: q_c.bg, zIndex: 50,
  },
  bookmarksPanelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: q_c.border,
  },
  bookmarksPanelTitle: { fontSize: 17, fontWeight: '700', color: q_c.text },
  bookmarkItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: q_c.border,
  },
  bookmarkItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  bookmarkItemTitle: { fontSize: 14, fontWeight: '600', color: q_c.text },
  bookmarkItemSub: { fontSize: 12, color: q_c.muted, marginTop: 2 },

  // Audio progress
  audioProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  audioProgressFill: {
    height: 4,
    backgroundColor: q_c.accent,
    borderRadius: 2,
  },

  // Verse search
  verseSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: q_c.border,
  },
  verseSearchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: q_c.text,
  },

  // Reciter modal
  reciterModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  reciterModalContent: {
    backgroundColor: q_c.card,
    borderRadius: 20,
    width: '90%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  reciterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: q_c.border,
  },
  reciterModalTitle: { fontSize: 18, fontWeight: '700', color: q_c.text },
  reciterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: q_c.border,
    gap: 12,
  },
  reciterItemActive: {
    backgroundColor: q_c.accentLight,
  },
  reciterName: { fontSize: 15, fontWeight: '600', color: q_c.text },
  reciterNameAr: { fontSize: 14, color: q_c.muted, marginTop: 2 },
});

