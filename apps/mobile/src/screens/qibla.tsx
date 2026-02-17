import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Magnetometer } from 'expo-sensors';
import { apiRoutes } from "@oumoul/config";
import type { AuthUser } from "@oumoul/api";
import { httpClient } from "../api";
import { t, Locale } from "../i18n";
import { useLocationContext } from "../context/location-context";
import { palette } from "../theme";

export function QiblaScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const locale = (user.locale as Locale | undefined) ?? "fr";
  const { location: detectedLoc, loading: locLoading, refresh: refreshLoc } = useLocationContext();
  const [direction, setDirection] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationLabel = detectedLoc.city && detectedLoc.country
    ? `${detectedLoc.city}, ${detectedLoc.country}`
    : detectedLoc.city ?? t(locale, "qibla.loc.detected", "Localisation détectée");

  const fetchQibla = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set('latitude', String(lat));
      query.set('longitude', String(lng));
      const res = await httpClient.request<{ direction: number }>(`${apiRoutes.backend.prayer}/qibla?${query.toString()}`, {
        method: 'GET',
      });
      setDirection(res.direction);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de récupérer la Qibla.';
      setError(message);
      setDirection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch when location is detected
  useEffect(() => {
    if (locLoading) return;
    if (detectedLoc.latitude && detectedLoc.longitude) {
      void fetchQibla(detectedLoc.latitude, detectedLoc.longitude);
    }
  }, [detectedLoc, locLoading, fetchQibla]);

  const handleRefresh = useCallback(async () => {
    const loc = await refreshLoc();
    if (loc.latitude && loc.longitude) {
      void fetchQibla(loc.latitude, loc.longitude);
    }
  }, [refreshLoc, fetchQibla]);

  // ── Live compass via magnetometer ──
  const [heading, setHeading] = useState<number>(0);
  const [magnetometerAvailable, setMagnetometerAvailable] = useState(true);
  const compassAnim = useRef(new Animated.Value(0)).current;
  const prevHeadingRef = useRef(0);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    const start = async () => {
      const available = await Magnetometer.isAvailableAsync();
      setMagnetometerAvailable(available);
      if (!available) return;
      Magnetometer.setUpdateInterval(100);
      sub = Magnetometer.addListener((data) => {
        const { x, y } = data;
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        // atan2 gives angle from x-axis; convert to compass heading (0=N, 90=E)
        angle = 90 - angle;
        if (angle < 0) angle += 360;
        setHeading(angle);
      });
    };
    void start();
    return () => { sub?.remove(); };
  }, []);

  // Animate compass rotation smoothly
  useEffect(() => {
    if (direction === null) return;
    // qiblaRelative = how much to rotate the needle from current device heading
    const target = direction - heading;
    // Shortest path rotation
    let delta = target - prevHeadingRef.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const newVal = prevHeadingRef.current + delta;
    prevHeadingRef.current = newVal;
    Animated.timing(compassAnim, {
      toValue: newVal,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [heading, direction, compassAnim]);

  const compassRotation = compassAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  // Static fallback rotation when magnetometer is not available
  const staticRotation = direction ?? 0;

  const insets = useSafeAreaInsets();

  return (
    <View style={[qb.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={qb.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={qb_c.accent} />
        </TouchableOpacity>
        <Text style={qb.topTitle}>{t(locale, "qibla.title", "Qibla")}</Text>
        <Ionicons name="compass-outline" size={20} color={qb_c.muted} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Compass display */}
        <View style={qb.compassSection}>
          {direction !== null ? (
            <>
              <View style={qb.compassOuter}>
                <View style={qb.compassInner}>
                  {/* Cardinal labels */}
                  <Text style={[qb.cardinal, { top: 8 }]}>N</Text>
                  <Text style={[qb.cardinal, { bottom: 8 }]}>S</Text>
                  <Text style={[qb.cardinal, { left: 8, top: '45%' }]}>W</Text>
                  <Text style={[qb.cardinal, { right: 8, top: '45%' }]}>E</Text>
                  {/* Needle — live rotation when magnetometer available, static otherwise */}
                  {magnetometerAvailable ? (
                    <Animated.View style={[qb.needle, { transform: [{ rotate: compassRotation }] }]}>
                      <View style={qb.needleTop} />
                      <View style={qb.needleBottom} />
                    </Animated.View>
                  ) : (
                    <View style={[qb.needle, { transform: [{ rotate: `${staticRotation}deg` }] }]}>
                      <View style={qb.needleTop} />
                      <View style={qb.needleBottom} />
                    </View>
                  )}
                  <View style={qb.compassCenter}>
                    <Ionicons name="locate" size={16} color={qb_c.accent} />
                  </View>
                </View>
              </View>
              <Text style={qb.degreeText}>{direction.toFixed(1)}°</Text>
              <Text style={qb.kaabaLabel}>Direction de la Kaaba</Text>
              {magnetometerAvailable ? (
                <Text style={qb.liveLabel}>🧭 Boussole active</Text>
              ) : (
                <Text style={[qb.liveLabel, { color: '#E65100' }]}>Boussole non disponible</Text>
              )}
            </>
          ) : loading ? (
            <View style={{ paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={qb_c.accent} />
              <Text style={[qb.mutedText, { marginTop: 8 }]}>{t(locale, "qibla.button.calculating", "Calcul…")}</Text>
            </View>
          ) : (
            <View style={qb.promptCard}>
              <Ionicons name="compass-outline" size={32} color={qb_c.muted} />
              <Text style={qb.promptText}>{t(locale, "qibla.prompt", "Saisis ou autorise ta position pour calculer la Qibla.")}</Text>
            </View>
          )}
        </View>

        {/* Location card */}
        <View style={qb.card}>
          <View style={qb.cardHeader}>
            <Ionicons name="location-outline" size={18} color={qb_c.accent} />
            <Text style={qb.sectionTitle}>{t(locale, "qibla.position", "Position")}</Text>
          </View>

          <View style={qb.infoBadge}>
            <Ionicons name="navigate-outline" size={14} color={qb_c.accent} />
            <Text style={qb.infoText}>{locLoading ? 'Détection GPS…' : locationLabel}</Text>
          </View>

          <View style={qb.coordRow}>
            <View style={qb.coordField}>
              <View style={qb.coordIconWrap}>
                <Ionicons name="navigate-outline" size={14} color={qb_c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={qb.coordLabel}>Latitude</Text>
                <Text style={qb.coordValue}>{detectedLoc.latitude.toFixed(4)}</Text>
              </View>
            </View>
            <View style={qb.coordField}>
              <View style={qb.coordIconWrap}>
                <Ionicons name="navigate-outline" size={14} color={qb_c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={qb.coordLabel}>Longitude</Text>
                <Text style={qb.coordValue}>{detectedLoc.longitude.toFixed(4)}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={[qb.refreshBtn, (loading || locLoading) && { opacity: 0.5 }]} disabled={loading || locLoading} onPress={() => void handleRefresh()}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={qb.refreshBtnText}>
              {loading || locLoading ? t(locale, "qibla.button.calculating", "Calcul…") : t(locale, "qibla.button.refresh", "Actualiser")}
            </Text>
          </TouchableOpacity>
          {error && <Text style={qb.errorText}>{error}</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const qb_c = {
  bg: palette.bgAlt,
  card: palette.card,
  border: palette.border,
  text: palette.text,
  textSoft: palette.textSoft,
  muted: palette.muted,
  accent: palette.primaryDark,
  accentLight: palette.accentLight,
};

const qb = StyleSheet.create({
  screen: { flex: 1, backgroundColor: qb_c.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: qb_c.border },
  topTitle: { fontSize: 20, fontWeight: '700', color: qb_c.text },

  compassSection: { alignItems: 'center', paddingVertical: 24 },
  compassOuter: {
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: qb_c.card,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    borderWidth: 2, borderColor: qb_c.border,
  },
  compassInner: {
    width: 210, height: 210, borderRadius: 105,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  cardinal: { position: 'absolute', fontSize: 12, fontWeight: '700', color: qb_c.muted },
  needle: { width: 4, height: 140, alignItems: 'center', justifyContent: 'center' },
  needleTop: { width: 4, height: 70, backgroundColor: qb_c.accent, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  needleBottom: { width: 4, height: 70, backgroundColor: 'rgba(0,0,0,0.15)', borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  compassCenter: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: qb_c.card, borderWidth: 2, borderColor: qb_c.accent, alignItems: 'center', justifyContent: 'center' },
  degreeText: { fontSize: 32, fontWeight: '800', color: qb_c.accent, marginTop: 16 },
  kaabaLabel: { fontSize: 13, color: qb_c.muted, fontWeight: '600', marginTop: 4 },
  liveLabel: { fontSize: 12, color: qb_c.accent, fontWeight: '600', marginTop: 8 },

  promptCard: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  promptText: { fontSize: 13, color: qb_c.muted, textAlign: 'center', maxWidth: 260 },
  mutedText: { fontSize: 13, color: qb_c.muted, textAlign: 'center' },

  card: { backgroundColor: qb_c.card, marginHorizontal: 16, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: qb_c.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: qb_c.text },

  coordRow: { flexDirection: 'row', gap: 10 },
  coordField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: qb_c.border },
  coordIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: qb_c.accentLight, alignItems: 'center', justifyContent: 'center' },
  coordLabel: { fontSize: 9, fontWeight: '700', color: qb_c.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  coordValue: { fontSize: 14, fontWeight: '600', color: qb_c.text },

  infoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: qb_c.accentLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  infoText: { fontSize: 12, color: qb_c.accent, fontWeight: '600' },

  refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: qb_c.accent, borderRadius: 12, paddingVertical: 14, gap: 8, marginTop: 14 },
  refreshBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  errorText: { color: '#C62828', fontSize: 13, marginTop: 8 },
});
