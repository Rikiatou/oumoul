import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@oumoul/ui';
import type { AuthUser } from '@oumoul/api';
import type { QuranSurahSummary, QuranVerse } from '@oumoul/api';
import { quranApi, tafsirApi } from '../api';
import * as SecureStore from 'expo-secure-store';
import { Audio, type AVPlaybackStatus } from 'expo-av';
import { sc, ss } from '../ui/theme';

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
      const response = await quranApi.listSurahs(language);
      setSurahs(response.surahs);
      if (response.surahs.length > 0) {
        setSelectedSurahId((prev) => prev ?? response.surahs[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de charger la liste des sourates.';
      setError(message);
      setSurahs([]);
      setSelectedSurahId(null);
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
      const response = await quranApi.getSurah(selectedSurahId, language);
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

export function ImaneQuranScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [searchQuery, setSearchQuery] = useState('');
  const [fontSizeIndex, setFontSizeIndex] = useState(1);
  const [showSurahList, setShowSurahList] = useState(true);

  const lastReadKey = useRef(`oumoul.quran.lastRead.${user.email}`).current;
  const bookmarksKey = useRef(`oumoul.quran.bookmarks.${user.email}`).current;
  const [lastRead, setLastRead] = useState<LastReadState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>([]);
  const [bookmarksHydrated, setBookmarksHydrated] = useState(false);

  const {
    surahs,
    loadingSurahs,
    error: surahError,
    selectedSurahId,
    setSelectedSurahId,
  } = useQuranSurahs(language);

  const { verses, loadingVerses, error: versesError } = useQuranVerses({ selectedSurahId, language });

  const [tafsirError, setTafsirError] = useState<string | null>(null);

  const error = surahError ?? versesError ?? tafsirError;
  const [tafSirLoading, setTafsirLoading] = useState(false);
  const [selectedTafsirAyah, setSelectedTafsirAyah] = useState<number | null>(null);
  const [tafSirText, setTafsirText] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioReciter, setAudioReciter] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const [verseOffsets, setVerseOffsets] = useState<Record<number, number>>({});
  const [didAutoScroll, setDidAutoScroll] = useState(false);

  const stopAndUnloadSound = useCallback(async () => {
    const existing = soundRef.current;
    if (!existing) return;
    soundRef.current = null;
    try {
      await existing.stopAsync();
    } catch {
    }
    try {
      await existing.unloadAsync();
    } catch {
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      void stopAndUnloadSound();
    };
  }, [stopAndUnloadSound]);

  useEffect(() => {
    setAudioError(null);
    setAudioReciter(null);
    void stopAndUnloadSound();
  }, [selectedSurahId, stopAndUnloadSound]);

  const ensureAudioLoaded = useCallback(async () => {
    if (selectedSurahId === null) return null;
    if (soundRef.current) return soundRef.current;

    setAudioLoading(true);
    setAudioError(null);
    try {
      const response = await quranApi.getSurahAudio(selectedSurahId);
      setAudioReciter(response.reciter);
      const { sound } = await Audio.Sound.createAsync(
        { uri: response.audioUrl },
        { shouldPlay: false },
        (status: AVPlaybackStatus) => {
          if (!status.isLoaded) {
            setIsPlaying(false);
            return;
          }
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        },
      );
      soundRef.current = sound;
      return sound;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger l'audio.";
      setAudioError(message);
      return null;
    } finally {
      setAudioLoading(false);
    }
  }, [selectedSurahId]);

  const toggleAudio = useCallback(async () => {
    const sound = await ensureAudioLoaded();
    if (!sound) return;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de lire l'audio.";
      setAudioError(message);
    }
  }, [ensureAudioLoaded]);

  const stopAudio = useCallback(async () => {
    await stopAndUnloadSound();
  }, [stopAndUnloadSound]);

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
      } catch {
      } finally {
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
      } catch {
      } finally {
        if (isMounted) setBookmarksHydrated(true);
      }
    };
    void hydrateBookmarks();
    return () => {
      isMounted = false;
    };
  }, [bookmarksKey]);

  useEffect(() => {
    if (!hydrated) return;
    if (!lastRead) return;
    if (!selectedSurahId) return;
    if (selectedSurahId !== lastRead.surahId) return;
    const y = verseOffsets[lastRead.ayah];
    if (typeof y !== 'number') return;
    if (didAutoScroll) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    setDidAutoScroll(true);
  }, [didAutoScroll, hydrated, lastRead, selectedSurahId, verseOffsets]);

  useEffect(() => {
    setSelectedTafsirAyah(null);
    setTafsirText(null);
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
      } catch {
      }
    },
    [lastReadKey],
  );

  const persistBookmarks = useCallback(
    async (next: QuranBookmark[]) => {
      try {
        await SecureStore.setItemAsync(bookmarksKey, JSON.stringify(next));
      } catch {
      }
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
      setTafsirLoading(true);
      setSelectedTafsirAyah(ayahNumber);
      setTafsirError(null);
      setAndPersistLastRead({ surahId, ayah: ayahNumber, language });
      try {
        const response = await tafsirApi.getTafsir({ surah: surahId, ayah: ayahNumber, locale: language });
        setTafsirText(response.text);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Impossible de charger le résumé.';
        setTafsirError(message);
        setTafsirText(null);
      } finally {
        setTafsirLoading(false);
      }
    },
    [language, setAndPersistLastRead],
  );

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return surahs;
    const q = searchQuery.toLowerCase().trim();
    return surahs.filter(
      (s) =>
        s.nameSimple?.toLowerCase().includes(q) ||
        s.nameArabic?.includes(q) ||
        String(s.id) === q ||
        `sourate ${s.id}` === q
    );
  }, [surahs, searchQuery]);

  const currentFont = FONT_SIZES[fontSizeIndex];
  const selectedSurah = useMemo(() => surahs.find((s) => s.id === selectedSurahId), [surahs, selectedSurahId]);

  const handleSelectSurah = useCallback((id: number) => {
    setSelectedSurahId(id);
    setShowSurahList(false);
    setSearchQuery('');
  }, [setSelectedSurahId]);

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
          <LanguageToggle language={language} onChange={setLanguage} />
        </View>

        {/* Search */}
        <View style={q.searchContainer}>
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
                    <Text style={q.surahMeta}>
                      {surah.revelationPlace === 'makkah' ? 'Mecquoise' : 'Médinoise'} · {surah.versesCount} versets
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={q.surahArabic}>{surah.nameArabic}</Text>
                    {hasBookmark && <Ionicons name="bookmark" size={12} color={q_c.accent} />}
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
          {/* Audio controls */}
          <TouchableOpacity style={q.iconBtn} onPress={() => void toggleAudio()} disabled={audioLoading}>
            <Ionicons name={audioLoading ? 'hourglass-outline' : isPlaying ? 'pause' : 'play'} size={18} color={q_c.accent} />
          </TouchableOpacity>
          {isPlaying && (
            <TouchableOpacity style={q.iconBtn} onPress={() => void stopAudio()}>
              <Ionicons name="stop" size={18} color={q_c.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Font size controls */}
      <View style={q.fontBar}>
        <TouchableOpacity
          style={[q.fontBtn, fontSizeIndex === 0 && { opacity: 0.3 }]}
          onPress={() => setFontSizeIndex((i) => Math.max(0, i - 1))}
          disabled={fontSizeIndex === 0}
        >
          <Text style={q.fontBtnText}>A-</Text>
        </TouchableOpacity>
        <Text style={q.fontLabel}>{currentFont.label}</Text>
        <TouchableOpacity
          style={[q.fontBtn, fontSizeIndex === FONT_SIZES.length - 1 && { opacity: 0.3 }]}
          onPress={() => setFontSizeIndex((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
          disabled={fontSizeIndex === FONT_SIZES.length - 1}
        >
          <Text style={q.fontBtnText}>A+</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <LanguageToggle language={language} onChange={setLanguage} />
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
          {verses.map((verse) => {
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
                      onPress={() => markLastRead(verse.verseNumber)}
                    >
                      <Ionicons name="eye-outline" size={18} color={isLastRead ? q_c.accent : q_c.muted} />
                    </TouchableOpacity>
                    {selectedSurahId !== null && (
                      <>
                        <TouchableOpacity
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => void handleShowTafsir(selectedSurahId, verse.verseNumber)}
                          disabled={tafSirLoading && selectedTafsirAyah === verse.verseNumber}
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

                {/* Divider */}
                <View style={q.verseDivider} />

                {/* Translation */}
                {verse.textTranslated && (
                  <Text style={[q.translationText, { fontSize: currentFont.trans, lineHeight: currentFont.trans * 1.6 }]}>
                    {verse.textTranslated}
                  </Text>
                )}

                {/* Tafsir inline */}
                {selectedTafsirAyah === verse.verseNumber && tafSirLoading && (
                  <ActivityIndicator color={q_c.accent} style={{ marginTop: 8 }} />
                )}
                {selectedTafsirAyah === verse.verseNumber && tafSirText && (
                  <View style={q.tafsirBox}>
                    <Text style={q.tafsirLabel}>Tafsir</Text>
                    <Text style={[q.tafsirText, { fontSize: currentFont.trans, lineHeight: currentFont.trans * 1.6 }]}>{tafSirText}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Bookmarks floating button */}
      {sortedBookmarks.length > 0 && (
        <View style={q.bookmarkFab}>
          <TouchableOpacity
            style={q.fabBtn}
            onPress={() => {
              if (sortedBookmarks.length > 0) {
                jumpToBookmark(sortedBookmarks[0]);
              }
            }}
          >
            <Ionicons name="bookmarks" size={20} color="#fff" />
            <Text style={q.fabText}>{sortedBookmarks.length}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Quran-specific colors & styles ──
const q_c = {
  bg: '#FAFAF5',
  card: '#FFFFFF',
  cardActive: '#F0F7F4',
  border: 'rgba(0,0,0,0.06)',
  text: '#1A1A1A',
  textSoft: 'rgba(26,26,26,0.6)',
  muted: 'rgba(26,26,26,0.35)',
  accent: colors.primaryDark,
  accentLight: 'rgba(26,127,100,0.1)',
  error: '#D32F2F',
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
  surahMeta: { fontSize: 12, color: q_c.muted },
  surahArabic: { fontSize: 18, color: q_c.text, fontWeight: '500' },

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
  bismillahText: { fontSize: 26, color: q_c.accent, fontWeight: '500' },

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
    color: q_c.text,
    textAlign: 'right',
    fontWeight: '400',
  },
  verseDivider: {
    height: 1,
    backgroundColor: q_c.border,
    marginVertical: 12,
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
});
