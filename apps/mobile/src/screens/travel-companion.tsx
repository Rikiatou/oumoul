import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface HomeLocation {
  latitude: number;
  longitude: number;
  city: string;
}

const HOME_KEY = 'oumoul_home_location';

// ─── Utils ────────────────────────────────────────────────────────────────────

function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Musafir threshold: 80 km (most scholars agree on ~77–89 km)
const MUSAFIR_THRESHOLD_KM = 80;

// ─── Screen ───────────────────────────────────────────────────────────────────

export function TravelCompanionScreen({ user: _user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { location } = useLocationContext();
  const [home, setHome] = useState<HomeLocation | null>(null);
  const [travelDays, setTravelDays] = useState(0);

  useEffect(() => {
    SecureStore.getItemAsync(HOME_KEY).then((v) => {
      if (v) setHome(JSON.parse(v));
    });
  }, []);

  const distanceFromHome = useMemo(() => {
    if (!home) return null;
    return calcDistanceKm(home.latitude, home.longitude, location.latitude, location.longitude);
  }, [home, location]);

  const isMusafir = distanceFromHome !== null && distanceFromHome >= MUSAFIR_THRESHOLD_KM;

  const setHomeHere = useCallback(async () => {
    const h: HomeLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      city: location.city ?? 'Domicile',
    };
    setHome(h);
    await SecureStore.setItemAsync(HOME_KEY, JSON.stringify(h));
  }, [location]);

  // ─── Rules ──────────────────────────────────────────────────────────────────

  const rules = useMemo(() => {
    if (!isMusafir) return null;
    return [
      {
        id: 'qasr',
        title: 'Qasr — Raccourcissement',
        icon: 'cut' as const,
        color: '#1565C0',
        desc: 'Dhuhr, Asr et Isha passent à 2 rak\'ahs (au lieu de 4). Fajr et Maghrib restent inchangés.',
        scholars: 'Avis majoritaire (Hanafi, Shafi\'i, Maliki, Hanbali)',
      },
      {
        id: 'jam',
        title: "Jam' — Regroupement",
        icon: 'git-merge' as const,
        color: '#6A1B9A',
        desc: "Tu peux regrouper Dhuhr + Asr (ensemble) et Maghrib + Isha (ensemble), à l'heure de la première ou de la deuxième.",
        scholars: 'Permis en voyage selon la majorité des savants',
      },
      {
        id: 'fasting',
        title: 'Jeûne en voyage',
        icon: 'moon' as const,
        color: '#2E7D32',
        desc: "Tu peux ne pas jeûner en voyage et rattraper les jours plus tard. Il est aussi permis de jeûner si c'est facile pour toi.",
        scholars: 'Coran 2:184 — Bukhari 1943',
      },
      {
        id: 'wiping',
        title: 'Masah sur les chaussettes',
        icon: 'footsteps' as const,
        color: '#E65100',
        desc: "En voyage, il est permis de frotter sur les chaussettes pendant 3 jours/nuits (72h) au lieu de 1 jour en résidence.",
        scholars: 'Muslim 276',
      },
      {
        id: 'friday',
        title: "Jumu'ah en voyage",
        icon: 'business' as const,
        color: '#C62828',
        desc: "La prière du vendredi n'est pas obligatoire pour le musafir (voyageur). Il prie Dhuhr en qasr.",
        scholars: 'Ibn Qudama — Al-Mughni',
      },
    ];
  }, [isMusafir]);

  const tips = [
    { icon: 'airplane' as const, text: 'Identifie la Qibla à l\'aéroport via le module Qibla de l\'app.' },
    { icon: 'time' as const, text: 'Les horaires de prière s\'adaptent automatiquement à ta position GPS.' },
    { icon: 'business' as const, text: 'Utilise la Carte Halal pour trouver des restaurants et mosquées.' },
    { icon: 'water' as const, text: 'En cas d\'absence d\'eau, le tayammum est permis (ablutions à la poussière).' },
    { icon: 'book' as const, text: 'Continue ta lecture du Coran — les récompenses du voyage sont doublées selon certains ahadith.' },
  ];

  return (
    <ScrollView style={[tc.screen, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={tc.header}>
        <BackButton onPress={onBack} />
        <Text style={tc.headerTitle}>Compagnon de voyage</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Status card */}
      <View style={[tc.statusCard, { borderColor: isMusafir ? '#1565C0' : palette.border }]}>
        <View style={[tc.statusIcon, { backgroundColor: isMusafir ? '#1565C020' : palette.accentLight }]}>
          <Ionicons name={isMusafir ? 'airplane' : 'home'} size={28} color={isMusafir ? '#1565C0' : palette.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={tc.statusTitle}>{isMusafir ? '✈️ Tu es Musafir (voyageur)' : '🏠 Tu es chez toi'}</Text>
          {distanceFromHome !== null && (
            <Text style={tc.statusDist}>{distanceFromHome.toFixed(0)} km de ton domicile</Text>
          )}
          {home && <Text style={tc.statusHome}>Domicile : {home.city}</Text>}
          {!home && <Text style={tc.statusHint}>Définis ton domicile pour activer la détection automatique</Text>}
        </View>
      </View>

      {/* Set home button */}
      <TouchableOpacity style={tc.homeBtn} onPress={() => void setHomeHere()}>
        <Ionicons name="home" size={16} color="#fff" />
        <Text style={tc.homeBtnText}>
          {home ? `Changer le domicile → ${location.city ?? 'ici'}` : `Définir ici comme domicile (${location.city ?? 'position actuelle'})`}
        </Text>
      </TouchableOpacity>

      {/* Travel days counter */}
      {isMusafir && (
        <View style={tc.daysCard}>
          <Text style={tc.daysLabel}>Jours de voyage (optionnel)</Text>
          <View style={tc.daysRow}>
            <TouchableOpacity style={tc.dayBtn} onPress={() => setTravelDays((d) => Math.max(0, d - 1))}>
              <Ionicons name="remove" size={20} color={palette.primaryDark} />
            </TouchableOpacity>
            <Text style={tc.daysValue}>{travelDays}</Text>
            <TouchableOpacity style={tc.dayBtn} onPress={() => setTravelDays((d) => d + 1)}>
              <Ionicons name="add" size={20} color={palette.primaryDark} />
            </TouchableOpacity>
          </View>
          {travelDays > 0 && (
            <Text style={tc.daysHint}>
              {travelDays <= 3
                ? '✅ Qasr et jam\' sont permis (durée < 4 jours pour la plupart des savants)'
                : travelDays <= 15
                ? '⚠️ Certains savants (Hanafi) limitent le qasr à 15 jours. Vérifier.'
                : '⚠️ Au-delà de 15 jours, tu n\'es plus considéré musafir selon la majorité.'}
            </Text>
          )}
        </View>
      )}

      {/* Rukhsa rules */}
      {isMusafir && rules && (
        <>
          <Text style={tc.sectionTitle}>📋 Rukhsa — Allègements accordés</Text>
          {rules.map((r) => (
            <View key={r.id} style={tc.ruleCard}>
              <View style={[tc.ruleIcon, { backgroundColor: r.color + '20' }]}>
                <Ionicons name={r.icon} size={20} color={r.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={tc.ruleTitle}>{r.title}</Text>
                <Text style={tc.ruleDesc}>{r.desc}</Text>
                <Text style={tc.ruleScholars}>{r.scholars}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Tips always visible */}
      <Text style={tc.sectionTitle}>💡 Conseils du voyageur musulman</Text>
      {tips.map((t, i) => (
        <View key={i} style={tc.tipRow}>
          <View style={tc.tipIcon}>
            <Ionicons name={t.icon} size={18} color={palette.primaryDark} />
          </View>
          <Text style={tc.tipText}>{t.text}</Text>
        </View>
      ))}

      {/* Du'a voyage */}
      <View style={tc.duaCard}>
        <Text style={tc.duaTitle}>Du'a du voyageur</Text>
        <Text style={tc.duaArabic}>اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ</Text>
        <Text style={tc.duaTrans}>Ô Allah, facilite-nous ce voyage et raccourcis-en la distance.</Text>
        <Text style={tc.duaSource}>Muslim 1342</Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const tc = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  statusCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: palette.card, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 2, gap: 14 },
  statusIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 15, fontWeight: '700', color: palette.text },
  statusDist: { fontSize: 13, color: palette.primaryDark, fontWeight: '600', marginTop: 4 },
  statusHome: { fontSize: 12, color: palette.textSoft, marginTop: 2 },
  statusHint: { fontSize: 12, color: palette.muted, marginTop: 2, fontStyle: 'italic' },
  homeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, backgroundColor: palette.primaryDark, borderRadius: 12, paddingVertical: 12, marginBottom: 16 },
  homeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  daysCard: { marginHorizontal: 20, backgroundColor: palette.card, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: palette.border },
  daysLabel: { fontSize: 13, fontWeight: '700', color: palette.text, marginBottom: 12 },
  daysRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  dayBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.accentLight, alignItems: 'center', justifyContent: 'center' },
  daysValue: { fontSize: 28, fontWeight: '800', color: palette.primaryDark },
  daysHint: { fontSize: 12, color: palette.textSoft, marginTop: 10, lineHeight: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: palette.text, paddingHorizontal: 20, marginTop: 8, marginBottom: 12 },
  ruleCard: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 20, backgroundColor: palette.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: palette.border, gap: 12 },
  ruleIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ruleTitle: { fontSize: 14, fontWeight: '700', color: palette.text, marginBottom: 4 },
  ruleDesc: { fontSize: 13, color: palette.textSoft, lineHeight: 19, marginBottom: 4 },
  ruleScholars: { fontSize: 11, color: palette.muted, fontStyle: 'italic' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 20, gap: 12, marginBottom: 10 },
  tipIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.accentLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tipText: { flex: 1, fontSize: 13, color: palette.text, lineHeight: 20, paddingTop: 8 },
  duaCard: { marginHorizontal: 20, marginTop: 8, backgroundColor: palette.accentLight, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: palette.border },
  duaTitle: { fontSize: 13, fontWeight: '700', color: palette.primaryDark, marginBottom: 10 },
  duaArabic: { fontSize: 20, fontFamily: 'Amiri-Regular', color: palette.arabic, textAlign: 'right', marginBottom: 8 },
  duaTrans: { fontSize: 13, fontStyle: 'italic', color: palette.text, marginBottom: 4 },
  duaSource: { fontSize: 11, color: palette.muted },
});
