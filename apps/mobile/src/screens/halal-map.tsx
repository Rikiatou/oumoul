import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
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
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { palette } from '../theme';
import { useLocationContext } from '../context/location-context';
import { API_URL, tokenStore } from '../api';

// ─── Types ───────────────────────────────────────────────────────────────────

type PlaceCategory = 'restaurant' | 'butcher' | 'grocery' | 'school' | 'mosque';

interface HalalPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  rating?: number;
  reviewCount?: number;
  isOpen?: boolean;
  category: PlaceCategory;
  facilities: string[];
  communityAdded: boolean;
  addedBy?: string;
  note?: string;
}

interface CommunityReview {
  id: string;
  placeId: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
  tags: string[];
}

const COMMUNITY_PLACES_KEY = 'oumoul_community_halal_places';
const COMMUNITY_REVIEWS_KEY = 'oumoul_community_reviews';

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORIES: Array<{ id: PlaceCategory; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = [
  { id: 'restaurant', label: 'Restaurants', icon: 'restaurant', color: '#E53935' },
  { id: 'butcher', label: 'Boucheries', icon: 'cut', color: '#8E24AA' },
  { id: 'grocery', label: 'Épiceries', icon: 'cart', color: '#43A047' },
  { id: 'mosque', label: 'Mosquées', icon: 'business', color: '#1E88E5' },
  { id: 'school', label: 'Écoles', icon: 'school', color: '#FB8C00' },
];

const REVIEW_TAGS = [
  '✅ Certifié halal', '🍖 Bonne qualité', '💰 Prix raisonnable', '🧹 Propre',
  '😊 Accueil chaleureux', '🕌 Proche mosquée', '🚗 Parking', '👨‍👩‍👧 Familial',
  '⚠️ À vérifier', '❌ Plus halal',
];

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchNearbyHalal(lat: number, lng: number, category?: PlaceCategory): Promise<HalalPlace[]> {
  try {
    const session = await tokenStore.getTokens();
    const token = session?.accessToken;
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: '3000' });
    if (category && category !== 'mosque') params.set('category', category);
    const endpoint = category === 'mosque' ? 'mosques' : 'halal';
    const res = await fetch(`${API_URL}/places/${endpoint}?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results ?? []) as HalalPlace[];
  } catch {
    return [];
  }
}

function openMaps(lat: number, lng: number, name: string) {
  const url = Platform.select({
    ios: `maps:0,0?q=${encodeURIComponent(name)}@${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`,
  });
  if (url) Linking.openURL(url).catch(() => {});
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function HalalMapScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { location, loading: locLoading } = useLocationContext();

  const [activeCategory, setActiveCategory] = useState<PlaceCategory>('restaurant');
  const [apiPlaces, setApiPlaces] = useState<HalalPlace[]>([]);
  const [communityPlaces, setCommunityPlaces] = useState<HalalPlace[]>([]);
  const [reviews, setReviews] = useState<CommunityReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<HalalPlace | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Add place form state
  const [addName, setAddName] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addNote, setAddNote] = useState('');

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewTags, setReviewTags] = useState<string[]>([]);

  const userLat = location.latitude;
  const userLng = location.longitude;

  // Load community data from SecureStore
  useEffect(() => {
    void (async () => {
      const cp = await SecureStore.getItemAsync(COMMUNITY_PLACES_KEY);
      const cr = await SecureStore.getItemAsync(COMMUNITY_REVIEWS_KEY);
      if (cp) setCommunityPlaces(JSON.parse(cp));
      if (cr) setReviews(JSON.parse(cr));
    })();
  }, []);

  // Fetch places from API when category or location changes
  const loadPlaces = useCallback(async (cat: PlaceCategory, lat: number, lng: number) => {
    setLoading(true);
    const results = await fetchNearbyHalal(lat, lng, cat);
    setApiPlaces(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!locLoading) {
      void loadPlaces(activeCategory, userLat, userLng);
    }
  }, [activeCategory, userLat, userLng, locLoading, loadPlaces]);

  // Merge API + community places, filter by category + search
  const allPlaces = useMemo(() => {
    const communityFiltered = communityPlaces.filter((p) => p.category === activeCategory);
    const merged = [...apiPlaces, ...communityFiltered];
    if (!search.trim()) return merged.sort((a, b) => a.distance - b.distance);
    const q = search.toLowerCase();
    return merged.filter((p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
  }, [apiPlaces, communityPlaces, activeCategory, search]);

  const placeReviews = useMemo(
    () => (selectedPlace ? reviews.filter((r) => r.placeId === selectedPlace.id) : []),
    [reviews, selectedPlace]
  );

  // Add community place
  const handleAddPlace = useCallback(async () => {
    if (!addName.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire.');
      return;
    }
    const newPlace: HalalPlace = {
      id: `community_${Date.now()}`,
      name: addName.trim(),
      address: addAddress.trim() || `${location.city ?? 'Localisation inconnue'}`,
      latitude: userLat,
      longitude: userLng,
      distance: 0,
      category: activeCategory,
      facilities: [],
      communityAdded: true,
      addedBy: user.firstName ?? 'Anonyme',
      note: addNote.trim() || undefined,
    };
    const updated = [newPlace, ...communityPlaces];
    setCommunityPlaces(updated);
    await SecureStore.setItemAsync(COMMUNITY_PLACES_KEY, JSON.stringify(updated));
    setAddName('');
    setAddAddress('');
    setAddNote('');
    setShowAddModal(false);
    Alert.alert('Ajouté !', `${newPlace.name} a été ajouté à la carte communautaire. Jazak Allah khayran !`);
  }, [addName, addAddress, addNote, activeCategory, communityPlaces, location.city, user.firstName, userLat, userLng]);

  // Add review
  const handleAddReview = useCallback(async () => {
    if (!selectedPlace || !reviewComment.trim()) return;
    const newReview: CommunityReview = {
      id: `review_${Date.now()}`,
      placeId: selectedPlace.id,
      author: user.firstName ?? 'Anonyme',
      rating: reviewRating,
      comment: reviewComment.trim(),
      date: new Date().toISOString().slice(0, 10),
      tags: reviewTags,
    };
    const updated = [newReview, ...reviews];
    setReviews(updated);
    await SecureStore.setItemAsync(COMMUNITY_REVIEWS_KEY, JSON.stringify(updated));
    setReviewComment('');
    setReviewTags([]);
    setReviewRating(5);
    setShowReviewModal(false);
  }, [selectedPlace, reviewComment, reviewRating, reviewTags, reviews, user.firstName]);

  const catConfig = (cat: PlaceCategory) => CATEGORIES.find((c) => c.id === cat)!;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <BackButton onPress={onBack} />
        <Text style={s.headerTitle}>Carte Halal</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[s.tab, activeCategory === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
            onPress={() => { setActiveCategory(cat.id); setSelectedPlace(null); }}
          >
            <Ionicons name={cat.icon} size={15} color={activeCategory === cat.id ? '#fff' : palette.textSoft} />
            <Text style={[s.tabText, activeCategory === cat.id && { color: '#fff' }]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={15} color={palette.textSoft} />
          <TextInput
            style={s.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor={palette.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => void loadPlaces(activeCategory, userLat, userLng)}>
          <Ionicons name="refresh" size={18} color={palette.primaryDark} />
        </TouchableOpacity>
      </View>

      {/* Location row */}
      <View style={s.locRow}>
        <Ionicons name="location" size={13} color={palette.primaryDark} />
        <Text style={s.locText}>{location.city ?? 'Position détectée'} · {allPlaces.length} lieu(x)</Text>
        {allPlaces.some((p) => p.communityAdded) && (
          <View style={s.communityBadge}>
            <Text style={s.communityBadgeText}>🤝 communautaire</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={palette.primaryDark} />
          <Text style={s.loadingText}>Recherche des lieux halal...</Text>
        </View>
      ) : selectedPlace ? (
        // ── Place detail ───────────────────────────────────────────────────
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <TouchableOpacity style={s.backRow} onPress={() => setSelectedPlace(null)}>
            <Ionicons name="arrow-back" size={16} color={palette.primaryDark} />
            <Text style={s.backText}>Retour</Text>
          </TouchableOpacity>

          <View style={s.detailCard}>
            <View style={s.detailHeader}>
              <View style={[s.catBadge, { backgroundColor: catConfig(selectedPlace.category).color }]}>
                <Ionicons name={catConfig(selectedPlace.category).icon} size={16} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.detailName}>{selectedPlace.name}</Text>
                <Text style={s.detailAddress}>{selectedPlace.address}</Text>
              </View>
            </View>

            <View style={s.detailMeta}>
              <Text style={s.detailDist}>{selectedPlace.distance.toFixed(1)} km</Text>
              {selectedPlace.isOpen !== undefined && (
                <Text style={[s.openBadge, { color: selectedPlace.isOpen ? '#43A047' : '#E53935' }]}>
                  {selectedPlace.isOpen ? '● Ouvert' : '● Fermé'}
                </Text>
              )}
              {selectedPlace.communityAdded && (
                <Text style={s.communityTag}>🤝 Ajouté par la communauté</Text>
              )}
            </View>

            {selectedPlace.note && (
              <View style={s.noteBox}>
                <Ionicons name="information-circle" size={15} color={palette.primaryDark} />
                <Text style={s.noteText}>{selectedPlace.note}</Text>
              </View>
            )}

            <View style={s.detailActions}>
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => openMaps(selectedPlace.latitude, selectedPlace.longitude, selectedPlace.name)}
              >
                <Ionicons name="navigate" size={16} color="#fff" />
                <Text style={s.actionBtnText}>Itinéraire</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#43A047' }]}
                onPress={() => { setShowReviewModal(true); }}
              >
                <Ionicons name="star" size={16} color="#fff" />
                <Text style={s.actionBtnText}>Donner un avis</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Reviews */}
          <Text style={s.sectionTitle}>Avis de la communauté ({placeReviews.length})</Text>
          {placeReviews.length === 0 ? (
            <Text style={s.noReviews}>Sois le premier à laisser un avis !</Text>
          ) : (
            placeReviews.map((r) => (
              <View key={r.id} style={s.reviewCard}>
                <View style={s.reviewHeader}>
                  <Text style={s.reviewAuthor}>{r.author}</Text>
                  <Text style={s.reviewDate}>{r.date}</Text>
                  <View style={s.starsRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons key={i} name={i < r.rating ? 'star' : 'star-outline'} size={12} color="#FFC107" />
                    ))}
                  </View>
                </View>
                <Text style={s.reviewComment}>{r.comment}</Text>
                {r.tags.length > 0 && (
                  <View style={s.tagRow}>
                    {r.tags.map((t) => (
                      <View key={t} style={s.tagChip}><Text style={s.tagText}>{t}</Text></View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        // ── Place list ─────────────────────────────────────────────────────
        <FlatList
          data={allPlaces}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name={catConfig(activeCategory).icon} size={40} color={palette.muted} />
              <Text style={s.emptyText}>Aucun lieu trouvé</Text>
              <Text style={s.emptyHint}>Appuie sur + pour ajouter un lieu halal de ta communauté !</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cat = catConfig(item.category);
            return (
              <TouchableOpacity style={s.placeRow} onPress={() => setSelectedPlace(item)} activeOpacity={0.75}>
                <View style={[s.placeIcon, { backgroundColor: cat.color + '22' }]}>
                  <Ionicons name={cat.icon} size={20} color={cat.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={s.placeNameRow}>
                    <Text style={s.placeName}>{item.name}</Text>
                    {item.communityAdded && <Text style={s.communityDot}>🤝</Text>}
                  </View>
                  <Text style={s.placeAddress} numberOfLines={1}>{item.address}</Text>
                  {item.rating !== undefined && (
                    <View style={s.starsRow}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons key={i} name={i < Math.round(item.rating!) ? 'star' : 'star-outline'} size={11} color="#FFC107" />
                      ))}
                      <Text style={s.ratingText}>{item.rating?.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                <View style={s.distBadge}>
                  <Text style={s.distText}>{item.distance.toFixed(1)} km</Text>
                  {item.isOpen !== undefined && (
                    <Text style={{ fontSize: 9, color: item.isOpen ? '#43A047' : '#E53935', fontWeight: '700' }}>
                      {item.isOpen ? 'Ouvert' : 'Fermé'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── Add Place Modal ───────────────────────────────────────────────── */}
      <Modal visible={showAddModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
            <TouchableOpacity activeOpacity={1} style={s.modalCard}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Ajouter un lieu halal</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={palette.text} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={s.modalSubtitle}>Ta contribution aide la communauté musulmane !</Text>

                <Text style={s.fieldLabel}>Nom du lieu *</Text>
                <TextInput
                  style={s.textField}
                  placeholder="Ex: Restaurant Al-Amin"
                  placeholderTextColor={palette.muted}
                  value={addName}
                  onChangeText={setAddName}
                />

                <Text style={s.fieldLabel}>Adresse (optionnel)</Text>
                <TextInput
                  style={s.textField}
                  placeholder="Ex: 12 rue des Palmiers"
                  placeholderTextColor={palette.muted}
                  value={addAddress}
                  onChangeText={setAddAddress}
                />

                <Text style={s.fieldLabel}>Note / info halal (optionnel)</Text>
                <TextInput
                  style={[s.textField, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Ex: Certifié par la mosquée locale, boucherie sur place..."
                  placeholderTextColor={palette.muted}
                  value={addNote}
                  onChangeText={setAddNote}
                  multiline
                />

                <Text style={s.fieldLabel}>Catégorie</Text>
                <View style={s.catRow}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[s.catChip, activeCategory === cat.id && { backgroundColor: cat.color }]}
                      onPress={() => setActiveCategory(cat.id)}
                    >
                      <Ionicons name={cat.icon} size={14} color={activeCategory === cat.id ? '#fff' : palette.textSoft} />
                      <Text style={[s.catChipText, activeCategory === cat.id && { color: '#fff' }]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={s.submitBtn} onPress={() => void handleAddPlace()}>
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={s.submitBtnText}>Ajouter à la carte</Text>
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Review Modal ──────────────────────────────────────────────────── */}
      <Modal visible={showReviewModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowReviewModal(false)}>
            <TouchableOpacity activeOpacity={1} style={s.modalCard}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Laisser un avis</Text>
                <TouchableOpacity onPress={() => setShowReviewModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={palette.text} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={s.modalSubtitle}>{selectedPlace?.name}</Text>

                <Text style={s.fieldLabel}>Note</Text>
                <View style={s.starsRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TouchableOpacity key={i} onPress={() => setReviewRating(i + 1)}>
                      <Ionicons name={i < reviewRating ? 'star' : 'star-outline'} size={32} color="#FFC107" />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[s.fieldLabel, { marginTop: 12 }]}>Commentaire *</Text>
                <TextInput
                  style={[s.textField, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Partage ton expérience avec la communauté..."
                  placeholderTextColor={palette.muted}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                />

                <Text style={[s.fieldLabel, { marginTop: 8 }]}>Tags (optionnel)</Text>
                <View style={s.tagRow}>
                  {REVIEW_TAGS.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[s.tagChip, reviewTags.includes(t) && { backgroundColor: palette.primaryDark }]}
                      onPress={() => setReviewTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
                    >
                      <Text style={[s.tagText, reviewTags.includes(t) && { color: '#fff' }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={[s.submitBtn, { marginTop: 16 }]} onPress={() => void handleAddReview()}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={s.submitBtnText}>Publier l'avis</Text>
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.primaryDark, alignItems: 'center', justifyContent: 'center' },
  tabs: { maxHeight: 48, marginBottom: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  tabText: { fontSize: 12, fontWeight: '600', color: palette.textSoft },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: palette.border },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: palette.text },
  refreshBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 10 },
  locText: { fontSize: 12, color: palette.textSoft, flex: 1 },
  communityBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  communityBadgeText: { fontSize: 10, fontWeight: '700', color: '#2E7D32' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: palette.textSoft },
  placeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: palette.border },
  placeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  placeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  placeName: { fontSize: 14, fontWeight: '700', color: palette.text },
  communityDot: { fontSize: 14 },
  placeAddress: { fontSize: 11, color: palette.textSoft, marginTop: 2 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 },
  ratingText: { fontSize: 11, color: palette.textSoft, marginLeft: 3, fontWeight: '600' },
  distBadge: { alignItems: 'center', gap: 2 },
  distText: { fontSize: 11, fontWeight: '700', color: palette.primaryDark },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 24 },
  emptyText: { fontSize: 16, fontWeight: '700', color: palette.text },
  emptyHint: { fontSize: 13, color: palette.textSoft, textAlign: 'center' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 14, color: palette.primaryDark, fontWeight: '600' },
  detailCard: { backgroundColor: palette.card, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: palette.border },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  catBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  detailName: { fontSize: 18, fontWeight: '700', color: palette.text },
  detailAddress: { fontSize: 12, color: palette.textSoft, marginTop: 2 },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  detailDist: { fontSize: 13, fontWeight: '700', color: palette.primaryDark },
  openBadge: { fontSize: 12, fontWeight: '700' },
  communityTag: { fontSize: 11, color: '#43A047', fontWeight: '600' },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: palette.accentLight, borderRadius: 8, padding: 10, marginTop: 10 },
  noteText: { flex: 1, fontSize: 12, color: palette.text },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: palette.primaryDark, paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: palette.text, marginBottom: 12 },
  noReviews: { fontSize: 13, color: palette.textSoft, textAlign: 'center', paddingVertical: 20 },
  reviewCard: { backgroundColor: palette.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: palette.border },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  reviewAuthor: { fontWeight: '700', fontSize: 13, color: palette.text, flex: 1 },
  reviewDate: { fontSize: 11, color: palette.muted },
  reviewComment: { fontSize: 13, color: palette.text, lineHeight: 19 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tagChip: { backgroundColor: palette.accentLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: '600', color: palette.primaryDark },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: palette.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, maxHeight: '88%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: palette.border, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: palette.text },
  modalSubtitle: { fontSize: 13, color: palette.textSoft, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: palette.text, marginBottom: 6 },
  textField: { backgroundColor: palette.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: palette.text, borderWidth: 1, borderColor: palette.border, marginBottom: 12 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  catChipText: { fontSize: 12, fontWeight: '600', color: palette.textSoft },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: palette.primaryDark, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
