import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
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

export function ImaneQuranScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');

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

  const insets = useSafeAreaInsets();

  return (
    <View style={[ss.screen, { paddingTop: insets.top }]}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={ss.mb20}>
          <TouchableOpacity onPress={onBack} style={[ss.row, ss.gap4, ss.mb12]}>
            <Ionicons name="chevron-back" size={20} color={sc.accent} />
            <Text style={{ color: sc.accent, fontWeight: '600', fontSize: 14 }}>Retour</Text>
          </TouchableOpacity>
          <Text style={ss.title}>Coran & tafsir</Text>
          <Text style={ss.subtitle}>Choisis une sourate pour lire les versets en arabe avec traduction.</Text>
        </View>

        {/* Surahs card */}
        <View style={ss.card}>
          <View style={[ss.row, { justifyContent: 'space-between', marginBottom: 10 }]}>
            <Text style={ss.sectionTitle}>Sourates</Text>
            <LanguageToggle language={language} onChange={setLanguage} />
          </View>

          {loadingSurahs ? (
            <ActivityIndicator color={sc.accent} />
          ) : surahs.length === 0 ? (
            <Text style={ss.muted}>Aucune sourate trouvée.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <View style={{ gap: 6 }}>
                {surahs.map((surah) => {
                  const isActive = surah.id === selectedSurahId;
                  return (
                    <TouchableOpacity
                      key={surah.id}
                      style={[
                        ss.infoRow,
                        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
                        isActive && { backgroundColor: 'rgba(0,0,0,0.06)', borderWidth: 1, borderColor: sc.accent, borderRadius: 10 },
                      ]}
                      onPress={() => setSelectedSurahId(surah.id)}
                    >
                      <View style={{ gap: 2 }}>
                        <Text style={{ color: sc.muted, fontSize: 10 }}>Sourate {surah.id}</Text>
                        <Text style={{ color: sc.text, fontSize: 14, fontWeight: '600' }}>{surah.nameSimple}</Text>
                        <Text style={{ color: sc.textSoft, fontSize: 13 }}>{surah.nameArabic}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: sc.muted, fontSize: 10 }}>
                          {surah.revelationPlace === 'makkah' ? 'Makkiyah' : 'Madaniyah'}
                        </Text>
                        <Text style={{ color: sc.textSoft, fontSize: 11 }}>{surah.versesCount} versets</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Verses card */}
        <View style={ss.card}>
          <View style={[ss.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
            <Text style={ss.sectionTitle}>Versets</Text>
            {selectedSurahId !== null && (
              <View style={[ss.row, ss.gap6]}>
                <TouchableOpacity
                  style={ss.outlineBtn}
                  onPress={() => void toggleAudio()}
                  disabled={audioLoading}
                >
                  <Ionicons name={audioLoading ? 'hourglass-outline' : isPlaying ? 'pause' : 'play'} size={14} color={sc.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={ss.outlineBtn}
                  onPress={() => void stopAudio()}
                  disabled={audioLoading || !soundRef.current}
                >
                  <Ionicons name="stop" size={14} color={sc.text} />
                </TouchableOpacity>
                {audioReciter && (
                  <Text style={{ color: sc.muted, fontSize: 10, maxWidth: 100 }} numberOfLines={1}>{audioReciter}</Text>
                )}
              </View>
            )}
          </View>
          {audioError && <Text style={[ss.errorText, ss.mb8]}>{audioError}</Text>}
          {error && <Text style={[ss.errorText, ss.mb8]}>{error}</Text>}
          {loadingVerses ? (
            <ActivityIndicator color={sc.accent} />
          ) : verses.length === 0 ? (
            <Text style={ss.muted}>Sélectionne une sourate pour afficher ses versets.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {verses.map((verse) => {
                const isLastRead = lastRead?.surahId === selectedSurahId && lastRead?.ayah === verse.verseNumber;
                return (
                  <TouchableOpacity
                    key={verse.verseNumber}
                    activeOpacity={0.9}
                    style={[
                      ss.infoRow,
                      { gap: 6 },
                      isLastRead && { backgroundColor: 'rgba(0,0,0,0.06)', borderWidth: 1, borderColor: sc.accent, borderRadius: 10 },
                    ]}
                    onPress={() => markLastRead(verse.verseNumber)}
                    onLayout={(e) => {
                      const y = e.nativeEvent.layout.y;
                      setVerseOffsets((prev) => (prev[verse.verseNumber] === y ? prev : { ...prev, [verse.verseNumber]: y }));
                    }}
                  >
                    <View style={[ss.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
                      <Text style={ss.label}>Verset {verse.verseNumber}</Text>
                      {selectedSurahId !== null && (
                        <View style={[ss.row, ss.gap6]}>
                          <TouchableOpacity
                            style={ss.outlineBtn}
                            onPress={(e) => { e.stopPropagation(); void handleShowTafsir(selectedSurahId, verse.verseNumber); }}
                            disabled={tafSirLoading && selectedTafsirAyah === verse.verseNumber}
                          >
                            <Text style={ss.outlineBtnText}>
                              {tafSirLoading && selectedTafsirAyah === verse.verseNumber ? 'Résumé…' : 'Résumé'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={ss.outlineBtn}
                            onPress={(e) => { e.stopPropagation(); toggleBookmark(selectedSurahId, verse.verseNumber); }}
                          >
                            <Ionicons
                              name={bookmarkSet.has(bookmarkKeyFor(selectedSurahId, verse.verseNumber)) ? 'bookmark' : 'bookmark-outline'}
                              size={14}
                              color={sc.accent}
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: sc.text, fontSize: 20, textAlign: 'right', lineHeight: 34 }}>
                      {verse.textArabic}
                    </Text>
                    {verse.textTranslated && (
                      <Text style={{ color: sc.textSoft, fontSize: 13, lineHeight: 20, marginTop: 4 }}>
                        {verse.textTranslated}
                      </Text>
                    )}
                    {selectedTafsirAyah === verse.verseNumber && tafSirText && (
                      <View style={{ marginTop: 6, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: 12 }}>
                        <Text style={{ color: sc.text, fontSize: 13, lineHeight: 20 }}>{tafSirText}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Bookmarks card */}
        {sortedBookmarks.length > 0 && (
          <View style={ss.card}>
            <View style={[ss.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
              <Text style={ss.sectionTitle}>Bookmarks ({sortedBookmarks.length})</Text>
              <TouchableOpacity style={ss.outlineBtn} onPress={() => clearBookmarks()}>
                <Text style={ss.outlineBtnText}>Tout effacer</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 6 }}>
              {sortedBookmarks.slice(0, 30).map((b) => (
                <View key={`${b.surahId}:${b.ayah}`} style={[ss.infoRow, ss.row, { justifyContent: 'space-between' }]}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => jumpToBookmark(b)}>
                    <Text style={{ color: sc.text, fontWeight: '600', fontSize: 13 }}>
                      {surahNameById.get(b.surahId) ?? `Sourate ${b.surahId}`} · Verset {b.ayah}
                    </Text>
                    <Text style={{ color: sc.muted, fontSize: 11 }}>Tap pour revenir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={ss.outlineBtn} onPress={() => removeBookmark(b)}>
                    <Ionicons name="trash-outline" size={14} color={sc.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
