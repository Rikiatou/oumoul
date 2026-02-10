import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator color={colors.neutral100} />
        <Text className="text-neutral-100 mt-sm">{t(locale, 'common.loading', 'Chargement…')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <ScrollView contentContainerStyle={{ paddingVertical: 32, paddingHorizontal: 20 }}>
        <View className="mb-xl">
          <Text className="text-neutral-100 text-xs tracking-[4px] uppercase">{user.firstName || user.email}</Text>
          <Text className="text-neutral-100 text-3xl font-bold mt-sm">{t(locale, 'dhikr.title', 'Duas & Dhikr')}</Text>
          <Text className="text-neutral-100/80 text-base leading-6 mt-xs">
            {t(
              locale,
              'dhikr.subtitle',
              'Choisis une catégorie puis une formule pour enregistrer ton dhikr ou tes duas. Tes enregistrements sont liés à ton profil et visibles dans l’historique.',
            )}
          </Text>
          <View className="flex-row gap-sm mt-md">
            <TouchableOpacity
              className="border border-white/60 rounded-md px-md py-xs"
              onPress={onBack}
            >
              <Text style={{ color: colors.neutral100, fontWeight: '600' }}>
                {t(locale, 'common.back_to_dashboard', 'Retour au tableau de bord')}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-sm mt-md">
            <TouchableOpacity
              className={`rounded-md px-md py-xs border ${mode === 'read' ? 'bg-neutral-100 border-transparent' : 'border-white/40'}`}
              onPress={() => setMode('read')}
            >
              <Text style={{ color: mode === 'read' ? colors.primary : colors.neutral100, fontWeight: '800' }}>
                {t(locale, 'dhikr.tab.read', 'Lire')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`rounded-md px-md py-xs border ${mode === 'count' ? 'bg-neutral-100 border-transparent' : 'border-white/40'}`}
              onPress={() => setMode('count')}
            >
              <Text style={{ color: mode === 'count' ? colors.primary : colors.neutral100, fontWeight: '800' }}>
                {t(locale, 'dhikr.tab.count', 'Compter')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`rounded-md px-md py-xs border ${mode === 'favorites' ? 'bg-neutral-100 border-transparent' : 'border-white/40'}`}
              onPress={() => setMode('favorites')}
            >
              <Text style={{ color: mode === 'favorites' ? colors.primary : colors.neutral100, fontWeight: '800' }}>
                {t(locale, 'dhikr.tab.favorites', 'Favoris')}
              </Text>
            </TouchableOpacity>
          </View>

        <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl gap-md">
          <Text className="text-neutral-100 text-base font-semibold">{t(locale, 'common.search', 'Recherche')}</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t(locale, 'dhikr.search.placeholder', 'Cherche une dua (titre, arabe, translit, traduction…)')}
            placeholderTextColor="rgba(255,255,255,0.5)"
            className="bg-white/10 rounded-md px-md py-xs text-neutral-100"
          />
          <View className="flex-row gap-sm">
            <TouchableOpacity
              className="rounded-md px-md py-xs border border-white/40"
              onPress={() => {
                setSearch('');
              }}
            >
              <Text style={{ color: colors.neutral100, fontWeight: '700' }}>{t(locale, 'common.reset', 'Reset')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>

        <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl gap-md">
          <View className="flex-row items-center justify-between mb-sm">
            <View>
              <Text className="text-neutral-100 text-base font-semibold">{t(locale, 'dhikr.total_saved', 'Total enregistré')}</Text>
              <Text className="text-neutral-100 text-2xl font-bold">{totalCount}</Text>
            </View>
          </View>

          {error && <Text className="text-[#ff8a80] text-sm mb-xs">{error}</Text>}

          {filteredCategories.length === 0 ? (
            <View className="bg-white/5 rounded-xl px-md py-md gap-sm">
              <Text className="text-neutral-100 font-semibold">
                {favoritesOnly && !hasAnyFavorites
                  ? t(locale, 'dhikr.favorites.empty.title', 'Aucun favori pour le moment')
                  : t(locale, 'dhikr.search.empty.title', 'Aucun résultat')}
              </Text>
              <Text className="text-neutral-100/80 text-sm">
                {favoritesOnly && !hasAnyFavorites
                  ? t(
                      locale,
                      'dhikr.favorites.empty.subtitle',
                      'Ajoute une dua aux favoris (☆) pour la retrouver ici rapidement.',
                    )
                  : t(
                      locale,
                      'dhikr.search.empty.subtitle',
                      'Essaie de modifier ta recherche ou réinitialise les filtres.',
                    )}
              </Text>
              <View className="flex-row gap-sm mt-xs">
                <TouchableOpacity
                  className="bg-neutral-100 rounded-md px-md py-xs"
                  onPress={() => {
                    setSearch('');
                    setShowFavoritesOnly(false);
                    setMode('read');
                  }}
                >
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>
                    {t(locale, 'dhikr.empty_state.cta', 'Découvrir les duas')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="border border-white/40 rounded-md px-md py-xs"
                  onPress={() => {
                    setSearch('');
                  }}
                >
                  <Text style={{ color: colors.neutral100, fontWeight: '700' }}>
                    {t(locale, 'common.reset', 'Reset')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-sm">
              <View className="flex-row gap-xs">
                {filteredCategories.map((category) => {
                  const isActive = selectedCategoryId === category.id;
                  const isRamadan =
                    (process.env.EXPO_PUBLIC_RAMADAN_MODE === 'true' || [2, 3].includes(new Date().getMonth())) &&
                    category.name.toLowerCase().includes('ramadan');
                  return (
                    <TouchableOpacity
                      key={category.id}
                      className="px-md py-xs rounded-full border flex-row items-center"
                      style={{
                        borderColor: isActive ? 'transparent' : 'rgba(255,255,255,0.4)',
                        backgroundColor: isActive ? colors.neutral100 : 'transparent',
                        gap: 6,
                      }}
                      onPress={() => {
                        setSelectedCategoryId(category.id);
                        const firstEntry = category.entries[0];
                        if (firstEntry) {
                          setForm((prev) => ({ ...prev, entryId: firstEntry.id }));
                        }
                      }}
                    >
                      <Text
                        className="text-xs"
                        style={{ color: isActive ? colors.primary : colors.neutral100, fontWeight: '600' }}
                      >
                        {category.name}
                      </Text>
                      {isRamadan && (
                        <Text
                          className="text-[10px] px-2 py-[2px] rounded-full"
                          style={{
                            backgroundColor: '#f6d365',
                            color: '#1d1a16',
                            fontWeight: '700',
                            letterSpacing: 0.3,
                            textTransform: 'uppercase',
                          }}
                        >
                          {t(locale, 'common.ramadan', 'Ramadan')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {selectedCategoryFiltered?.description && (
            <Text className="text-neutral-100/80 text-xs mb-sm">{selectedCategoryFiltered.description}</Text>
          )}

          <View className="mb-md">
            <Text className="text-neutral-100 text-xs mb-xs">{t(locale, 'dhikr.entry', 'Formule')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-xs">
                {(selectedCategoryFiltered?.entries ?? entriesByCategory[selectedCategoryId ?? ''] ?? []).map((entry) => {
                  const isActive = form.entryId === entry.id;
                  const isFav = Boolean(favoriteIds[entry.id]);
                  return (
                    <TouchableOpacity
                      key={entry.id}
                      className="px-md py-xs rounded-full border"
                      style={{
                        borderColor: isActive ? 'transparent' : 'rgba(255,255,255,0.4)',
                        backgroundColor: isActive ? colors.neutral100 : 'transparent',
                      }}
                      onPress={() => handleEntryChange(entry.id)}
                    >
                      <Text
                        className="text-xs"
                        style={{ color: isActive ? colors.primary : colors.neutral100, fontWeight: '600' }}
                      >
                        {isFav ? `★ ${entry.title}` : entry.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {mode === 'count' ? (
            <>
              <View className="mb-md">
                <Text className="text-neutral-100 text-xs mb-xs">{t(locale, 'dhikr.count', 'Comptage')}</Text>
                <View className="flex-row items-center gap-sm">
                  <TextInput
                    keyboardType="numeric"
                    value={String(form.count)}
                    onChangeText={handleCountChange}
                    className="flex-1 bg-white/10 rounded-md px-md py-xs text-neutral-100"
                  />
                  <TouchableOpacity
                    className="bg-neutral-100 rounded-md px-md py-xs"
                    onPress={() => setForm((prev) => ({ ...prev, count: prev.count + 1 }))}
                  >
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>{t(locale, 'common.plus_one', '+1')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mb-md">
                <Text className="text-neutral-100 text-xs mb-xs">{t(locale, 'common.notes', 'Notes')}</Text>
                <TextInput
                  multiline
                  numberOfLines={3}
                  value={form.notes}
                  onChangeText={handleNotesChange}
                  placeholder={t(locale, 'dhikr.notes.placeholder', 'Intentions, ressentis, rappels…')}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  className="bg-white/10 rounded-md px-md py-xs text-neutral-100"
                />
              </View>

              <TouchableOpacity
                disabled={saving || !form.entryId}
                onPress={() => void handleSubmit()}
                className="bg-neutral-100 rounded-md px-md py-sm items-center"
              >
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {saving
                    ? t(locale, 'common.saving', 'Enregistrement…')
                    : t(locale, 'common.save', 'Enregistrer')}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          {currentEntry && (
            <View className="mt-lg bg-white/5 rounded-xl px-md py-md gap-xs">
              <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
                <Text className="text-neutral-100 text-base font-semibold" style={{ flex: 1 }}>
                  {currentEntry.title}
                </Text>
                <TouchableOpacity
                  className="bg-neutral-100 rounded-md px-md py-xs"
                  onPress={() => toggleFavorite(currentEntry.id)}
                >
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>
                    {favoriteIds[currentEntry.id] ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              </View>
              {!!currentEntry.arabicText && (
                <Text
                  className="text-neutral-100 leading-8"
                  style={{ fontSize: mode === 'read' ? 22 : 18, lineHeight: mode === 'read' ? 34 : 28 }}
                >
                  {currentEntry.arabicText}
                </Text>
              )}
              {!!currentEntry.translit && (
                <Text className="text-neutral-100/80 text-sm italic">{currentEntry.translit}</Text>
              )}
              {!!currentEntry.translation && (
                <Text className="text-neutral-100/90 text-sm">{currentEntry.translation}</Text>
              )}
              {!!currentEntry.source && (
                <Text className="text-neutral-100/70 text-xs">
                  {t(locale, 'common.source', 'Source')} · {currentEntry.source}
                </Text>
              )}
            </View>
          )}
        </View>

        {mode === 'count' ? (
          <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl gap-md">
            <View className="mb-sm">
              <Text className="text-neutral-100 text-base font-semibold">{t(locale, 'dhikr.history.title', 'Historique récent')}</Text>
              <Text className="text-neutral-100/70 text-xs">
                {t(locale, 'dhikr.history.subtitle', 'Consultes et ajuste tes derniers enregistrements.')}
              </Text>
            </View>
            {records.length === 0 ? (
              <Text className="text-neutral-100/80 text-sm">
                {t(locale, 'dhikr.history.empty', 'Aucun dhikr enregistré pour le moment.')}
              </Text>
            ) : (
              <View className="gap-sm">
                {records.map((record) => (
                  <View key={record.id} className="bg-white/5 rounded-xl px-md py-sm gap-xs">
                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text className="text-neutral-100 font-semibold">{record.entry.title}</Text>
                        <Text className="text-neutral-100/70 text-xs">
                          {new Date(record.notedAt).toLocaleString(user.locale ?? 'fr')}
                        </Text>
                      </View>
                      <Text className="text-neutral-100 text-lg font-bold">{record.count}</Text>
                    </View>
                    {!!record.notes && <Text className="text-neutral-100/80 text-sm">{record.notes}</Text>}
                    <View className="flex-row gap-sm mt-xs">
                      <TouchableOpacity
                        className="bg-neutral-100 rounded-md px-md py-xs"
                        onPress={() =>
                          void dhikrApi
                            .updateRecord(record.id, { count: record.count + 1 })
                            .then(() => loadData())
                            .catch((err) =>
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : t(locale, 'common.update_failed', 'Mise à jour impossible'),
                              ),
                            )
                        }
                      >
                        <Text style={{ color: colors.primary, fontWeight: '700' }}>{t(locale, 'common.plus_one', '+1')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="border border-[#ff8a80] rounded-md px-md py-xs"
                        disabled={deletingId === record.id}
                        onPress={() => void handleDelete(record.id)}
                      >
                        <Text style={{ color: '#ff8a80', fontWeight: '700' }}>
                          {deletingId === record.id
                            ? t(locale, 'common.deleting', 'Suppression…')
                            : t(locale, 'common.delete', 'Supprimer')}
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
    </SafeAreaView>
  );
}
