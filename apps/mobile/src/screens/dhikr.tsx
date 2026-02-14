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
        err instanceof Error ? err.message : t(locale, 'dhikr.save.error', 'Impossible d’enregistrer le dhikr.');
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
          err instanceof Error ? err.message : t(locale, 'dhikr.delete.error', 'Impossible de supprimer l’enregistrement.');
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
        <ActivityIndicator color={dk_c.primaryDark} />
        <Text style={[dk.muted, { marginTop: 8 }]}>{t(locale, 'common.loading', 'Chargement…')}</Text>
      </View>
    );
  }

  return (
    <View style={[dk.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 }}>
            <Ionicons name="chevron-back" size={20} color={dk_c.primaryDark} />
            <Text style={{ color: dk_c.primaryDark, fontWeight: '600', fontSize: 14 }}>{t(locale, 'common.back_to_dashboard', 'Retour')}</Text>
          </TouchableOpacity>
          <Text style={dk.title}>{t(locale, 'dhikr.title', 'Duas & Dhikr')}</Text>
          <Text style={dk.subtitle}>{t(locale, 'dhikr.subtitle', 'Choisis une catégorie puis une formule.')}</Text>
        </View>

        {/* Mode tabs */}
        <View style={dk.tabRow}>
          {(['read', 'count', 'favorites'] as const).map((m) => (
            <TouchableOpacity key={m} style={[dk.tab, mode === m && dk.tabActive]} onPress={() => setMode(m)}>
              <Text style={[dk.tabText, mode === m && dk.tabTextActive]}>
                {m === 'read' ? t(locale, 'dhikr.tab.read', 'Lire') : m === 'count' ? t(locale, 'dhikr.tab.count', 'Compter') : t(locale, 'dhikr.tab.favorites', 'Favoris')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={dk.card}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t(locale, 'dhikr.search.placeholder', 'Cherche une dua…')}
            placeholderTextColor={dk_c.muted}
            style={dk.input}
          />
          {search.length > 0 && (
            <TouchableOpacity style={dk.outlineBtn} onPress={() => setSearch('')}>
              <Text style={dk.outlineBtnText}>{t(locale, 'common.reset', 'Reset')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Total + categories */}
        <View style={dk.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View>
              <Text style={dk.muted}>{t(locale, 'dhikr.total_saved', 'Total enregistré')}</Text>
              <Text style={dk.bigNum}>{totalCount}</Text>
            </View>
          </View>

          {error && <Text style={dk.error}>{error}</Text>}

          {filteredCategories.length === 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={dk.infoTitle}>
                {favoritesOnly && !hasAnyFavorites ? t(locale, 'dhikr.favorites.empty.title', 'Aucun favori') : t(locale, 'dhikr.search.empty.title', 'Aucun résultat')}
              </Text>
              <Text style={dk.muted}>
                {favoritesOnly && !hasAnyFavorites
                  ? t(locale, 'dhikr.favorites.empty.subtitle', 'Ajoute une dua aux favoris (☆).')
                  : t(locale, 'dhikr.search.empty.subtitle', 'Modifie ta recherche ou réinitialise.')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity style={dk.primaryBtn} onPress={() => { setSearch(''); setMode('read'); }}>
                  <Text style={dk.primaryBtnText}>{t(locale, 'dhikr.empty_state.cta', 'Découvrir')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={dk.outlineBtn} onPress={() => setSearch('')}>
                  <Text style={dk.outlineBtnText}>{t(locale, 'common.reset', 'Reset')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {filteredCategories.map((category) => {
                  const isActive = selectedCategoryId === category.id;
                  const isRamadan =
                    (process.env.EXPO_PUBLIC_RAMADAN_MODE === 'true' || [2, 3].includes(new Date().getMonth())) &&
                    category.name.toLowerCase().includes('ramadan');
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[dk.chip, isActive && dk.chipActive]}
                      onPress={() => {
                        setSelectedCategoryId(category.id);
                        const firstEntry = category.entries[0];
                        if (firstEntry) setForm((prev) => ({ ...prev, entryId: firstEntry.id }));
                      }}
                    >
                      <Text style={{ color: isActive ? '#fff' : dk_c.text, fontWeight: '600', fontSize: 12 }}>{category.name}</Text>
                      {isRamadan && (
                        <View style={{ backgroundColor: '#f6d365', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#1d1a16', textTransform: 'uppercase' }}>{t(locale, 'common.ramadan', 'Ramadan')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {selectedCategoryFiltered?.description && (
            <Text style={[dk.muted, { fontSize: 12, marginBottom: 8 }]}>{selectedCategoryFiltered.description}</Text>
          )}

          {/* Entry pills */}
          <Text style={[dk.label, { marginBottom: 4 }]}>{t(locale, 'dhikr.entry', 'Formule')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(selectedCategoryFiltered?.entries ?? entriesByCategory[selectedCategoryId ?? ''] ?? []).map((entry) => {
                const isActive = form.entryId === entry.id;
                const isFav = Boolean(favoriteIds[entry.id]);
                return (
                  <TouchableOpacity key={entry.id} style={[dk.chip, isActive && dk.chipActive]} onPress={() => handleEntryChange(entry.id)}>
                    <Text style={{ color: isActive ? '#fff' : dk_c.text, fontWeight: '600', fontSize: 12 }}>{isFav ? `★ ${entry.title}` : entry.title}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Count mode form */}
          {mode === 'count' ? (
            <View style={{ gap: 10 }}>
              <Text style={dk.label}>{t(locale, 'dhikr.count', 'Comptage')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput keyboardType="numeric" value={String(form.count)} onChangeText={handleCountChange} style={[dk.input, { flex: 1 }]} />
                <TouchableOpacity style={dk.smallBtn} onPress={() => setForm((prev) => ({ ...prev, count: prev.count + 1 }))}>
                  <Text style={dk.smallBtnText}>{t(locale, 'common.plus_one', '+1')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={dk.label}>{t(locale, 'common.notes', 'Notes')}</Text>
              <TextInput multiline numberOfLines={3} value={form.notes} onChangeText={handleNotesChange} placeholder={t(locale, 'dhikr.notes.placeholder', 'Intentions, ressentis…')} placeholderTextColor={dk_c.muted} style={[dk.input, { textAlignVertical: 'top' }]} />
              <TouchableOpacity disabled={saving || !form.entryId} onPress={() => void handleSubmit()} style={[dk.primaryBtn, (saving || !form.entryId) && { opacity: 0.5 }]}>
                <Text style={dk.primaryBtnText}>{saving ? t(locale, 'common.saving', 'Enregistrement…') : t(locale, 'common.save', 'Enregistrer')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Current entry detail */}
          {currentEntry && (
            <View style={dk.arabicCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Text style={[dk.infoTitle, { flex: 1 }]}>{currentEntry.title}</Text>
                <TouchableOpacity style={dk.smallBtn} onPress={() => toggleFavorite(currentEntry.id)}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{favoriteIds[currentEntry.id] ? '★' : '☆'}</Text>
                </TouchableOpacity>
              </View>
              {!!currentEntry.arabicText && (
                <Text style={{ color: dk_c.text, fontSize: mode === 'read' ? 22 : 18, lineHeight: mode === 'read' ? 34 : 28 }}>{currentEntry.arabicText}</Text>
              )}
              {!!currentEntry.translit && <Text style={[dk.muted, { fontStyle: 'italic' }]}>{currentEntry.translit}</Text>}
              {!!currentEntry.translation && <Text style={dk.muted}>{currentEntry.translation}</Text>}
              {!!currentEntry.source && <Text style={[dk.muted, { fontSize: 11 }]}>{t(locale, 'common.source', 'Source')} · {currentEntry.source}</Text>}
            </View>
          )}
        </View>

        {/* History (count mode) */}
        {mode === 'count' ? (
          <View style={dk.card}>
            <Text style={dk.infoTitle}>{t(locale, 'dhikr.history.title', 'Historique récent')}</Text>
            <Text style={[dk.muted, { marginBottom: 8 }]}>{t(locale, 'dhikr.history.subtitle', 'Consulte et ajuste tes enregistrements.')}</Text>
            {records.length === 0 ? (
              <Text style={dk.muted}>{t(locale, 'dhikr.history.empty', 'Aucun dhikr enregistré.')}</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {records.map((record) => (
                  <View key={record.id} style={dk.infoRow}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={dk.infoTitle}>{record.entry.title}</Text>
                        <Text style={[dk.muted, { fontSize: 11 }]}>{new Date(record.notedAt).toLocaleString(user.locale ?? 'fr')}</Text>
                      </View>
                      <Text style={{ color: dk_c.text, fontSize: 20, fontWeight: '700' }}>{record.count}</Text>
                    </View>
                    {!!record.notes && <Text style={dk.muted}>{record.notes}</Text>}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <TouchableOpacity
                        style={dk.outlineBtn}
                        onPress={() =>
                          void dhikrApi
                            .updateRecord(record.id, { count: record.count + 1 })
                            .then(() => loadData())
                            .catch((err) => setError(err instanceof Error ? err.message : t(locale, 'common.update_failed', 'Mise à jour impossible')))
                        }
                      >
                        <Text style={dk.outlineBtnText}>{t(locale, 'common.plus_one', '+1')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[dk.outlineBtn, { borderColor: dk_c.errorColor }]} disabled={deletingId === record.id} onPress={() => void handleDelete(record.id)}>
                        <Text style={[dk.outlineBtnText, { color: dk_c.errorColor }]}>
                          {deletingId === record.id ? t(locale, 'common.deleting', '…') : t(locale, 'common.delete', 'Supprimer')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const dk_c = {
  bg: '#FAF5EF',
  card: '#FFFFFF',
  border: 'rgba(0,0,0,0.06)',
  text: '#1A1A1A',
  textSoft: 'rgba(26,26,26,0.55)',
  muted: 'rgba(26,26,26,0.35)',
  primaryDark: colors.primaryDark,
  errorColor: '#D32F2F',
};

const dk = StyleSheet.create({
  screen: { flex: 1, backgroundColor: dk_c.bg },
  title: { fontSize: 26, fontWeight: '700', color: dk_c.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: dk_c.textSoft, marginTop: 2 },

  card: {
    backgroundColor: dk_c.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: dk_c.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
  },

  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  tabActive: { backgroundColor: colors.primaryDark },
  tabText: { fontSize: 13, fontWeight: '700', color: dk_c.text },
  tabTextActive: { color: '#fff' },

  input: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: dk_c.text,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },

  label: { fontSize: 11, fontWeight: '600', color: dk_c.muted, textTransform: 'uppercase', letterSpacing: 1 },
  muted: { color: dk_c.textSoft, fontSize: 13 },
  error: { color: dk_c.errorColor, fontSize: 13 },
  bigNum: { fontSize: 28, fontWeight: '700', color: dk_c.text },

  infoTitle: { fontSize: 14, fontWeight: '600', color: dk_c.text },
  infoRow: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.primaryDark },

  primaryBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  outlineBtn: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  outlineBtnText: { color: dk_c.text, fontWeight: '600', fontSize: 13 },

  smallBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  smallBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  arabicCard: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginTop: 12,
  },
});
