import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@oumoul/ui';
import type { AuthUser, Locale, TafsirResponse } from '@oumoul/api';
import { quranApi, tafsirApi } from '../api';
import { loadTafsirSelection, saveTafsirSelection } from '../storage/tafsir-selection-store';
import { useRef } from 'react';

interface TafsirFormState {
  surah: string;
  ayah: string;
  locale: Locale;
  source?: string;
}

const DEFAULT_FORM: TafsirFormState = {
  surah: '2',
  ayah: '255',
  locale: 'fr',
  source: undefined,
};

export function TafsirScreen({ user, onBackToDashboard }: { user: AuthUser; onBackToDashboard: () => void }) {
  const [form, setForm] = useState<TafsirFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TafsirResponse | null>(null);
  const [sources, setSources] = useState<Array<{ key: string; name: string; author: string | null }>>([]);
  const [surahs, setSurahs] = useState<Array<{ id: number; name: string; nameArabic: string; versesCount: number }>>([]);
  const [ayahOptions, setAyahOptions] = useState<number[]>([]);
  const [surahLoading, setSurahLoading] = useState(false);
  const [ayahLoading, setAyahLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSources = async () => {
      try {
        const response = await tafsirApi.listSources(form.locale);
        if (!isMounted) return;
        setSources(response.sources.map((s) => ({ key: s.key, name: s.name, author: s.author ?? null })));
      } catch {
        if (!isMounted) return;
        setSources([]);
        setToast('Impossible de charger les sources.');
      }
    };

    void loadSources();
    return () => {
      isMounted = false;
    };
  }, [form.locale]);

  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      const persisted = await loadTafsirSelection();
      if (!isMounted) return;
      if (persisted) {
        setForm((prev) => ({
          surah: persisted.surah ?? prev.surah,
          ayah: persisted.ayah ?? prev.ayah,
          locale: (persisted.locale as Locale) ?? prev.locale,
          source: persisted.source ?? prev.source,
        }));
      }
      setHydrated(true);
    };
    void hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveTafsirSelection({
      surah: form.surah,
      ayah: form.ayah,
      locale: form.locale,
      source: form.source,
    });
  }, [form, hydrated]);

  useEffect(() => {
    let isMounted = true;
    const loadSurahs = async () => {
      setSurahLoading(true);
      try {
        const data = await quranApi.listSurahs(form.locale);
        if (!isMounted) return;
        const mapped = data.surahs.map((s) => ({
          id: s.id,
          name: s.nameSimple ?? `Surah ${s.id}`,
          nameArabic: s.nameArabic,
          versesCount: s.versesCount,
        }));
        setSurahs(mapped);
        const currentNum = Number.parseInt(form.surah, 10);
        const selected = mapped.find((s) => s.id === currentNum) ?? mapped[0];
        if (selected) {
          setForm((prev) => ({ ...prev, surah: String(selected.id) }));
        }
      } catch {
        setToast('Impossible de charger les sourates.');
      } finally {
        if (isMounted) setSurahLoading(false);
      }
    };
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void loadSurahs();
    }, 200);
    return () => {
      isMounted = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [form.locale]);

  useEffect(() => {
    let isMounted = true;
    const loadAyahs = async () => {
      const surahNum = Number.parseInt(form.surah, 10);
      if (!Number.isFinite(surahNum)) return;
      setAyahLoading(true);
      try {
        const data = await quranApi.getSurah(surahNum, form.locale === 'ar' ? 'ar' : form.locale);
        if (!isMounted) return;
        const count = data.verses.length;
        setAyahOptions(Array.from({ length: count }, (_, idx) => idx + 1));
        const ayahNum = Number.parseInt(form.ayah, 10);
        if (!Number.isFinite(ayahNum) || ayahNum < 1 || ayahNum > count) {
          setForm((prev) => ({ ...prev, ayah: String(Math.min(Math.max(1, ayahNum || 1), count)) }));
        }
      } finally {
        if (isMounted) setAyahLoading(false);
      }
    };
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void loadAyahs();
    }, 200);
    return () => {
      isMounted = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [form.surah, form.locale]);

  const surahLabel = useMemo(() => {
    const surahNum = Number.parseInt(form.surah, 10);
    const found = surahs.find((s) => s.id === surahNum);
    return found ? `${found.id}. ${found.name} (${found.nameArabic})` : `Sourate ${form.surah}`;
  }, [form.surah, surahs]);

  const handleFieldChange = useCallback(<K extends keyof TafsirFormState>(key: K, value: TafsirFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const surah = Number.parseInt(form.surah, 10);
      const ayah = Number.parseInt(form.ayah, 10);
      if (!Number.isFinite(surah) || !Number.isFinite(ayah) || surah <= 0 || ayah <= 0) {
        throw new Error('Veuillez fournir un numéro de sourate et de verset valides.');
      }

      const response = await tafsirApi.getTafsir({
        surah,
        ayah,
        locale: form.locale,
        source: form.source,
      });
      setResult(response);
      setToast('Tafsir chargé.');
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de récupérer le tafsir.";
      setError(message);
      setResult(null);
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, [form.surah, form.ayah, form.locale]);

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <ScrollView contentContainerStyle={{ paddingVertical: 32, paddingHorizontal: 20 }}>
        <View className="mb-xl">
          <Text className="text-neutral-100 text-xs tracking-[4px] uppercase">{user.firstName || user.email}</Text>
          <Text className="text-neutral-100 text-3xl font-bold mt-sm">Tafsir du Coran</Text>
          <Text className="text-neutral-100/80 text-base leading-6 mt-xs">
            Choisis une sourate et un verset pour consulter un tafsir authentique. Sélectionne une source précise ou laisse
            Auto pour un choix adapté à ta langue.
          </Text>
          <View className="flex-row gap-sm mt-md">
            <TouchableOpacity
              className="border border-white/60 rounded-md px-md py-xs"
              onPress={onBackToDashboard}
            >
              <Text style={{ color: colors.neutral100, fontWeight: '600' }}>Retour au tableau de bord</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="border border-white/60 rounded-md px-md py-xs"
              onPress={() => {
                setForm(DEFAULT_FORM);
                setResult(null);
                setError(null);
                setToast('Réinitialisé.');
              }}
            >
              <Text style={{ color: colors.neutral100, fontWeight: '600' }}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl">
          <Text className="text-neutral-100 text-xl font-semibold">Paramètres</Text>
          <View className="mt-md gap-sm">
            <View>
              <Text className="text-neutral-100/80 mb-xs">Sourate</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-xs">
                  {surahLoading && (
                    <>
                      <View className="w-28 h-12 rounded-md bg-white/20" />
                      <View className="w-24 h-12 rounded-md bg-white/14" />
                    </>
                  )}
                  {!surahLoading &&
                    surahs.map((surah) => {
                      const isActive = form.surah === String(surah.id);
                      return (
                        <TouchableOpacity
                          key={surah.id}
                          className={`px-md py-xs rounded-md border ${isActive ? 'bg-neutral-100 border-transparent' : 'border-white/40'}`}
                          onPress={() => handleFieldChange('surah', String(surah.id))}
                        >
                          <Text style={{ color: isActive ? colors.primary : colors.neutral100, fontWeight: '600' }}>
                            {surah.id}. {surah.name}
                          </Text>
                          <Text style={{ color: isActive ? colors.primary : colors.neutral100, fontSize: 11 }}>
                            {surah.nameArabic} · {surah.versesCount} versets
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </ScrollView>
            </View>
            <View>
              <Text className="text-neutral-100/80 mb-xs">Verset</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-xs">
                  {ayahLoading && (
                    <>
                      <View className="w-16 h-10 rounded-md bg-white/20" />
                      <View className="w-16 h-10 rounded-md bg-white/14" />
                    </>
                  )}
                  {!ayahLoading &&
                    ayahOptions.map((num) => {
                      const isActive = form.ayah === String(num);
                      return (
                        <TouchableOpacity
                          key={num}
                          className={`px-sm py-[6px] rounded-md border ${isActive ? 'bg-neutral-100 border-transparent' : 'border-white/40'}`}
                          onPress={() => handleFieldChange('ayah', String(num))}
                        >
                          <Text style={{ color: isActive ? colors.primary : colors.neutral100, fontWeight: '600' }}>{num}</Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </ScrollView>
            </View>
            <View>
              <Text className="text-neutral-100/80 mb-xs">Langue</Text>
              <View className="flex-row gap-sm">
                {(['fr', 'en', 'ar'] as Locale[]).map((locale) => {
                  const isActive = form.locale === locale;
                  return (
                    <TouchableOpacity
                      key={locale}
                      className={`px-md py-xs rounded-md border ${
                        isActive ? 'bg-neutral-100 border-transparent' : 'border-white/40'
                      }`}
                      onPress={() => handleFieldChange('locale', locale)}
                    >
                      <Text
                        style={{
                          color: isActive ? colors.primary : colors.neutral100,
                          fontWeight: '600',
                        }}
                      >
                        {locale === 'fr' ? 'Français' : locale === 'en' ? 'English' : 'العربية'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View>
              <Text className="text-neutral-100/80 mb-xs">Source</Text>
              <View className="flex-row flex-wrap gap-sm">
                <TouchableOpacity
                  className={`px-md py-xs rounded-md border ${
                    !form.source ? 'bg-neutral-100 border-transparent' : 'border-white/40'
                  }`}
                  onPress={() => handleFieldChange('source', undefined)}
                >
                  <Text style={{ color: !form.source ? colors.primary : colors.neutral100, fontWeight: '600' }}>
                    Auto
                  </Text>
                </TouchableOpacity>
                {sources.map((source) => {
                  const isActive = form.source === source.key;
                  return (
                    <TouchableOpacity
                      key={source.key}
                      className={`px-md py-xs rounded-md border ${
                        isActive ? 'bg-neutral-100 border-transparent' : 'border-white/40'
                      }`}
                      onPress={() => handleFieldChange('source', source.key)}
                    >
                      <Text style={{ color: isActive ? colors.primary : colors.neutral100, fontWeight: '600' }}>
                        {source.name}
                        {source.author ? ` — ${source.author}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <TouchableOpacity
              className="bg-neutral-100 rounded-lg py-sm items-center mt-sm"
              disabled={loading}
              onPress={() => void handleSubmit()}
            >
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {loading ? 'Chargement…' : 'Afficher le tafsir'}
              </Text>
            </TouchableOpacity>
            {error && <Text className="text-[#ffb4ab] mt-sm">{error}</Text>}
          </View>
        </View>

        {loading && (
          <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl gap-xs">
            <View className="w-32 h-4 rounded-md bg-white/15" />
            <View className="w-44 h-3 rounded-md bg-white/10" />
            <View className="h-[14px] rounded-md bg-white/12 mt-xs" />
            <View className="h-[14px] rounded-md bg-white/12" />
            <View className="h-[14px] rounded-md bg-white/12 w-5/6" />
          </View>
        )}

        {!loading && result && (
          <View className="bg-black/40 rounded-2xl px-lg py-lg mb-xl gap-sm">
            <View className="flex-row justify-between items-baseline mb-sm">
              <View>
                <Text className="text-neutral-100/80 text-xs tracking-[2px] uppercase">
                  Sourate {result.surah} · Verset {result.ayah}
                </Text>
                <Text className="text-neutral-100/80 text-sm">Source : {result.source}</Text>
              </View>
            </View>
            <Text className="text-neutral-100 text-base leading-6" style={{ lineHeight: 24 }}>
              {result.text}
            </Text>
          </View>
        )}

        {toast && (
          <View className="absolute bottom-6 left-0 right-0 items-center">
            <View className="bg-black/80 px-md py-xs rounded-lg">
              <Text className="text-neutral-100 text-sm">{toast}</Text>
            </View>
            <TouchableOpacity onPress={() => setToast(null)} className="mt-[4px]">
              <Text className="text-neutral-100/80 text-xs">Fermer</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
