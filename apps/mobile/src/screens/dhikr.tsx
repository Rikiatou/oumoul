import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@oumoul/ui';
import type { AuthUser, DhikrCategory, DhikrEntry, DhikrRecord } from '@oumoul/api';
import { dhikrApi } from '../api';
import * as SecureStore from 'expo-secure-store';
import { t, Locale } from '../i18n';

interface DhikrFormState {
  entryId: string;
  count: number;
  notes: string;
}

const MODE_ICONS: Record<string, string> = { read: 'book-outline', count: 'finger-print-outline', favorites: 'heart-outline' };
const MODE_LABELS: Record<string, Record<string, string>> = {
  read: { fr: 'Lire', en: 'Read' },
  count: { fr: 'Compter', en: 'Count' },
  favorites: { fr: 'Favoris', en: 'Favorites' },
};

export function DhikrScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const [categories, setCategories] = useState<DhikrCategory[]>([]);
  const [records, setRecords] = useState<DhikrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const locale = (user.locale as Locale | undefined) ?? 'fr';

  const [mode, setMode] = useState<'read' | 'count' | 'favorites'>('read');

  const [search, setSearch] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Record<string, true>>({});

  const [form, setForm] = useState<DhikrFormState>({ entryId: '', count: 33, notes: '' });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const favoritesKey = useMemo(() => `oumoul.dhikrFavorites.${user.email}`, [user.email]);
  const categoriesCacheKey = useMemo(() => `oumoul.dhikrCategoriesCache`, []);

  const entriesByCategory = useMemo(() => {
    return categories.reduce<Record<string, DhikrEntry[]>>((acc, category) => {
      acc[category.id] = category.entries;
      return acc;
    }, {});
  }, [categories]);

  const currentEntry = useMemo(() => {
    if (!form.entryId) return null;
    for (const category of categories) {
      const entry = category.entries.find((item) => item.id === form.entryId);
      if (entry) return entry;
    }
    return null;
  }, [categories, form.entryId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        const cached = await SecureStore.getItemAsync(categoriesCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as DhikrCategory[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategories(
              parsed
                .map((category) => ({
                  ...category,
                  entries: [...category.entries].sort((a, b) => a.order - b.order),
                }))
                .sort((a, b) => a.order - b.order),
            );
          }
        }
      } catch {
      }

      const [categoryResponse, recordResponse] = await Promise.all([
        dhikrApi.listCategories(),
        dhikrApi.listRecords(),
      ]);
      const sortedCategories = categoryResponse
        .map((category) => ({
          ...category,
          entries: [...category.entries].sort((a, b) => a.order - b.order),
        }))
        .sort((a, b) => a.order - b.order);
      setCategories(sortedCategories);
      setRecords(recordResponse);
      try {
        await SecureStore.setItemAsync(categoriesCacheKey, JSON.stringify(sortedCategories));
      } catch {
      }
      if (sortedCategories.length > 0) {
        const initialCategory = sortedCategories[0];
        setSelectedCategoryId((prev) => prev ?? initialCategory.id);
        if (!form.entryId && initialCategory.entries.length > 0) {
          setForm((prev) => ({ ...prev, entryId: initialCategory.entries[0].id }));
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t(locale, 'dhikr.load.error', 'Impossible de charger les données de dhikr.');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [form.entryId, locale]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const raw = await SecureStore.getItemAsync(favoritesKey);
        if (raw) {
          const ids = JSON.parse(raw) as string[];
          if (Array.isArray(ids)) {
            const record: Record<string, true> = {};
            for (const id of ids) record[id] = true;
            setFavoriteIds(record);
          }
        }
      } catch {
      }
    };
    void loadFavorites();
  }, [favoritesKey]);

  const persistFavorites = useCallback(
    async (next: Record<string, true>) => {
      try {
        await SecureStore.setItemAsync(favoritesKey, JSON.stringify(Object.keys(next)));
      } catch {
      }
    },
    [favoritesKey],
  );

  const toggleFavorite = useCallback(
    (entryId: string) => {
      setFavoriteIds((prev) => {
        const next = { ...prev };
        if (next[entryId]) {
          delete next[entryId];
        } else {
          next[entryId] = true;
        }
        void persistFavorites(next);
        return next;
      });
    },
    [persistFavorites],
  );

  const handleEntryChange = useCallback((entryId: string) => {
    setForm((prev) => ({ ...prev, entryId }));
  }, []);

  const handleCountChange = useCallback((value: string) => {
    const parsed = parseInt(value, 10);
    const next = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setForm((prev) => ({ ...prev, count: next }));
  }, []);

  const handleNotesChange = useCallback((notes: string) => {
    setForm((prev) => ({ ...prev, notes }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.entryId) return;
    setSaving(true);
    setError(null);
    try {
      await dhikrApi.upsertRecord({
        entryId: form.entryId,
        count: form.count,
        notes: form.notes.trim() ? form.notes.trim() : undefined,
      });
      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t(locale, 'dhikr.save.error', 'Impossible d\'enregistrer le dhikr.');
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [form.entryId, form.count, form.notes, loadData, locale]);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      setError(null);
      try {
        await dhikrApi.deleteRecord(id);
        await loadData();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t(locale, 'dhikr.delete.error', 'Impossible de supprimer l\'enregistrement.');
        setError(message);
      } finally {
        setDeletingId(null);
      }
    },
    [loadData, locale],
  );

  const totalCount = useMemo(() => records.reduce((sum, record) => sum + record.count, 0), [records]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const searchNormalized = useMemo(() => search.trim().toLowerCase(), [search]);

  const filteredCategories = useMemo(() => {
    const favoritesOnly = mode === 'favorites';
    if (!searchNormalized && !favoritesOnly) return categories;
    return categories
      .map((category) => {
        const entries = category.entries.filter((entry) => {
          const isFav = Boolean(favoriteIds[entry.id]);
          if (favoritesOnly && !isFav) return false;
          if (!searchNormalized) return true;
          const haystack = `${entry.title}\n${entry.arabicText ?? ''}\n${entry.translit ?? ''}\n${entry.translation ?? ''}\n${entry.source ?? ''}`.toLowerCase();
          return haystack.includes(searchNormalized);
        });
        return { ...category, entries };
      })
      .filter((category) => category.entries.length > 0);
  }, [categories, favoriteIds, searchNormalized, mode]);

  const favoritesOnly = mode === 'favorites';

  const hasAnyFavorites = useMemo(() => Object.keys(favoriteIds).length > 0, [favoriteIds]);

  const selectedCategoryFiltered = useMemo(() => {
    if (!selectedCategoryId) return null;
    return filteredCategories.find((category) => category.id === selectedCategoryId) ?? null;
  }, [filteredCategories, selectedCategoryId]);

  useEffect(() => {
    if (filteredCategories.length === 0) return;
    if (!selectedCategoryId || !filteredCategories.some((category) => category.id === selectedCategoryId)) {
      const nextCategory = filteredCategories[0];
      setSelectedCategoryId(nextCategory.id);
      const firstEntry = nextCategory.entries[0];
      if (firstEntry) {
        setForm((prev) => ({ ...prev, entryId: firstEntry.id }));
      }
    }
  }, [filteredCategories, selectedCategoryId]);

  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={[dk.screen, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={dk_c.accent} />
        <Text style={[dk.mutedText, { marginTop: 8 }]}>{t(locale, 'common.loading', 'Chargement…')}</Text>
      </View>
    );
  }

  return (
    <View style={[dk.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={dk.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={dk_c.accent} />
        </TouchableOpacity>
        <Text style={dk.topTitle}>{t(locale, 'dhikr.title', 'Duas & Dhikr')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="infinite-outline" size={18} color={dk_c.accent} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: dk_c.accent }}>{totalCount}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Mode tabs */}
        <View style={dk.tabRow}>
          {(['read', 'count', 'favorites'] as const).map((m) => {
            const active = mode === m;
            return (
              <TouchableOpacity key={m} style={[dk.tab, active && dk.tabActive]} onPress={() => setMode(m)}>
                <Ionicons name={MODE_ICONS[m] as any} size={16} color={active ? '#fff' : dk_c.muted} />
                <Text style={[dk.tabText, active && dk.tabTextActive]}>
                  {MODE_LABELS[m][locale] ?? MODE_LABELS[m].fr}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search bar */}
        <View style={dk.searchBar}>
          <Ionicons name="search-outline" size={18} color={dk_c.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t(locale, 'dhikr.search.placeholder', 'Cherche une dua…')}
            placeholderTextColor={dk_c.muted}
            style={dk.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={dk_c.muted} />
            </TouchableOpacity>
          )}
        </View>

        {error && <Text style={dk.errorText}>{error}</Text>}

        {/* Categories horizontal scroll */}
        {filteredCategories.length === 0 ? (
          <View style={dk.emptyCard}>
            <Ionicons name={favoritesOnly ? 'heart-outline' : 'search-outline'} size={32} color={dk_c.muted} />
            <Text style={dk.emptyTitle}>
              {favoritesOnly && !hasAnyFavorites ? t(locale, 'dhikr.favorites.empty.title', 'Aucun favori') : t(locale, 'dhikr.search.empty.title', 'Aucun résultat')}
            </Text>
            <Text style={dk.emptySubtitle}>
              {favoritesOnly && !hasAnyFavorites
                ? t(locale, 'dhikr.favorites.empty.subtitle', 'Appuie sur le coeur pour ajouter aux favoris.')
                : t(locale, 'dhikr.search.empty.subtitle', 'Modifie ta recherche ou réinitialise.')}
            </Text>
            <TouchableOpacity style={dk.primaryBtn} onPress={() => { setSearch(''); setMode('read'); }}>
              <Text style={dk.primaryBtnText}>{t(locale, 'dhikr.empty_state.cta', 'Découvrir')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} style={{ marginBottom: 12 }}>
              {filteredCategories.map((category) => {
                const isActive = selectedCategoryId === category.id;
                const isRamadan =
                  (process.env.EXPO_PUBLIC_RAMADAN_MODE === 'true' || [2, 3].includes(new Date().getMonth())) &&
                  category.name.toLowerCase().includes('ramadan');
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[dk.catChip, isActive && dk.catChipActive]}
                    onPress={() => {
                      setSelectedCategoryId(category.id);
                      const firstEntry = category.entries[0];
                      if (firstEntry) setForm((prev) => ({ ...prev, entryId: firstEntry.id }));
                    }}
                  >
                    <Text style={[dk.catChipText, isActive && dk.catChipTextActive]}>{category.name}</Text>
                    {isRamadan && (
                      <View style={dk.ramadanBadge}>
                        <Text style={dk.ramadanBadgeText}>{t(locale, 'common.ramadan', 'Ramadan')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedCategoryFiltered?.description && (
              <Text style={dk.catDesc}>{selectedCategoryFiltered.description}</Text>
            )}

            {/* Entry pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }} style={{ marginBottom: 16 }}>
              {(selectedCategoryFiltered?.entries ?? entriesByCategory[selectedCategoryId ?? ''] ?? []).map((entry) => {
                const isActive = form.entryId === entry.id;
                const isFav = Boolean(favoriteIds[entry.id]);
                return (
                  <TouchableOpacity key={entry.id} style={[dk.entryPill, isActive && dk.entryPillActive]} onPress={() => handleEntryChange(entry.id)}>
                    {isFav && <Ionicons name="heart" size={12} color={isActive ? '#fff' : dk_c.accent} />}
                    <Text style={[dk.entryPillText, isActive && dk.entryPillTextActive]}>{entry.title}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Count mode form */}
            {mode === 'count' && (
              <View style={dk.countCard}>
                <Text style={dk.countLabel}>{t(locale, 'dhikr.count', 'Comptage')}</Text>
                <View style={dk.counterRow}>
                  <TouchableOpacity
                    style={dk.counterBtn}
                    onPress={() => setForm((prev) => ({ ...prev, count: Math.max(0, prev.count - 1) }))}
                  >
                    <Ionicons name="remove" size={22} color={dk_c.accent} />
                  </TouchableOpacity>
                  <TextInput
                    keyboardType="numeric"
                    value={String(form.count)}
                    onChangeText={handleCountChange}
                    style={dk.counterInput}
                  />
                  <TouchableOpacity
                    style={dk.counterBtn}
                    onPress={() => setForm((prev) => ({ ...prev, count: prev.count + 1 }))}
                  >
                    <Ionicons name="add" size={22} color={dk_c.accent} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  multiline
                  numberOfLines={2}
                  value={form.notes}
                  onChangeText={handleNotesChange}
                  placeholder={t(locale, 'dhikr.notes.placeholder', 'Intentions, ressentis…')}
                  placeholderTextColor={dk_c.muted}
                  style={dk.notesInput}
                />
                <TouchableOpacity
                  disabled={saving || !form.entryId}
                  onPress={() => void handleSubmit()}
                  style={[dk.saveBtn, (saving || !form.entryId) && { opacity: 0.5 }]}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={dk.saveBtnText}>{saving ? t(locale, 'common.saving', 'Enregistrement…') : t(locale, 'common.save', 'Enregistrer')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Current entry detail */}
            {currentEntry && (
              <View style={dk.arabicCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={dk.arabicTitle}>{currentEntry.title}</Text>
                  <TouchableOpacity
                    style={[dk.favBtn, favoriteIds[currentEntry.id] && dk.favBtnActive]}
                    onPress={() => toggleFavorite(currentEntry.id)}
                  >
                    <Ionicons
                      name={favoriteIds[currentEntry.id] ? 'heart' : 'heart-outline'}
                      size={18}
                      color={favoriteIds[currentEntry.id] ? '#C62828' : dk_c.muted}
                    />
                  </TouchableOpacity>
                </View>
                {!!currentEntry.arabicText && (
                  <Text style={[dk.arabicText, mode === 'read' && { fontSize: 24, lineHeight: 40 }]}>
                    {currentEntry.arabicText}
                  </Text>
                )}
                {!!currentEntry.translit && (
                  <Text style={dk.translitText}>{currentEntry.translit}</Text>
                )}
                {!!currentEntry.translation && (
                  <Text style={dk.translationText}>{currentEntry.translation}</Text>
                )}
                {!!currentEntry.source && (
                  <View style={dk.sourceRow}>
                    <Ionicons name="library-outline" size={12} color={dk_c.muted} />
                    <Text style={dk.sourceText}>{currentEntry.source}</Text>
                  </View>
                )}
              </View>
            )}

            {/* History (count mode) */}
            {mode === 'count' && records.length > 0 && (
              <View style={dk.historyCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Ionicons name="time-outline" size={18} color={dk_c.accent} />
                  <Text style={dk.historyTitle}>{t(locale, 'dhikr.history.title', 'Historique récent')}</Text>
                </View>
                {records.map((record) => (
                  <View key={record.id} style={dk.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={dk.historyEntryTitle}>{record.entry.title}</Text>
                      <Text style={dk.historyDate}>{new Date(record.notedAt).toLocaleString(user.locale ?? 'fr')}</Text>
                      {!!record.notes && <Text style={dk.historyNotes}>{record.notes}</Text>}
                    </View>
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <Text style={dk.historyCount}>{record.count}</Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={dk.historyBtn}
                          onPress={() =>
                            void dhikrApi
                              .updateRecord(record.id, { count: record.count + 1 })
                              .then(() => loadData())
                              .catch((err) => setError(err instanceof Error ? err.message : t(locale, 'common.update_failed', 'Mise à jour impossible')))
                          }
                        >
                          <Ionicons name="add" size={14} color={dk_c.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[dk.historyBtn, { borderColor: '#FFCDD2' }]}
                          disabled={deletingId === record.id}
                          onPress={() => void handleDelete(record.id)}
                        >
                          <Ionicons name="trash-outline" size={14} color="#C62828" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const dk_c = {
  bg: '#FAFAF5',
  card: '#FFFFFF',
  border: 'rgba(0,0,0,0.06)',
  text: '#1A1A1A',
  textSoft: 'rgba(26,26,26,0.55)',
  muted: 'rgba(26,26,26,0.35)',
  accent: colors.primaryDark,
  accentLight: 'rgba(26,127,100,0.08)',
  errorColor: '#D32F2F',
};

const dk = StyleSheet.create({
  screen: { flex: 1, backgroundColor: dk_c.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: dk_c.border,
  },
  topTitle: { fontSize: 20, fontWeight: '700', color: dk_c.text },

  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  tabActive: { backgroundColor: dk_c.accent },
  tabText: { fontSize: 13, fontWeight: '700', color: dk_c.text },
  tabTextActive: { color: '#fff' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dk_c.card,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: dk_c.border,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: dk_c.text, padding: 0 },

  errorText: { color: dk_c.errorColor, fontSize: 13, paddingHorizontal: 16, marginBottom: 8 },
  mutedText: { color: dk_c.muted, fontSize: 13 },

  emptyCard: {
    backgroundColor: dk_c.card,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: dk_c.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: dk_c.text },
  emptySubtitle: { fontSize: 13, color: dk_c.muted, textAlign: 'center' },

  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dk_c.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: dk_c.border,
  },
  catChipActive: { backgroundColor: dk_c.accent, borderColor: dk_c.accent },
  catChipText: { fontWeight: '600', fontSize: 13, color: dk_c.text },
  catChipTextActive: { color: '#fff' },
  ramadanBadge: {
    backgroundColor: '#FFC107',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  ramadanBadgeText: { fontSize: 9, fontWeight: '700', color: '#1A2332', textTransform: 'uppercase' },

  catDesc: { fontSize: 12, color: dk_c.muted, paddingHorizontal: 16, marginBottom: 10 },

  entryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  entryPillActive: { backgroundColor: dk_c.accent },
  entryPillText: { fontWeight: '600', fontSize: 12, color: dk_c.text },
  entryPillTextActive: { color: '#fff' },

  countCard: {
    backgroundColor: dk_c.card,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: dk_c.border,
    marginBottom: 16,
  },
  countLabel: { fontSize: 11, fontWeight: '700', color: dk_c.muted, textTransform: 'uppercase', letterSpacing: 1 },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: dk_c.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterInput: {
    fontSize: 36,
    fontWeight: '800',
    color: dk_c.text,
    textAlign: 'center',
    minWidth: 80,
    padding: 0,
  },
  notesInput: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: dk_c.text,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: dk_c.border,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dk_c.accent,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  primaryBtn: {
    backgroundColor: dk_c.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  arabicCard: {
    backgroundColor: dk_c.card,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: dk_c.border,
    marginBottom: 16,
  },
  arabicTitle: { fontSize: 15, fontWeight: '700', color: dk_c.text, flex: 1 },
  favBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnActive: { backgroundColor: '#FFEBEE' },
  arabicText: {
    color: dk_c.text,
    fontSize: 20,
    lineHeight: 34,
    textAlign: 'right',
    fontFamily: undefined,
  },
  translitText: { color: dk_c.textSoft, fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  translationText: { color: dk_c.textSoft, fontSize: 14, lineHeight: 20 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  sourceText: { fontSize: 11, color: dk_c.muted },

  historyCard: {
    backgroundColor: dk_c.card,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: dk_c.border,
    marginBottom: 16,
  },
  historyTitle: { fontSize: 15, fontWeight: '700', color: dk_c.text },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: dk_c.border,
    gap: 12,
  },
  historyEntryTitle: { fontSize: 14, fontWeight: '600', color: dk_c.text },
  historyDate: { fontSize: 11, color: dk_c.muted, marginTop: 2 },
  historyNotes: { fontSize: 12, color: dk_c.textSoft, marginTop: 4 },
  historyCount: { fontSize: 20, fontWeight: '800', color: dk_c.accent },
  historyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dk_c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
