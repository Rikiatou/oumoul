import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AuthUser, Locale, TafsirResponse } from '@oumoul/api';
import { quranApi, tafsirApi } from '../api';
import { loadTafsirSelection, saveTafsirSelection } from '../storage/tafsir-selection-store';
import { BackButton } from '../components/BackButton';
import { useTheme } from '../context/theme-context';

interface TafsirFormState {
  surah: string;
  ayah: string;
  locale: Locale;
  source?: string;
}

type TafsirInitialSelection = {
  surahId?: number;
  ayah?: number;
  locale?: Locale;
  source?: string;
  autoLoad?: boolean;
} | null;

const DEFAULT_FORM: TafsirFormState = {
  surah: '2',
  ayah: '255',
  locale: 'fr',
  source: undefined,
};

const LANG_OPTIONS: Array<{ value: Locale; label: string; icon: string }> = [
  { value: 'fr', label: 'Français', icon: 'language-outline' },
  { value: 'en', label: 'English', icon: 'language-outline' },
  { value: 'ar', label: 'العربية', icon: 'language-outline' },
];

export function TafsirScreen({
  user,
  onBackToDashboard,
  initialSelection,
}: {
  user: AuthUser;
  onBackToDashboard: () => void;
  initialSelection?: TafsirInitialSelection;
}) {
  const { palette } = useTheme();
  const tf_c = useMemo(() => ({
    bg: palette.bgAlt,
    card: palette.card,
    border: palette.border,
    text: palette.text,
    textSoft: palette.textSoft,
    muted: palette.muted,
    accent: palette.primaryDark,
    accentLight: palette.accentLight,
  }), [palette]);
  const tf = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: tf_c.bg },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tf_c.border },
    topTitle: { fontSize: 20, fontWeight: '700', color: tf_c.text },
    selectionBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tf_c.accentLight, marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    selectionText: { fontSize: 13, fontWeight: '600', color: tf_c.text },
    card: { backgroundColor: tf_c.card, marginHorizontal: 16, marginTop: 14, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tf_c.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: tf_c.text },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: tf_c.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    surahChip: { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: tf_c.border, alignItems: 'center', minWidth: 70 },
    surahChipActive: { backgroundColor: tf_c.accent, borderColor: tf_c.accent },
    surahChipNum: { fontSize: 16, fontWeight: '800', color: tf_c.text },
    surahChipName: { fontSize: 10, fontWeight: '600', color: tf_c.textSoft, marginTop: 2 },
    surahChipArabic: { fontSize: 10, color: tf_c.muted },
    ayahChip: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: tf_c.border },
    ayahChipActive: { backgroundColor: tf_c.accent, borderColor: tf_c.accent },
    ayahChipText: { fontSize: 13, fontWeight: '700', color: tf_c.text },
    langChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: tf_c.border },
    langChipActive: { backgroundColor: tf_c.accent, borderColor: tf_c.accent },
    langChipText: { fontSize: 13, fontWeight: '600', color: tf_c.text },
    sourceChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: tf_c.border },
    sourceChipActive: { backgroundColor: tf_c.accent, borderColor: tf_c.accent },
    sourceChipText: { fontSize: 12, fontWeight: '600', color: tf_c.text },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: tf_c.accent, borderRadius: 14, paddingVertical: 16, gap: 8 },
    submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    errorText: { color: '#C62828', fontSize: 13, marginTop: 8 },
    skeletonCard: { backgroundColor: tf_c.card, marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: tf_c.border },
    resultCard: { backgroundColor: tf_c.card, marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: tf_c.border },
    resultHeader: { fontSize: 15, fontWeight: '700', color: tf_c.text },
    resultSourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 14 },
    resultSourceText: { fontSize: 11, color: tf_c.muted, fontWeight: '600' },
    resultArabic: { fontSize: 22, lineHeight: 40, color: '#1B3A2D', textAlign: 'right' as const, fontFamily: 'Amiri-Regular', marginBottom: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: tf_c.border },
    resultText: { color: tf_c.text, fontSize: 16, lineHeight: 26 },
    toast: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: '#1A2332', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 16 },
    toastText: { color: '#fff', fontSize: 13 },
  }), [tf_c]);
  const [form, setForm] = useState<TafsirFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TafsirResponse | null>(null);
  const [arabicVerse, setArabicVerse] = useState<string | null>(null);
  const [sources, setSources] = useState<Array<{ key: string; name: string; author: string | null }>>([]);
  const [surahs, setSurahs] = useState<Array<{ id: number; name: string; nameArabic: string; versesCount: number }>>([]);
  const [ayahOptions, setAyahOptions] = useState<number[]>([]);
  const [surahLoading, setSurahLoading] = useState(false);
  const [ayahLoading, setAyahLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const didApplyInitialSelectionRef = useRef(false);

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
    return () => { isMounted = false; };
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
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveTafsirSelection({ surah: form.surah, ayah: form.ayah, locale: form.locale, source: form.source });
  }, [form, hydrated]);

  useEffect(() => {
    let isMounted = true;
    const loadSurahs = async () => {
      setSurahLoading(true);
      try {
        const requestedLang = form.locale === 'ar' ? 'fr' : form.locale;
        let data = await quranApi.listSurahs(requestedLang);

        // Defensive fallback: if API returns empty list, retry with French
        if (!data?.surahs?.length && requestedLang !== 'fr') {
          data = await quranApi.listSurahs('fr');
        }
        if (!isMounted) return;
        const mapped = data.surahs.map((s) => ({ id: s.id, name: s.nameSimple ?? `Surah ${s.id}`, nameArabic: s.nameArabic, versesCount: s.versesCount }));
        setSurahs(mapped);
        const currentNum = Number.parseInt(form.surah, 10);
        const selected = mapped.find((s) => s.id === currentNum) ?? mapped[0];
        if (selected) setForm((prev) => ({ ...prev, surah: String(selected.id) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Impossible de charger les sourates.';
        setToast(message);
      } finally {
        if (isMounted) setSurahLoading(false);
      }
    };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void loadSurahs(); }, 200);
    return () => { isMounted = false; if (debounceRef.current) clearTimeout(debounceRef.current); };
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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void loadAyahs(); }, 200);
    return () => { isMounted = false; if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.surah, form.locale]);

  const surahLabel = useMemo(() => {
    const surahNum = Number.parseInt(form.surah, 10);
    const found = surahs.find((s) => s.id === surahNum);
    return found ? `${found.id}. ${found.name} (${found.nameArabic})` : `Sourate ${form.surah}`;
  }, [form.surah, surahs]);

  const handleFieldChange = useCallback(<K extends keyof TafsirFormState>(key: K, value: TafsirFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const fetchTafsir = useCallback(async (next: { surah: number; ayah: number; locale: Locale; source?: string }) => {
    setLoading(true);
    setError(null);
    try {
      if (!Number.isFinite(next.surah) || !Number.isFinite(next.ayah) || next.surah <= 0 || next.ayah <= 0) {
        throw new Error('Veuillez fournir un numéro de sourate et de verset valides.');
      }
      const response = await tafsirApi.getTafsir({ surah: next.surah, ayah: next.ayah, locale: next.locale, source: next.source });
      setResult(response);

      // Load Arabic verse separately with better error handling
      try {
        const surahData = await quranApi.getSurah(next.surah, 'ar');
        const verse = surahData?.verses?.find((v: { verseNumber: number }) => v.verseNumber === next.ayah);
        setArabicVerse(verse?.textArabic ?? null);
      } catch {
        setArabicVerse(null);
      }
      setToast('Tafsir chargé.');
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de récupérer le tafsir.";
      setError(message);
      setResult(null);
      setToast(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const surah = Number.parseInt(form.surah, 10);
    const ayah = Number.parseInt(form.ayah, 10);
    await fetchTafsir({ surah, ayah, locale: form.locale, source: form.source });
  }, [fetchTafsir, form.ayah, form.locale, form.source, form.surah]);

  useEffect(() => {
    // Initial selection may come from navigation params (ImaneQuran -> Tafsir)
    // Apply once and optionally autoload.
    if (didApplyInitialSelectionRef.current) return;
    if (!initialSelection) return;

    const surahId = initialSelection.surahId;
    const ayah = initialSelection.ayah;
    const locale = initialSelection.locale;

    if (!surahId || !ayah) return;

    didApplyInitialSelectionRef.current = true;
    setForm((prev) => ({
      ...prev,
      surah: String(surahId),
      ayah: String(ayah),
      locale: locale ?? prev.locale,
      source: initialSelection.source ?? prev.source,
    }));

    if (initialSelection.autoLoad) {
      void fetchTafsir({ surah: surahId, ayah, locale: locale ?? form.locale, source: initialSelection.source ?? form.source });
    }
  }, [fetchTafsir, form.locale, form.source, initialSelection]);

  const insets = useSafeAreaInsets();

  return (
    <View style={[tf.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={tf.topBar}>
        <BackButton onPress={onBackToDashboard} />
        <Text style={tf.topTitle}>Tafsir</Text>
        <TouchableOpacity onPress={() => { setForm(DEFAULT_FORM); setResult(null); setError(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={tf_c.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Current selection badge */}
        <View style={tf.selectionBadge}>
          <Ionicons name="book-outline" size={16} color={tf_c.accent} />
          <Text style={tf.selectionText}>{surahLabel} · Verset {form.ayah}</Text>
        </View>

        {/* Surah selector */}
        <View style={tf.card}>
          <View style={tf.cardHeader}>
            <Ionicons name="list-outline" size={18} color={tf_c.accent} />
            <Text style={tf.sectionTitle}>Sourate</Text>
          </View>
          {surahLoading ? (
            <ActivityIndicator color={tf_c.accent} style={{ paddingVertical: 12 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {surahs.map((surah) => {
                const isActive = form.surah === String(surah.id);
                return (
                  <TouchableOpacity key={surah.id} style={[tf.surahChip, isActive && tf.surahChipActive]} onPress={() => handleFieldChange('surah', String(surah.id))}>
                    <Text style={[tf.surahChipNum, isActive && { color: '#fff' }]}>{surah.id}</Text>
                    <Text style={[tf.surahChipName, isActive && { color: '#fff' }]}>{surah.name}</Text>
                    <Text style={[tf.surahChipArabic, isActive && { color: 'rgba(255,255,255,0.7)' }]}>{surah.nameArabic}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Ayah selector */}
        <View style={tf.card}>
          <View style={tf.cardHeader}>
            <Ionicons name="document-text-outline" size={18} color={tf_c.accent} />
            <Text style={tf.sectionTitle}>Verset</Text>
          </View>
          {ayahLoading ? (
            <ActivityIndicator color={tf_c.accent} style={{ paddingVertical: 12 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
              {ayahOptions.map((num) => {
                const isActive = form.ayah === String(num);
                return (
                  <TouchableOpacity key={num} style={[tf.ayahChip, isActive && tf.ayahChipActive]} onPress={() => handleFieldChange('ayah', String(num))}>
                    <Text style={[tf.ayahChipText, isActive && { color: '#fff' }]}>{num}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Language + Source */}
        <View style={tf.card}>
          <View style={tf.cardHeader}>
            <Ionicons name="settings-outline" size={18} color={tf_c.accent} />
            <Text style={tf.sectionTitle}>Options</Text>
          </View>

          <Text style={tf.fieldLabel}>Langue</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {LANG_OPTIONS.map((opt) => {
              const isActive = form.locale === opt.value;
              return (
                <TouchableOpacity key={opt.value} style={[tf.langChip, isActive && tf.langChipActive]} onPress={() => handleFieldChange('locale', opt.value)}>
                  <Text style={[tf.langChipText, isActive && { color: '#fff', fontWeight: '700' }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={tf.fieldLabel}>Source</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <TouchableOpacity style={[tf.sourceChip, !form.source && tf.sourceChipActive]} onPress={() => handleFieldChange('source', undefined)}>
              <Ionicons name="sparkles-outline" size={14} color={!form.source ? '#fff' : tf_c.muted} />
              <Text style={[tf.sourceChipText, !form.source && { color: '#fff' }]}>Auto</Text>
            </TouchableOpacity>
            {sources.map((source) => {
              const isActive = form.source === source.key;
              return (
                <TouchableOpacity key={source.key} style={[tf.sourceChip, isActive && tf.sourceChipActive]} onPress={() => handleFieldChange('source', source.key)}>
                  <Text style={[tf.sourceChipText, isActive && { color: '#fff' }]}>{source.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Submit button */}
        <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
          <TouchableOpacity style={[tf.submitBtn, loading && { opacity: 0.5 }]} disabled={loading} onPress={() => void handleSubmit()}>
            <Ionicons name="search" size={18} color="#fff" />
            <Text style={tf.submitBtnText}>{loading ? 'Chargement…' : 'Afficher le tafsir'}</Text>
          </TouchableOpacity>
          {error && <Text style={tf.errorText}>{error}</Text>}
        </View>

        {/* Loading skeleton */}
        {loading && (
          <View style={tf.skeletonCard}>
            <View style={{ height: 14, width: 140, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.06)' }} />
            <View style={{ height: 12, width: 200, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.04)', marginTop: 8 }} />
            <View style={{ height: 12, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.04)', marginTop: 6 }} />
            <View style={{ height: 12, width: '80%', borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.04)', marginTop: 6 }} />
          </View>
        )}

        {/* Result */}
        {!loading && result && (
          <View style={tf.resultCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="book" size={18} color={tf_c.accent} />
              <Text style={tf.resultHeader}>Sourate {result.surah} · Verset {result.ayah}</Text>
            </View>
            {arabicVerse ? (
              <Text style={tf.resultArabic}>{arabicVerse}</Text>
            ) : null}
            <View style={tf.resultSourceBadge}>
              <Ionicons name="library-outline" size={12} color={tf_c.muted} />
              <Text style={tf.resultSourceText}>{result.source}</Text>
            </View>
            <Text style={tf.resultText}>{result.text}</Text>
          </View>
        )}

        {/* Toast */}
        {toast && (
          <TouchableOpacity onPress={() => setToast(null)} style={tf.toast}>
            <Text style={tf.toastText}>{toast}</Text>
            <Ionicons name="close" size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

