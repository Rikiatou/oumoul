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
import { palette } from '../theme';
import { HelpTip } from '../components/HelpTip';
import { useLocationContext } from '../context/location-context';

interface MosqueLocal {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  phone?: string;
  distance: number;
  facilities: string[];
  rating: number;
  reviewCount: number;
  prayerTimes?: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    jummah: string;
  };
}

// Sample mosques data (in production, this would come from the API)
function generateNearbyMosques(lat: number, lng: number): MosqueLocal[] {
  const mosques: MosqueLocal[] = [
    {
      id: '1', name: 'Mosquée Centrale', address: 'Rue principale', city: 'Douala',
      country: 'Cameroun', latitude: lat + 0.002, longitude: lng + 0.001, phone: '+237 6XX XXX XXX',
      distance: 0.3, facilities: ['parking', 'wodu', 'sisters_area'], rating: 4.8, reviewCount: 124,
      prayerTimes: { fajr: '05:15', dhuhr: '13:00', asr: '16:30', maghrib: '18:45', isha: '20:00', jummah: '13:30' },
    },
    {
      id: '2', name: 'Masjid An-Nour', address: 'Avenue de la Liberté', city: 'Douala',
      country: 'Cameroun', latitude: lat + 0.005, longitude: lng - 0.003, phone: '+237 6XX XXX XXX',
      distance: 0.7, facilities: ['wodu', 'disabled_access'], rating: 4.5, reviewCount: 67,
      prayerTimes: { fajr: '05:20', dhuhr: '13:00', asr: '16:30', maghrib: '18:45', isha: '20:00', jummah: '13:15' },
    },
    {
      id: '3', name: 'Mosquée Al-Iman', address: 'Quartier Bali', city: 'Douala',
      country: 'Cameroun', latitude: lat - 0.008, longitude: lng + 0.006,
      distance: 1.2, facilities: ['parking', 'wodu', 'sisters_area', 'kids_area', 'islamic_school'], rating: 4.9, reviewCount: 203,
      prayerTimes: { fajr: '05:15', dhuhr: '13:00', asr: '16:30', maghrib: '18:45', isha: '20:00', jummah: '13:00' },
    },
    {
      id: '4', name: 'Masjid As-Salam', address: 'Rue de la Paix', city: 'Douala',
      country: 'Cameroun', latitude: lat + 0.012, longitude: lng + 0.009,
      distance: 1.8, facilities: ['wodu', 'parking'], rating: 4.3, reviewCount: 45,
      prayerTimes: { fajr: '05:20', dhuhr: '13:00', asr: '16:30', maghrib: '18:45', isha: '20:00', jummah: '13:30' },
    },
    {
      id: '5', name: 'Grande Mosquée', address: 'Boulevard de la République', city: 'Douala',
      country: 'Cameroun', latitude: lat - 0.015, longitude: lng - 0.01,
      distance: 2.5, facilities: ['parking', 'wodu', 'sisters_area', 'disabled_access', 'funeral_services', 'islamic_school'], rating: 4.7, reviewCount: 312,
      prayerTimes: { fajr: '05:15', dhuhr: '13:00', asr: '16:30', maghrib: '18:45', isha: '20:00', jummah: '12:45' },
    },
    {
      id: '6', name: 'Mosquée Al-Firdaws', address: 'Carrefour Ndokoti', city: 'Douala',
      country: 'Cameroun', latitude: lat + 0.02, longitude: lng - 0.015,
      distance: 3.1, facilities: ['wodu', 'sisters_area'], rating: 4.4, reviewCount: 89,
    },
  ];
  return mosques;
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

export function MosqueFinderScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { location: detectedLoc, loading: locLoading } = useLocationContext();
  const [search, setSearch] = useState('');
  const [selectedMosque, setSelectedMosque] = useState<MosqueLocal | null>(null);
  const [filterFacility, setFilterFacility] = useState<string | null>(null);

  const userLat = detectedLoc.latitude ?? 4.0511;
  const userLng = detectedLoc.longitude ?? 9.7679;

  const mosques = useMemo(() => generateNearbyMosques(userLat, userLng), [userLat, userLng]);

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

  const renderStars = (rating: number) => {
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
        <TouchableOpacity onPress={onBack} style={st.backBtn} accessibilityLabel="Retour" accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
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
      </View>

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
});
