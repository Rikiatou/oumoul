import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { palette } from '../theme';
import { HelpTip } from '../components/HelpTip';
import { useLocationContext } from '../context/location-context';
import { httpClient } from '../api';
import { API_URL } from '../api';

interface MosqueLocal {
  id: string;
  name: string;
  address: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  distance: number;
  facilities: string[];
  rating?: number;
  reviewCount?: number;
  isOpen?: boolean;
  prayerTimes?: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    jummah: string;
  };
}

async function fetchNearbyMosques(lat: number, lng: number, radius = 5000): Promise<MosqueLocal[]> {
  const url = `${API_URL}/places/mosques?lat=${lat}&lng=${lng}&radius=${radius}`;
  const res = await (httpClient as any).rawFetch(url, { method: 'GET' }).catch(() => null);
  if (!res || !res.ok) {
    // fallback: use direct fetch with auth header
    return fetchNearbyMosquesFallback(lat, lng, radius);
  }
  const json = await res.json();
  return (json.results ?? []) as MosqueLocal[];
}

async function fetchNearbyMosquesFallback(lat: number, lng: number, radius = 5000): Promise<MosqueLocal[]> {
  try {
    const { tokenStore } = await import('../api');
    const session = await tokenStore.getTokens();
    const token = session?.accessToken;
    const url = `${API_URL}/places/mosques?lat=${lat}&lng=${lng}&radius=${radius}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results ?? []) as MosqueLocal[];
  } catch {
    return [];
  }
}

const FACILITY_LABELS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  parking: { label: 'Parking', icon: 'car' },
  wodu: { label: 'Wudu', icon: 'water' },
  sisters_area: { label: 'Espace sœurs', icon: 'people' },
  disabled_access: { label: 'Accès PMR', icon: 'accessibility' },
  kids_area: { label: 'Espace enfants', icon: 'happy' },
  funeral_services: { label: 'Funérailles', icon: 'flower' },
  islamic_school: { label: 'École coranique', icon: 'school' },
};

function openMaps(lat: number, lng: number, name: string) {
  const url = Platform.select({
    ios: `maps:0,0?q=${name}@${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${name})`,
  });
  if (url) Linking.openURL(url).catch(() => {});
}

export function MosqueFinderScreen({ user: _user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { location: detectedLoc, loading: locLoading } = useLocationContext();
  const [search, setSearch] = useState('');
  const [selectedMosque, setSelectedMosque] = useState<MosqueLocal | null>(null);
  const [filterFacility, setFilterFacility] = useState<string | null>(null);
  const [mosques, setMosques] = useState<MosqueLocal[]>([]);
  const [loadingMosques, setLoadingMosques] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userLat = detectedLoc.latitude ?? 4.0511;
  const userLng = detectedLoc.longitude ?? 9.7679;

  const loadMosques = useCallback(async (lat: number, lng: number) => {
    setLoadingMosques(true);
    setError(null);
    try {
      const results = await fetchNearbyMosquesFallback(lat, lng, 5000);
      setMosques(results);
      if (results.length === 0) setError('Aucune mosquée trouvée. Vérifie ta connexion ou la clé API Google Places.');
    } catch {
      setError('Impossible de charger les mosquées.');
    } finally {
      setLoadingMosques(false);
    }
  }, []);

  useEffect(() => {
    if (!locLoading && userLat && userLng) {
      void loadMosques(userLat, userLng);
    }
  }, [userLat, userLng, locLoading, loadMosques]);

  const filteredMosques = useMemo(() => {
    let result = mosques;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q) || m.address.toLowerCase().includes(q));
    }
    if (filterFacility) {
      result = result.filter((m) => m.facilities.includes(filterFacility));
    }
    return result.sort((a, b) => a.distance - b.distance);
  }, [mosques, search, filterFacility]);

  const renderStars = (rating: number | undefined) => {
    if (rating == null) return null;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={12}
          color={i <= Math.round(rating) ? '#FFC107' : '#CCC'}
        />
      );
    }
    return stars;
  };

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={st.header}>
        <BackButton onPress={onBack} />
        <Text style={st.headerTitle} accessibilityRole="header">Mosquées à proximité</Text>
        <HelpTip screenName="Mosquées à proximité" tips={[
          { icon: 'location', title: 'Géolocalisation', description: 'L\'app utilise ta position GPS pour trouver les mosquées proches.' },
          { icon: 'search', title: 'Recherche', description: 'Tape le nom d\'une mosquée pour la trouver rapidement.' },
          { icon: 'options', title: 'Filtres', description: 'Filtre par équipements : parking, espace femmes, cours, etc.' },
          { icon: 'navigate', title: 'Itinéraire', description: 'Appuie sur une mosquée pour voir les détails et obtenir l\'itinéraire.' },
        ]} />
      </View>

      {/* Search */}
      <View style={st.searchRow}>
        <View style={st.searchBox}>
          <Ionicons name="search" size={16} color={palette.textSoft} />
          <TextInput
            style={st.searchInput}
            placeholder="Rechercher une mosquée..."
            placeholderTextColor={palette.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Facility Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterScroll} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        <TouchableOpacity
          style={[st.filterChip, !filterFacility && st.filterChipActive]}
          onPress={() => setFilterFacility(null)}
        >
          <Text style={[st.filterChipText, !filterFacility && st.filterChipTextActive]}>Toutes</Text>
        </TouchableOpacity>
        {Object.entries(FACILITY_LABELS).map(([key, { label, icon }]) => (
          <TouchableOpacity
            key={key}
            style={[st.filterChip, filterFacility === key && st.filterChipActive]}
            onPress={() => setFilterFacility(filterFacility === key ? null : key)}
          >
            <Ionicons name={icon} size={14} color={filterFacility === key ? '#fff' : palette.textSoft} />
            <Text style={[st.filterChipText, filterFacility === key && st.filterChipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Location Status */}
      <View style={st.locRow}>
        <Ionicons name="location" size={14} color={palette.primaryDark} />
        <Text style={st.locText}>
          {locLoading ? 'Détection GPS...' : `${detectedLoc.city ?? 'Position détectée'} · ${filteredMosques.length} mosquée(s)`}
        </Text>
        {!loadingMosques && userLat && userLng && (
          <TouchableOpacity onPress={() => void loadMosques(userLat as number, userLng as number)} style={{ marginLeft: 8 }}>
            <Ionicons name="refresh" size={14} color={palette.primaryDark} />
          </TouchableOpacity>
        )}
      </View>

      {/* Loading overlay */}
      {loadingMosques && (
        <View style={st.loadingBox}>
          <ActivityIndicator color={palette.primaryDark} size="small" />
          <Text style={st.loadingText}>Recherche des mosquées...</Text>
        </View>
      )}

      {/* Error */}
      {!loadingMosques && error && mosques.length === 0 && (
        <View style={st.errorBox}>
          <Ionicons name="warning-outline" size={32} color={palette.muted} />
          <Text style={st.errorText}>{error}</Text>
          <TouchableOpacity style={st.retryBtn} onPress={() => { if (userLat && userLng) void loadMosques(userLat as number, userLng as number); }}>
            <Text style={st.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mosque Detail */}
      {selectedMosque ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={st.backToList} onPress={() => setSelectedMosque(null)}>
            <Ionicons name="arrow-back" size={16} color={palette.primaryDark} />
            <Text style={st.backToListText}>Retour à la liste</Text>
          </TouchableOpacity>

          <View style={st.detailCard}>
            <Text style={st.detailName}>{selectedMosque.name}</Text>
            <View style={st.ratingRow}>
              {renderStars(selectedMosque.rating)}
              <Text style={st.ratingText}>{selectedMosque.rating} ({selectedMosque.reviewCount} avis)</Text>
            </View>
            <Text style={st.detailAddress}>{selectedMosque.address}, {selectedMosque.city}</Text>
            <Text style={st.detailDistance}>{selectedMosque.distance.toFixed(1)} km</Text>

            {/* Actions */}
            <View style={st.actionsRow}>
              <TouchableOpacity
                style={st.actionBtn}
                onPress={() => openMaps(selectedMosque.latitude, selectedMosque.longitude, selectedMosque.name)}
              >
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={st.actionBtnText}>Itinéraire</Text>
              </TouchableOpacity>
              {selectedMosque.phone && (
                <TouchableOpacity
                  style={[st.actionBtn, { backgroundColor: '#388E3C' }]}
                  onPress={() => Linking.openURL(`tel:${selectedMosque.phone}`).catch(() => {})}
                >
                  <Ionicons name="call" size={18} color="#fff" />
                  <Text style={st.actionBtnText}>Appeler</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Prayer Times */}
          {selectedMosque.prayerTimes && (
            <View style={st.section}>
              <Text style={st.sectionTitle}>Horaires de prière</Text>
              <View style={st.timesGrid}>
                {Object.entries(selectedMosque.prayerTimes).map(([key, time]) => {
                  const labels: Record<string, string> = {
                    fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr',
                    maghrib: 'Maghrib', isha: 'Isha', jummah: "Jumu'ah",
                  };
                  return (
                    <View key={key} style={st.timeCell}>
                      <Text style={st.timeLabel}>{labels[key] ?? key}</Text>
                      <Text style={st.timeValue}>{time}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Facilities */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>Équipements</Text>
            <View style={st.facilitiesGrid}>
              {selectedMosque.facilities.map((f) => {
                const config = FACILITY_LABELS[f];
                if (!config) return null;
                return (
                  <View key={f} style={st.facilityChip}>
                    <Ionicons name={config.icon} size={14} color={palette.primaryDark} />
                    <Text style={st.facilityText}>{config.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      ) : (
        /* Mosque List */
        <FlatList
          data={filteredMosques}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={st.mosqueRow}
              onPress={() => setSelectedMosque(item)}
              activeOpacity={0.7}
            >
              <View style={st.mosqueIcon}>
                <Ionicons name="business" size={20} color={palette.primaryDark} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={st.mosqueName}>{item.name}</Text>
                <Text style={st.mosqueAddress}>{item.address}</Text>
                <View style={st.mosqueMetaRow}>
                  <View style={st.ratingRow}>
                    {renderStars(item.rating)}
                    <Text style={st.ratingSmall}>{item.rating}</Text>
                  </View>
                  <View style={st.facilitiesRow}>
                    {item.facilities.slice(0, 3).map((f) => {
                      const config = FACILITY_LABELS[f];
                      return config ? <Ionicons key={f} name={config.icon} size={12} color={palette.muted} /> : null;
                    })}
                  </View>
                </View>
              </View>
              <View style={st.distanceBadge}>
                <Text style={st.distanceText}>{item.distance.toFixed(1)} km</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={st.emptyContainer}>
              <Ionicons name="business-outline" size={48} color={palette.muted} />
              <Text style={st.emptyText}>Aucune mosquée trouvée</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  searchRow: { paddingHorizontal: 20, marginBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: palette.border },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: palette.text },
  filterScroll: { maxHeight: 44, marginBottom: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  filterChipActive: { backgroundColor: palette.primaryDark, borderColor: palette.primaryDark },
  filterChipText: { fontSize: 12, fontWeight: '600', color: palette.textSoft },
  filterChipTextActive: { color: '#fff' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 12 },
  locText: { fontSize: 12, color: palette.textSoft, fontWeight: '500' },
  mosqueRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: palette.border },
  mosqueIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.accentLight, alignItems: 'center', justifyContent: 'center' },
  mosqueName: { fontSize: 15, fontWeight: '700', color: palette.text },
  mosqueAddress: { fontSize: 12, color: palette.textSoft, marginTop: 2 },
  mosqueMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 12, color: palette.textSoft, marginLeft: 4 },
  ratingSmall: { fontSize: 11, color: palette.textSoft, marginLeft: 4, fontWeight: '600' },
  facilitiesRow: { flexDirection: 'row', gap: 6 },
  distanceBadge: { backgroundColor: palette.accentLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  distanceText: { fontSize: 11, fontWeight: '700', color: palette.primaryDark },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: palette.muted },
  backToList: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backToListText: { fontSize: 14, color: palette.primaryDark, fontWeight: '600' },
  detailCard: { backgroundColor: palette.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: palette.border },
  detailName: { fontSize: 20, fontWeight: '700', color: palette.text, marginBottom: 8 },
  detailAddress: { fontSize: 14, color: palette.textSoft, marginTop: 8 },
  detailDistance: { fontSize: 13, color: palette.primaryDark, fontWeight: '600', marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.primaryDark, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: palette.text, marginBottom: 12 },
  timesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeCell: { width: '30%', backgroundColor: palette.card, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: palette.border },
  timeLabel: { fontSize: 11, color: palette.textSoft, fontWeight: '500' },
  timeValue: { fontSize: 16, fontWeight: '700', color: palette.text, marginTop: 4 },
  facilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  facilityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.accentLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  facilityText: { fontSize: 12, fontWeight: '600', color: palette.primaryDark },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
  loadingText: { fontSize: 13, color: palette.textSoft },
  errorBox: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24, gap: 12 },
  errorText: { fontSize: 13, color: palette.textSoft, textAlign: 'center' },
  retryBtn: { backgroundColor: palette.primaryDark, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  isOpenBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  isOpenText: { fontSize: 11, fontWeight: '700' },
});
