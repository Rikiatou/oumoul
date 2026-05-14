import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser, QuranVerse } from '@oumoul/api';
import { useTheme } from '../context/theme-context';
import { quranApi } from '../api';


type HifzEntry = {
  surahId: number;
  surahName: string;
  ayahFrom: number;
  ayahTo: number;
  addedAt: number;
  nextReview: number; // timestamp
  interval: number;   // days
  ease: number;       // 1.0–3.0
  repetitions: number;
  lastScore: 0 | 1 | 2 | null; // 0=Again 1=Hard 2=Easy
};

const SURAHS_SHORT = [
  { id: 112, name: 'Al-Ikhlas', ayahs: 4 },
  { id: 113, name: 'Al-Falaq', ayahs: 5 },
  { id: 114, name: 'An-Nas', ayahs: 6 },
  { id: 110, name: 'An-Nasr', ayahs: 3 },
  { id: 108, name: 'Al-Kawthar', ayahs: 3 },
  { id: 103, name: 'Al-Asr', ayahs: 3 },
  { id: 1, name: 'Al-Fatiha', ayahs: 7 },
  { id: 2, name: 'Al-Baqarah', ayahs: 286 },
  { id: 36, name: 'Ya-Sin', ayahs: 83 },
  { id: 55, name: 'Ar-Rahman', ayahs: 78 },
  { id: 67, name: 'Al-Mulk', ayahs: 30 },
  { id: 18, name: 'Al-Kahf', ayahs: 110 },
  { id: 56, name: 'Al-Waqi\'a', ayahs: 96 },
];

type VerseCache = Record<number, QuranVerse[]>;

function nextReviewDate(interval: number): number {
  return Date.now() + interval * 24 * 60 * 60 * 1000;
}

function getDueEntries(entries: HifzEntry[]): HifzEntry[] {
  const now = Date.now();
  return entries.filter((e) => e.nextReview <= now).sort((a, b) => a.nextReview - b.nextReview);
}

function updateEntry(entry: HifzEntry, score: 0 | 1 | 2): HifzEntry {
  const newReps = score === 0 ? 0 : entry.repetitions + 1;
  const baseInterval = score === 0 ? 1 : score === 1 ? Math.max(1, Math.floor(entry.interval * 1.2)) : Math.round(entry.interval * entry.ease);
  const newEase = Math.min(3.0, Math.max(1.3, entry.ease + (0.1 - (2 - score) * 0.08)));
  return {
    ...entry,
    repetitions: newReps,
    interval: baseInterval,
    ease: newEase,
    lastScore: score,
    nextReview: nextReviewDate(baseInterval),
  };
}

type ReviewStep = 'show' | 'hide' | 'grade';

