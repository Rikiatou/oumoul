import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@oumoul/ui';
import type { AuthUser } from '@oumoul/api';
import type { QuranSurahSummary, QuranVerse } from '@oumoul/api';
import { quranApi, tafsirApi } from '../api';
import * as SecureStore from 'expo-secure-store';
import { useRef } from 'react';
import { Audio, type AVPlaybackStatus } from 'expo-av';

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
    <View className="flex-row gap-sm">
      {(['fr', 'en'] as const).map((lang) => {
        const isActive = language === lang;
        return (
          <TouchableOpacity
            key={lang}
            className={`px-md py-xs rounded-md border ${isActive ? 'bg-neutral-100 border-transparent' : 'border-white/40'}`}
            onPress={() => onChange(lang)}
          >
            <Text
              style={{
                color: isActive ? colors.primary : colors.neutral100,
                fontWeight: '600',
              }}
            >
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

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingVertical: 32, paddingHorizontal: 20 }}>
        <View className="mb-xl">
          <Text className="text-neutral-100 text-xs tracking-[4px] uppercase">{user.firstName || user.email}</Text>
          <Text className="text-neutral-100 text-3xl font-bold mt-sm">Coran & tafsir</Text>
          <Text className="text-neutral-100/80 text-base leading-6 mt-xs">
            Choisis une sourate pour lire les versets en arabe avec une traduction simplifiée.
          </Text>
          <View className="flex-row gap-sm mt-md">
            <TouchableOpacity
              className="border border-white/60 rounded-md px-md py-xs"
              onPress={onBack}
            >
              <Text style={{ color: colors.neutral100, fontWeight: '600' }}>Retour</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl">
          <View className="flex-row justify-between items-center mb-md">
            <Text className="text-neutral-100 text-xl font-semibold">Sourates</Text>
            <LanguageToggle language={language} onChange={setLanguage} />
          </View>

          {loadingSurahs ? (
            <ActivityIndicator color={colors.neutral100} />
          ) : surahs.length === 0 ? (
            <Text className="text-neutral-100/70">Aucune sourate trouvée.</Text>
          ) : (
            <View className="gap-xs max-h-80">
              {surahs.map((surah) => {
                const isActive = surah.id === selectedSurahId;
                return (
                  <TouchableOpacity
                    key={surah.id}
                    className={`rounded-md px-md py-sm mb-xs border ${
                      isActive ? 'bg-white/15 border-white/60' : 'bg-white/5 border-white/20'
                    }`}
                    onPress={() => setSelectedSurahId(surah.id)}
                  >
                    <View className="flex-row justify-between items-center">
                      <View className="gap-1">
                        <Text className="text-neutral-100/70 text-xs">Sourate {surah.id}</Text>
                        <Text className="text-neutral-100 text-base font-semibold">{surah.nameSimple}</Text>
                        <Text className="text-neutral-100/80 text-base">{surah.nameArabic}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-neutral-100/70 text-xs">
                          {surah.revelationPlace === 'makkah' ? 'Makkiyah' : 'Madaniyah'}
                        </Text>
                        <Text className="text-neutral-100/80 text-xs">{surah.versesCount} versets</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl">
          <View className="flex-row items-center justify-between mb-sm" style={{ gap: 12 }}>
            <Text className="text-neutral-100 text-xl font-semibold">Versets</Text>
            {selectedSurahId !== null && (
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <TouchableOpacity
                  className="border border-white/50 rounded-md px-sm py-xs"
                  onPress={() => void toggleAudio()}
                  disabled={audioLoading}
                >
                  <Text className="text-neutral-100 text-xs font-semibold">
                    {audioLoading ? 'Audio…' : isPlaying ? 'Pause' : 'Play'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="border border-white/50 rounded-md px-sm py-xs"
                  onPress={() => void stopAudio()}
                  disabled={audioLoading || !soundRef.current}
                >
                  <Text className="text-neutral-100 text-xs font-semibold">Stop</Text>
                </TouchableOpacity>
                {audioReciter && (
                  <Text className="text-neutral-100/70 text-xs" numberOfLines={1}>
                    {audioReciter}
                  </Text>
                )}
              </View>
            )}
          </View>
          {audioError && <Text className="text-[#ffb4ab] mb-sm">{audioError}</Text>}
          {error && <Text className="text-[#ffb4ab] mb-sm">{error}</Text>}
          {loadingVerses ? (
            <ActivityIndicator color={colors.neutral100} />
          ) : verses.length === 0 ? (
            <Text className="text-neutral-100/70">Sélectionne une sourate pour afficher ses versets.</Text>
          ) : (
            <View className="gap-sm">
              {verses.map((verse) => (
                <TouchableOpacity
                  key={verse.verseNumber}
                  activeOpacity={0.9}
                  className={
                    lastRead?.surahId === selectedSurahId && lastRead?.ayah === verse.verseNumber
                      ? 'bg-white/10 border border-white/30 rounded-md px-md py-sm gap-xs'
                      : 'bg-white/5 rounded-md px-md py-sm gap-xs'
                  }
                  onPress={() => markLastRead(verse.verseNumber)}
                  onLayout={(e) => {
                    const y = e.nativeEvent.layout.y;
                    setVerseOffsets((prev) => (prev[verse.verseNumber] === y ? prev : { ...prev, [verse.verseNumber]: y }));
                  }}
                >
                  <View className="flex-row justify-between items-center mb-xs">
                    <Text className="text-neutral-100/70 text-xs tracking-[2px] uppercase">
                      Verset {verse.verseNumber}
                    </Text>
                    {selectedSurahId !== null && (
                      <View className="flex-row items-center" style={{ gap: 8 }}>
                        <TouchableOpacity
                          className="border border-white/50 rounded-md px-sm py-xs"
                          onPress={(e) => {
                            e.stopPropagation();
                            void handleShowTafsir(selectedSurahId, verse.verseNumber);
                          }}
                          disabled={tafSirLoading && selectedTafsirAyah === verse.verseNumber}
                        >
                          <Text className="text-neutral-100 text-xs font-semibold">
                            {tafSirLoading && selectedTafsirAyah === verse.verseNumber
                              ? 'Chargement du résumé…'
                              : 'Voir résumé'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="border border-white/50 rounded-md px-sm py-xs"
                          onPress={(e) => {
                            e.stopPropagation();
                            toggleBookmark(selectedSurahId, verse.verseNumber);
                          }}
                        >
                          <Text className="text-neutral-100 text-xs font-semibold">
                            {bookmarkSet.has(bookmarkKeyFor(selectedSurahId, verse.verseNumber)) ? '★' : '☆'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <Text className="text-neutral-100 text-xl text-right" style={{ lineHeight: 34 }}>
                    {verse.textArabic}
                  </Text>
                  {verse.textTranslated && (
                    <Text className="text-neutral-100/80 text-sm mt-xs" style={{ lineHeight: 20 }}>
                      {verse.textTranslated}
                    </Text>
                  )}
                  {selectedTafsirAyah === verse.verseNumber && tafSirText && (
                    <View className="mt-xs bg-black/40 rounded-md px-md py-sm">
                      <Text className="text-neutral-100/90 text-sm leading-6">
                        {tafSirText}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {sortedBookmarks.length > 0 && (
          <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl">
            <View className="flex-row justify-between items-center mb-sm">
              <Text className="text-neutral-100 text-xl font-semibold">Bookmarks</Text>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Text className="text-neutral-100/70 text-xs">{sortedBookmarks.length}</Text>
                <TouchableOpacity
                  className="border border-white/40 rounded-md px-sm py-xs"
                  onPress={() => clearBookmarks()}
                >
                  <Text className="text-neutral-100 text-xs font-semibold">Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View className="gap-xs">
              {sortedBookmarks.slice(0, 30).map((b) => (
                <View key={`${b.surahId}:${b.ayah}`} className="bg-white/5 rounded-md px-md py-sm">
                  <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => jumpToBookmark(b)}>
                      <Text className="text-neutral-100 font-semibold">
                        {surahNameById.get(b.surahId) ?? `Sourate ${b.surahId}`} · Verset {b.ayah}
                      </Text>
                      <Text className="text-neutral-100/70 text-xs">Tap pour revenir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="border border-white/40 rounded-md px-sm py-xs"
                      onPress={() => removeBookmark(b)}
                    >
                      <Text className="text-neutral-100 text-xs font-semibold">Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
