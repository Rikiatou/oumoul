import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from "@oumoul/ui";
import { apiRoutes } from "@oumoul/config";
import type { AuthUser } from "@oumoul/api";
import { httpClient } from "../api";
import { t, Locale } from "../i18n";
import { sc, ss } from '../ui/theme';

const FALLBACK = { lat: 4.0511, lng: 9.7679 };

export function QiblaScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const locale = (user.locale as Locale | undefined) ?? "fr";
  const [coords, setCoords] = useState<{ lat: string; lng: string }>({
    lat: String(FALLBACK.lat),
    lng: String(FALLBACK.lng),
  });
  const [direction, setDirection] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string>(t(locale, "qibla.fallback", "Douala (fallback)"));

  const numericCoords = useMemo(() => ({
    lat: Number.parseFloat(coords.lat),
    lng: Number.parseFloat(coords.lng),
  }), [coords]);

  const fetchQibla = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set('latitude', String(numericCoords.lat));
      query.set('longitude', String(numericCoords.lng));
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
  };

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      void fetchQibla();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) });
        setInfo(t(locale, "qibla.loc.detected", "Localisation détectée"));
      },
      () => {
        setInfo(t(locale, "qibla.fallback", "Douala (fallback)"));
        void fetchQibla();
      },
      { maximumAge: 60000, timeout: 7000 },
    );
  }, []);

  useEffect(() => {
    if (Number.isFinite(numericCoords.lat) && Number.isFinite(numericCoords.lng)) {
      void fetchQibla();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericCoords.lat, numericCoords.lng]);

  const rotation = direction ?? 0;

  const insets = useSafeAreaInsets();

  return (
    <View style={[ss.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={ss.mb20}>
          <TouchableOpacity onPress={onBack} style={[ss.row, ss.gap4, ss.mb12]}>
            <Ionicons name="chevron-back" size={20} color={sc.accent} />
            <Text style={{ color: sc.accent, fontWeight: '600', fontSize: 14 }}>{t(locale, "common.back.dashboard", "Retour")}</Text>
          </TouchableOpacity>
          <Text style={ss.title}>{t(locale, "qibla.title", "Qibla")}</Text>
          <Text style={ss.subtitle}>{t(locale, "qibla.subtitle", "Trouve ta direction et vérifie l'azimut.")}</Text>
        </View>

        {/* Position card */}
        <View style={ss.card}>
          <Text style={ss.sectionTitle}>{t(locale, "qibla.position", "Position")}</Text>
          <TextInput
            style={ss.input}
            placeholder="Latitude"
            placeholderTextColor={sc.muted}
            keyboardType="decimal-pad"
            value={coords.lat}
            onChangeText={(value) => setCoords((prev) => ({ ...prev, lat: value }))}
          />
          <TextInput
            style={ss.input}
            placeholder="Longitude"
            placeholderTextColor={sc.muted}
            keyboardType="decimal-pad"
            value={coords.lng}
            onChangeText={(value) => setCoords((prev) => ({ ...prev, lng: value }))}
          />
          <Text style={{ color: sc.muted, fontSize: 12 }}>{info}</Text>
          <TouchableOpacity style={[ss.primaryBtn, loading && { opacity: 0.5 }]} disabled={loading} onPress={() => void fetchQibla()}>
            <Text style={ss.primaryBtnText}>
              {loading ? t(locale, "qibla.button.calculating", "Calcul…") : t(locale, "qibla.button.refresh", "Actualiser")}
            </Text>
          </TouchableOpacity>
          {error && <Text style={ss.errorText}>{error}</Text>}
        </View>

        {/* Direction display */}
        <View style={{ alignItems: 'center', gap: 12, marginTop: 8 }}>
          {direction !== null ? (
            <>
              <Text style={[ss.label, { fontSize: 13 }]}>Direction : {direction.toFixed(1)}°</Text>
              <View style={{
                width: 220, height: 220, borderRadius: 110,
                borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)',
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#fff',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
              }}>
                <View style={{
                  width: 4, height: 80,
                  backgroundColor: sc.accent,
                  transform: [{ rotate: `${rotation}deg` }],
                  borderRadius: 4,
                }} />
                <Ionicons name="locate" size={18} color={sc.accent} style={{ marginTop: 8 }} />
                <Text style={{ color: sc.text, fontWeight: '700', fontSize: 13, marginTop: 4 }}>Kaaba</Text>
              </View>
            </>
          ) : loading ? (
            <ActivityIndicator color={sc.accent} />
          ) : (
            <Text style={ss.muted}>{t(locale, "qibla.prompt", "Saisis ou autorise ta position pour calculer la Qibla.")}</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