export function HifzScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { palette: p } = useTheme();
  const storeKey = `oumoul.hifz.${user.email}`;

  const [entries, setEntries] = useState<HifzEntry[]>([]);
  const [tab, setTab] = useState<'review' | 'my' | 'add'>('review');
  const [reviewStep, setReviewStep] = useState<ReviewStep>('show');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [addSurahId, setAddSurahId] = useState<number | null>(null);
  const [addFrom, setAddFrom] = useState('1');
  const [addTo, setAddTo] = useState('1');
  const [sessionDone, setSessionDone] = useState(0);
  const [verseCache, setVerseCache] = useState<VerseCache>({});
  const [versesLoading, setVersesLoading] = useState(false);
  const fetchingRef = useRef<Set<number>>(new Set());

  // Load from storage
  useEffect(() => {
    void SecureStore.getItemAsync(storeKey).then((raw) => {
      if (raw) setEntries(JSON.parse(raw) as HifzEntry[]);
    });
  }, [storeKey]);

  const save = useCallback(async (updated: HifzEntry[]) => {
    setEntries(updated);
    await SecureStore.setItemAsync(storeKey, JSON.stringify(updated));
  }, [storeKey]);

  // Fetch verses for a surah from the real API and cache them
  const fetchVerses = useCallback(async (surahId: number) => {
    if (verseCache[surahId] || fetchingRef.current.has(surahId)) return;
    fetchingRef.current.add(surahId);
    setVersesLoading(true);
    try {
      const res = await quranApi.getSurah(surahId, 'fr');
      setVerseCache((prev) => ({ ...prev, [surahId]: res.verses }));
    } catch {
      // silently fail — will show surah name only
    } finally {
      fetchingRef.current.delete(surahId);
      setVersesLoading(false);
    }
  }, [verseCache]);

  const dueEntries = getDueEntries(entries);
  const currentEntry = dueEntries[reviewIndex] ?? null;

  // Prefetch verses for current and next due entry
  useEffect(() => {
    if (currentEntry) void fetchVerses(currentEntry.surahId);
    const next = dueEntries[reviewIndex + 1];
    if (next) void fetchVerses(next.surahId);
  }, [currentEntry, reviewIndex, dueEntries, fetchVerses]);

  // Also prefetch when Add tab selects a surah
  useEffect(() => {
    if (addSurahId) void fetchVerses(addSurahId);
  }, [addSurahId, fetchVerses]);

  const surahVerses = currentEntry ? (verseCache[currentEntry.surahId] ?? null) : null;
  const surahText = surahVerses
    ? surahVerses
        .slice((currentEntry?.ayahFrom ?? 1) - 1, currentEntry?.ayahTo)
        .map((v) => ({ arabic: v.textArabic, french: v.textTranslated ?? '' }))
    : null;

  const handleGrade = useCallback(async (score: 0 | 1 | 2) => {
    if (!currentEntry) return;
    const updated = entries.map((e) =>
      e.surahId === currentEntry.surahId && e.ayahFrom === currentEntry.ayahFrom
        ? updateEntry(e, score)
        : e
    );
    await save(updated);
    setSessionDone((n) => n + 1);
    if (reviewIndex + 1 >= dueEntries.length) {
      setReviewIndex(0);
    } else {
      setReviewIndex((i) => i + 1);
    }
    setReviewStep('show');
  }, [currentEntry, entries, save, reviewIndex, dueEntries.length]);

  const handleAddEntry = useCallback(async () => {
    if (!addSurahId) return;
    const surah = SURAHS_SHORT.find((s) => s.id === addSurahId);
    if (!surah) return;
    const from = parseInt(addFrom, 10) || 1;
    const to = parseInt(addTo, 10) || from;
    const newEntry: HifzEntry = {
      surahId: addSurahId,
      surahName: surah.name,
      ayahFrom: from,
      ayahTo: Math.min(to, surah.ayahs),
      addedAt: Date.now(),
      nextReview: Date.now(),
      interval: 1,
      ease: 2.5,
      repetitions: 0,
      lastScore: null,
    };
    const exists = entries.some((e) => e.surahId === addSurahId && e.ayahFrom === from);
    if (!exists) await save([...entries, newEntry]);
    setTab('my');
  }, [addSurahId, addFrom, addTo, entries, save]);

  const handleDelete = useCallback(async (entry: HifzEntry) => {
    await save(entries.filter((e) => !(e.surahId === entry.surahId && e.ayahFrom === entry.ayahFrom)));
  }, [entries, save]);

  const formatNextReview = (ts: number) => {
    const diff = ts - Date.now();
    if (diff <= 0) return 'À réviser maintenant';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    if (d > 0) return `Dans ${d}j ${h}h`;
    return `Dans ${h}h`;
  };

  return (
    <View style={[h.screen, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      {/* Header */}
      <View style={h.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={p.primaryDark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[h.headerTitle, { color: p.text }]}>📖 Hifz — Mémorisation</Text>
          <Text style={[h.headerSub, { color: p.textSoft }]}>{dueEntries.length} verset(s) à réviser</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={h.tabBar}>
        {(['review', 'my', 'add'] as const).map((t) => {
          const labels = { review: `Réviser (${dueEntries.length})`, my: `Mes versets (${entries.length})`, add: '+ Ajouter' };
          return (
            <TouchableOpacity
              key={t}
              style={[h.tab, tab === t && { backgroundColor: p.primaryDark }]}
              onPress={() => setTab(t)}
            >
              <Text style={[h.tabText, tab === t && { color: '#fff' }]}>{labels[t]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── REVIEW TAB ── */}
      {tab === 'review' && (
        <View style={{ flex: 1, padding: 20 }}>
          {dueEntries.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 48 }}>✅</Text>
              <Text style={[h.emptyTitle, { color: p.text }]}>Session terminée !</Text>
              <Text style={[h.emptySub, { color: p.textSoft }]}>Tu as révisé {sessionDone} verset(s) aujourd'hui.</Text>
              <Text style={[h.emptySub, { color: p.textSoft, marginTop: 8 }]}>Reviens demain pour la prochaine session.</Text>
            </View>
          ) : !currentEntry ? null : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Progress */}
              <View style={h.progressRow}>
                <Text style={[h.progressText, { color: p.textSoft }]}>{reviewIndex + 1} / {dueEntries.length}</Text>
                <Text style={[h.progressText, { color: p.primaryDark }]}>{currentEntry.surahName} · {currentEntry.ayahFrom}–{currentEntry.ayahTo}</Text>
              </View>

              {/* Card */}
              <View style={[h.reviewCard, { backgroundColor: p.card, borderColor: p.border }]}>
                {/* Arabic text - always show */}
                {versesLoading && !surahText ? (
                  <ActivityIndicator size="large" color={p.primaryDark} style={{ marginVertical: 30 }} />
                ) : surahText ? (
                  surahText.map((verse, i) => (
                    <View key={i} style={{ marginBottom: 16 }}>
                      <Text style={[h.arabicVerse, { color: p.primaryDark }]}>{verse.arabic}</Text>
                      {reviewStep !== 'hide' && (
                        <Text style={[h.frenchVerse, { color: p.textSoft }]}>{verse.french}</Text>
                      )}
                    </View>
                  ))
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <Text style={[h.arabicVerse, { color: p.primaryDark }]}>
                      {currentEntry.surahName} · {currentEntry.ayahFrom}–{currentEntry.ayahTo}
                    </Text>
                    <Text style={[h.frenchVerse, { color: p.textSoft, marginTop: 8 }]}>Chargement des versets...</Text>
                  </View>
                )}

                {reviewStep === 'hide' && (
                  <View style={[h.hiddenOverlay, { backgroundColor: p.bg + 'CC' }]}>
                    <Ionicons name="eye-off" size={28} color={p.textSoft} />
                    <Text style={[h.hiddenText, { color: p.textSoft }]}>Récite de mémoire...</Text>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              {reviewStep === 'show' && (
                <View style={h.actionRow}>
                  <TouchableOpacity style={[h.actionBtn, { backgroundColor: p.primaryDark }]} onPress={() => setReviewStep('hide')}>
                    <Ionicons name="eye-off" size={18} color="#fff" />
                    <Text style={h.actionBtnText}>Cacher & réciter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[h.actionBtnSecondary, { borderColor: p.border }]} onPress={() => setReviewStep('grade')}>
                    <Text style={[h.actionBtnSecondaryText, { color: p.text }]}>Évaluer directement</Text>
                  </TouchableOpacity>
                </View>
              )}

              {reviewStep === 'hide' && (
                <TouchableOpacity style={[h.actionBtn, { backgroundColor: p.primaryDark, marginTop: 16 }]} onPress={() => setReviewStep('grade')}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={h.actionBtnText}>Évaluer ma récitation</Text>
                </TouchableOpacity>
              )}

              {reviewStep === 'grade' && (
                <View style={{ marginTop: 20 }}>
                  <Text style={[h.gradeTitle, { color: p.text }]}>Comment s'est passée ta récitation ?</Text>
                  <View style={h.gradeRow}>
                    <TouchableOpacity style={[h.gradeBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]} onPress={() => void handleGrade(0)}>
                      <Text style={h.gradeEmoji}>😓</Text>
                      <Text style={[h.gradeLabel, { color: '#DC2626' }]}>À revoir</Text>
                      <Text style={[h.gradeSub, { color: '#DC2626' }]}>+1j</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[h.gradeBtn, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]} onPress={() => void handleGrade(1)}>
                      <Text style={h.gradeEmoji}>😐</Text>
                      <Text style={[h.gradeLabel, { color: '#D97706' }]}>Difficile</Text>
                      <Text style={[h.gradeSub, { color: '#D97706' }]}>+3j</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[h.gradeBtn, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' }]} onPress={() => void handleGrade(2)}>
                      <Text style={h.gradeEmoji}>😊</Text>
                      <Text style={[h.gradeLabel, { color: '#059669' }]}>Facile</Text>
                      <Text style={[h.gradeSub, { color: '#059669' }]}>+{Math.round((currentEntry?.interval ?? 1) * (currentEntry?.ease ?? 2.5))}j</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* ── MY VERSES TAB ── */}
      {tab === 'my' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {entries.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 48 }}>📖</Text>
              <Text style={[h.emptyTitle, { color: p.text }]}>Aucun verset ajouté</Text>
              <Text style={[h.emptySub, { color: p.textSoft }]}>Appuie sur "+ Ajouter" pour commencer ton Hifz</Text>
            </View>
          ) : entries.map((entry) => (
            <View key={`${entry.surahId}-${entry.ayahFrom}`} style={[h.entryCard, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[h.entryName, { color: p.text }]}>{entry.surahName}</Text>
                <Text style={[h.entrySub, { color: p.textSoft }]}>
                  Versets {entry.ayahFrom}–{entry.ayahTo} · {entry.repetitions} rép.
                </Text>
                <Text style={[h.entryNext, { color: entry.nextReview <= Date.now() ? '#DC2626' : p.primaryDark }]}>
                  {formatNextReview(entry.nextReview)}
                </Text>
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={[h.easeText, { color: p.textSoft }]}>Ease {entry.ease.toFixed(1)}</Text>
                <TouchableOpacity onPress={() => void handleDelete(entry)}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── ADD TAB ── */}
      {tab === 'add' && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <Text style={[h.addTitle, { color: p.text }]}>Ajouter des versets à mémoriser</Text>
          <Text style={[h.addSub, { color: p.textSoft }]}>Choisis une sourate et les versets à apprendre</Text>

          {/* Surah picker */}
          <Text style={[h.fieldLabel, { color: p.text, marginTop: 20 }]}>Sourate</Text>
          <View style={h.surahPicker}>
            {SURAHS_SHORT.map((surah) => (
              <TouchableOpacity
                key={surah.id}
                style={[h.surahChip, { borderColor: addSurahId === surah.id ? p.primaryDark : p.border, backgroundColor: addSurahId === surah.id ? p.primaryDark + '18' : p.card }]}
                onPress={() => { setAddSurahId(surah.id); setAddTo(String(surah.ayahs)); }}
              >
                <Text style={[h.surahChipText, { color: addSurahId === surah.id ? p.primaryDark : p.text }]}>{surah.name}</Text>
                <Text style={[h.surahChipSub, { color: p.textSoft }]}>{surah.ayahs} v.</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Preview versets du début de la sourate sélectionnée */}
          {addSurahId && verseCache[addSurahId] && (
            <View style={[h.previewBox, { backgroundColor: p.card, borderColor: p.border }]}>
              <Text style={[h.fieldLabel, { color: p.textSoft }]}>Aperçu (3 premiers versets)</Text>
              {verseCache[addSurahId]!.slice(0, 3).map((v) => (
                <View key={v.verseNumber} style={{ marginBottom: 10 }}>
                  <Text style={[h.arabicVerse, { color: p.primaryDark, fontSize: 20 }]}>{v.textArabic}</Text>
                  {v.textTranslated ? <Text style={[h.frenchVerse, { color: p.textSoft }]}>{v.textTranslated}</Text> : null}
                </View>
              ))}
            </View>
          )}

          {addSurahId && (
            <>
              <View style={h.rangeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[h.fieldLabel, { color: p.text }]}>Verset début</Text>
                  <TextInput
                    style={[h.input, { backgroundColor: p.card, color: p.text, borderColor: p.border }]}
                    value={addFrom}
                    onChangeText={setAddFrom}
                    keyboardType="numeric"
                    placeholderTextColor={p.textSoft}
                  />
                </View>
                <Text style={[{ fontSize: 20, color: p.textSoft, alignSelf: 'flex-end', marginBottom: 8, marginHorizontal: 8 }]}>→</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[h.fieldLabel, { color: p.text }]}>Verset fin</Text>
                  <TextInput
                    style={[h.input, { backgroundColor: p.card, color: p.text, borderColor: p.border }]}
                    value={addTo}
                    onChangeText={setAddTo}
                    keyboardType="numeric"
                    placeholderTextColor={p.textSoft}
                  />
                </View>
              </View>

              <TouchableOpacity style={[h.addBtn, { backgroundColor: p.primaryDark }]} onPress={() => void handleAddEntry()}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={h.addBtnText}>Ajouter au Hifz</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const h = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.06)' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#555' },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressText: { fontSize: 13, fontWeight: '600' },

  reviewCard: {
    borderRadius: 20, borderWidth: 1, padding: 24, position: 'relative', overflow: 'hidden', minHeight: 180,
  },
  arabicVerse: { fontSize: 26, fontFamily: 'Amiri-Bold', textAlign: 'right', lineHeight: 48, marginBottom: 8 },
  frenchVerse: { fontSize: 14, lineHeight: 22 },
  hiddenOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  hiddenText: { fontSize: 14, fontWeight: '600' },

  actionRow: { marginTop: 20, gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 16 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  actionBtnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 16, borderWidth: 1 },
  actionBtnSecondaryText: { fontWeight: '600', fontSize: 14 },

  gradeTitle: { fontSize: 15, fontWeight: '600', marginBottom: 14, textAlign: 'center' },
  gradeRow: { flexDirection: 'row', gap: 10 },
  gradeBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1.5 },
  gradeEmoji: { fontSize: 28 },
  gradeLabel: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  gradeSub: { fontSize: 11, marginTop: 2 },

  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  emptySub: { fontSize: 13, marginTop: 8, textAlign: 'center' },

  entryCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  entryName: { fontSize: 15, fontWeight: '700' },
  entrySub: { fontSize: 12, marginTop: 3 },
  entryNext: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  easeText: { fontSize: 11 },

  addTitle: { fontSize: 18, fontWeight: '700' },
  addSub: { fontSize: 13, marginTop: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  surahPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  surahChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  surahChipText: { fontSize: 13, fontWeight: '600' },
  surahChipSub: { fontSize: 11, marginTop: 2 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, fontWeight: '600' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  previewBox: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
});
