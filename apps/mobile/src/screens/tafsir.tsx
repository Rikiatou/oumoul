import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@oumoul/ui';
import type { AuthUser, Locale, TafsirResponse } from '@oumoul/api';
import { quranApi, tafsirApi } from '../api';
import { loadTafsirSelection, saveTafsirSelection } from '../storage/tafsir-selection-store';
import { sc, ss } from '../ui/theme';

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

  const insets = useSafeAreaInsets();

  return (
    <View style={[ss.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={ss.mb20}>
          <TouchableOpacity onPress={onBackToDashboard} style={[ss.row, ss.gap4, ss.mb12]}>
            <Ionicons name="chevron-back" size={20} color={sc.accent} />
            <Text style={{ color: sc.accent, fontWeight: '600', fontSize: 14 }}>Retour</Text>
          </TouchableOpacity>
          <Text style={ss.title}>Tafsir du Coran</Text>
          <Text style={ss.subtitle}>Choisis une sourate et un verset pour consulter un tafsir.</Text>
          <TouchableOpacity style={[ss.outlineBtn, { alignSelf: 'flex-start', marginTop: 10 }]} onPress={() => { setForm(DEFAULT_FORM); setResult(null); setError(null); setToast('Réinitialisé.'); }}>
            <Text style={ss.outlineBtnText}>Réinitialiser</Text>
          </TouchableOpacity>
        </View>

        {/* Settings card */}
        <View style={ss.card}>
          <Text style={ss.sectionTitle}>Paramètres</Text>

          {/* Surah */}
          <Text style={[ss.label, ss.mb8]}>Sourate</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ss.mb12}>
            <View style={[ss.row, ss.gap6]}>
              {surahLoading && <ActivityIndicator color={sc.accent} />}
              {!surahLoading && surahs.map((surah) => {
                const isActive = form.surah === String(surah.id);
                return (
                  <TouchableOpacity key={surah.id} style={[ss.chip, isActive && ss.chipActive]} onPress={() => handleFieldChange('surah', String(surah.id))}>
                    <View>
                      <Text style={[ss.chipText, isActive && ss.chipTextActive]}>{surah.id}. {surah.name}</Text>
                      <Text style={{ color: isActive ? 'rgba(255,255,255,0.7)' : sc.muted, fontSize: 10 }}>{surah.nameArabic} · {surah.versesCount}v</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Ayah */}
          <Text style={[ss.label, ss.mb8]}>Verset</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ss.mb12}>
            <View style={[ss.row, ss.gap6]}>
              {ayahLoading && <ActivityIndicator color={sc.accent} />}
              {!ayahLoading && ayahOptions.map((num) => {
                const isActive = form.ayah === String(num);
                return (
                  <TouchableOpacity key={num} style={[ss.chip, isActive && ss.chipActive, { paddingHorizontal: 10, paddingVertical: 5 }]} onPress={() => handleFieldChange('ayah', String(num))}>
                    <Text style={[ss.chipText, isActive && ss.chipTextActive]}>{num}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Language */}
          <Text style={[ss.label, ss.mb8]}>Langue</Text>
          <View style={[ss.row, ss.gap6, ss.mb12]}>
            {(['fr', 'en', 'ar'] as Locale[]).map((locale) => {
              const isActive = form.locale === locale;
              return (
                <TouchableOpacity key={locale} style={[ss.chip, isActive && ss.chipActive]} onPress={() => handleFieldChange('locale', locale)}>
                  <Text style={[ss.chipText, isActive && ss.chipTextActive]}>{locale === 'fr' ? 'Français' : locale === 'en' ? 'English' : 'العربية'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Source */}
          <Text style={[ss.label, ss.mb8]}>Source</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            <TouchableOpacity style={[ss.chip, !form.source && ss.chipActive]} onPress={() => handleFieldChange('source', undefined)}>
              <Text style={[ss.chipText, !form.source && ss.chipTextActive]}>Auto</Text>
            </TouchableOpacity>
            {sources.map((source) => {
              const isActive = form.source === source.key;
              return (
                <TouchableOpacity key={source.key} style={[ss.chip, isActive && ss.chipActive]} onPress={() => handleFieldChange('source', source.key)}>
                  <Text style={[ss.chipText, isActive && ss.chipTextActive]}>{source.name}{source.author ? ` — ${source.author}` : ''}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={[ss.primaryBtn, loading && { opacity: 0.5 }]} disabled={loading} onPress={() => void handleSubmit()}>
            <Text style={ss.primaryBtnText}>{loading ? 'Chargement…' : 'Afficher le tafsir'}</Text>
          </TouchableOpacity>
          {error && <Text style={ss.errorText}>{error}</Text>}
        </View>

        {/* Loading skeleton */}
        {loading && (
          <View style={ss.card}>
            <View style={{ height: 14, width: 120, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.06)' }} />
            <View style={{ height: 12, width: 180, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.04)', marginTop: 6 }} />
            <View style={{ height: 12, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.04)', marginTop: 6 }} />
            <View style={{ height: 12, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.04)', marginTop: 4 }} />
          </View>
        )}

        {/* Result */}
        {!loading && result && (
          <View style={[ss.card, { backgroundColor: 'rgba(0,0,0,0.03)' }]}>
            <Text style={ss.label}>Sourate {result.surah} · Verset {result.ayah}</Text>
            <Text style={[ss.muted, { marginBottom: 6 }]}>Source : {result.source}</Text>
            <Text style={{ color: sc.text, fontSize: 15, lineHeight: 24 }}>{result.text}</Text>
          </View>
        )}

        {/* Toast */}
        {toast && (
          <TouchableOpacity onPress={() => setToast(null)} style={{ alignSelf: 'center', backgroundColor: sc.text, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 16 }}>
            <Text style={{ color: '#fff', fontSize: 13 }}>{toast}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
