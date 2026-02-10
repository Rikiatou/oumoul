import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { colors } from "@oumoul/ui";
import { apiRoutes } from "@oumoul/config";
import type { AuthUser } from "@oumoul/api";
import { httpClient } from "../api";
import { t, Locale } from "../i18n";

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

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <ScrollView contentContainerStyle={{ paddingVertical: 32, paddingHorizontal: 20 }}>
        <View className="mb-xl">
          <Text className="text-neutral-100 text-xs tracking-[4px] uppercase">{user.firstName || user.email}</Text>
          <Text className="text-neutral-100 text-3xl font-bold mt-sm">{t(locale, "qibla.title", "Qibla")}</Text>
          <Text className="text-neutral-100/80 text-base leading-6 mt-xs">
            {t(locale, "qibla.subtitle", "Trouve ta direction et vérifie l’azimut.")}
          </Text>
          <TouchableOpacity className="self-start mt-md border border-white/60 rounded-md px-md py-xs" onPress={onBack}>
            <Text style={{ color: colors.neutral100, fontWeight: "600" }}>
              {t(locale, "common.back.dashboard", "Retour au tableau de bord")}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl gap-sm">
          <Text className="text-neutral-100/80 text-sm">
            {t(locale, "qibla.position", "Position")}
          </Text>
          <TextInput
            className="bg-white/10 text-neutral-100 rounded-lg px-md py-sm"
            placeholder="Latitude"
            placeholderTextColor="rgba(255,255,255,0.6)"
            keyboardType="decimal-pad"
            value={coords.lat}
            onChangeText={(value) => setCoords((prev) => ({ ...prev, lat: value }))}
          />
          <TextInput
            className="bg-white/10 text-neutral-100 rounded-lg px-md py-sm"
            placeholder="Longitude"
            placeholderTextColor="rgba(255,255,255,0.6)"
            keyboardType="decimal-pad"
            value={coords.lng}
            onChangeText={(value) => setCoords((prev) => ({ ...prev, lng: value }))}
          />
          <Text className="text-neutral-100/60 text-xs">{info}</Text>
          <TouchableOpacity
            className="bg-neutral-100 rounded-lg py-sm items-center"
            disabled={loading}
            onPress={() => void fetchQibla()}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              {loading ? t(locale, "qibla.button.calculating", "Calcul…") : t(locale, "qibla.button.refresh", "Actualiser")}
            </Text>
          </TouchableOpacity>
          {error && <Text className="text-[#ffb4ab]">{error}</Text>}
        </View>

        <View className="items-center gap-sm">
          {direction !== null ? (
            <>
              <Text className="text-neutral-100/80">Direction: {direction.toFixed(1)}°</Text>
              <View
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: 110,
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                }}
              >
                <View
                  style={{
                    width: 4,
                    height: 80,
                    backgroundColor: colors.neutral100,
                    transform: [{ rotate: `${rotation}deg` }],
                    borderRadius: 4,
                  }}
                />
                <Text className="text-neutral-100 mt-sm">Kaaba</Text>
              </View>
            </>
          ) : loading ? (
            <ActivityIndicator color={colors.neutral100} />
          ) : (
            <Text className="text-neutral-100/70">{t(locale, "qibla.prompt", "Saisis ou autorise ta position pour calculer la Qibla.")}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
