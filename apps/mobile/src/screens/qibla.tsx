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
import { useTheme } from "../context/theme-context";
import { BackButton } from "../components/BackButton";
import { HelpTip } from "../components/HelpTip";

export function QiblaScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const locale = (user.locale as Locale | undefined) ?? "fr";
  const { palette } = useTheme();
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
    <View style={[qb.screen, { paddingTop: insets.top, backgroundColor: qb_c.bg }]}>
      {/* Top bar */}
      <View style={[qb.topBar, { borderBottomColor: qb_c.border }]}>
        <BackButton onPress={onBack} />
        <Text style={[qb.topTitle, { color: qb_c.text }]}>{t(locale, "qibla.title", "Qibla")}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <HelpTip screenName="Qibla" tips={[
            { icon: 'compass', title: 'Boussole en temps réel', description: 'Tiens ton téléphone à plat pour voir la flèche verte pointer vers la Kaaba.' },
            { icon: 'location', title: 'Position GPS', description: 'La direction est calculée automatiquement selon ta position.' },
            { icon: 'refresh', title: 'Actualiser', description: 'Appuie sur Actualiser pour recalculer la direction si tu t\'es déplacé.' },
          ]} />
          <Ionicons name="compass-outline" size={20} color={qb_c.muted} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Compass display */}
        <View style={qb.compassSection}>
          {direction !== null ? (
            <>
              {/* Instructions */}
              <View style={[qb.instructionCard, { backgroundColor: qb_c.accentLight }]}>
                <Text style={[qb.instructionText, { color: qb_c.accent }]}>
                  {magnetometerAvailable
                    ? '📱 Tiens ton téléphone à plat, horizontalement. La flèche verte pointe vers la Kaaba.'
                    : '📐 Oriente-toi à ' + direction.toFixed(0) + '° depuis le Nord pour faire face à la Kaaba.'}
                </Text>
              </View>

              <View style={[qb.compassOuter, { backgroundColor: qb_c.card, borderColor: qb_c.accent }]}>
                <View style={qb.compassInner}>
                  {/* Cardinal labels */}
                  <Text style={[qb.cardinal, { top: 8, color: '#C62828', fontWeight: '900' }]}>N</Text>
                  <Text style={[qb.cardinal, { bottom: 8, color: qb_c.muted }]}>S</Text>
                  <Text style={[qb.cardinal, { left: 8, top: '45%', color: qb_c.muted }]}>O</Text>
                  <Text style={[qb.cardinal, { right: 8, top: '45%', color: qb_c.muted }]}>E</Text>
                  {/* Qibla needle — green tip points to Kaaba */}
                  {magnetometerAvailable ? (
                    <Animated.View style={[qb.needle, { transform: [{ rotate: compassRotation }] }]}>
                      <View style={[qb.needleTop, { backgroundColor: '#15803d' }]} />
                      <View style={[qb.needleBottom, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />
                    </Animated.View>
                  ) : (
                    <View style={[qb.needle, { transform: [{ rotate: `${staticRotation}deg` }] }]}>
                      <View style={[qb.needleTop, { backgroundColor: '#15803d' }]} />
                      <View style={[qb.needleBottom, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />
                    </View>
                  )}
                  {/* Kaaba at center */}
                  <View style={[qb.compassCenter, { backgroundColor: '#15803d', borderColor: '#15803d' }]}>
                    <Text style={{ fontSize: 14 }}>🕋</Text>
                  </View>
                </View>
              </View>

              <View style={qb.directionRow}>
                <View style={[qb.directionBadge, { backgroundColor: qb_c.accentLight }]}>
                  <Text style={[qb.degreeText, { color: qb_c.accent }]}>{direction.toFixed(1)}°</Text>
                  <Text style={[qb.kaabaLabel, { color: qb_c.accent }]}>vers la Kaaba</Text>
                </View>
              </View>

              {magnetometerAvailable ? (
                <View style={[qb.statusBadge, { backgroundColor: '#dcfce7' }]}>
                  <Text style={{ fontSize: 12 }}>🧭</Text>
                  <Text style={[qb.liveLabel, { color: '#15803d' }]}>Boussole active — direction en temps réel</Text>
                </View>
              ) : (
                <View style={[qb.statusBadge, { backgroundColor: '#fff3e0' }]}>
                  <Text style={{ fontSize: 12 }}>⚠️</Text>
                  <Text style={[qb.liveLabel, { color: '#E65100' }]}>Boussole non disponible — direction statique</Text>
                </View>
              )}
            </>
          ) : loading ? (
            <View style={{ paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={qb_c.accent} />
              <Text style={[qb.mutedText, { marginTop: 8, color: qb_c.muted }]}>{t(locale, "qibla.button.calculating", "Calcul…")}</Text>
            </View>
          ) : (
            <View style={qb.promptCard}>
              <Ionicons name="compass-outline" size={32} color={qb_c.muted} />
              <Text style={[qb.promptText, { color: qb_c.muted }]}>{t(locale, "qibla.prompt", "Saisis ou autorise ta position pour calculer la Qibla.")}</Text>
            </View>
          )}
        </View>

        {/* Location card */}
        <View style={[qb.card, { backgroundColor: qb_c.card, borderColor: qb_c.border }]}>
          <View style={qb.cardHeader}>
            <Ionicons name="location-outline" size={18} color={qb_c.accent} />
            <Text style={[qb.sectionTitle, { color: qb_c.text }]}>{t(locale, "qibla.position", "Position")}</Text>
          </View>

          <View style={[qb.infoBadge, { backgroundColor: qb_c.accentLight }]}>
            <Ionicons name="navigate-outline" size={14} color={qb_c.accent} />
            <Text style={qb.infoText}>{locLoading ? 'Détection GPS…' : locationLabel}</Text>
          </View>

          <View style={qb.coordRow}>
            <View style={qb.coordField}>
              <View style={qb.coordIconWrap}>
                <Ionicons name="navigate-outline" size={14} color={qb_c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[qb.coordLabel, { color: qb_c.muted }]}>Latitude</Text>
                <Text style={[qb.coordValue, { color: qb_c.text }]}>{detectedLoc.latitude.toFixed(4)}</Text>
              </View>
            </View>
            <View style={qb.coordField}>
              <View style={qb.coordIconWrap}>
                <Ionicons name="navigate-outline" size={14} color={qb_c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[qb.coordLabel, { color: qb_c.muted }]}>Longitude</Text>
                <Text style={[qb.coordValue, { color: qb_c.text }]}>{detectedLoc.longitude.toFixed(4)}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={[qb.refreshBtn, { backgroundColor: qb_c.accent }, (loading || locLoading) && { opacity: 0.5 }]} disabled={loading || locLoading} onPress={() => void handleRefresh()}>
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

const qb = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  topTitle: { fontSize: 20, fontWeight: '700' },

  compassSection: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  instructionCard: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, width: '100%' },
  instructionText: { fontSize: 13, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  directionRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  directionBadge: { borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginTop: 12 },
  compassOuter: {
    width: 240, height: 240, borderRadius: 120,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    borderWidth: 2,
  },
  compassInner: {
    width: 210, height: 210, borderRadius: 105,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  cardinal: { position: 'absolute', fontSize: 12, fontWeight: '700' },
  needle: { width: 6, height: 150, alignItems: 'center', justifyContent: 'center' },
  needleTop: { width: 6, height: 75, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  needleBottom: { width: 6, height: 75, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  compassCenter: { position: 'absolute', width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  degreeText: { fontSize: 28, fontWeight: '800' },
  kaabaLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  liveLabel: { fontSize: 12, fontWeight: '600' },

  promptCard: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  promptText: { fontSize: 13, textAlign: 'center', maxWidth: 260 },
  mutedText: { fontSize: 13, textAlign: 'center' },

  card: { marginHorizontal: 16, borderRadius: 16, padding: 18, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  coordRow: { flexDirection: 'row', gap: 10 },
  coordField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1 },
  coordIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  coordLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  coordValue: { fontSize: 14, fontWeight: '600' },

  infoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  infoText: { fontSize: 12, fontWeight: '600' },

  refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, gap: 8, marginTop: 14 },
  refreshBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  errorText: { color: '#C62828', fontSize: 13, marginTop: 8 },
});
