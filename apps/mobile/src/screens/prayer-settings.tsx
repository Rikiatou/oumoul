import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colors } from "@oumoul/ui";
import type { AuthUser, CalculationMethodOption, HighLatitudeRuleOption, MadhabOption } from "@oumoul/api";
import { CalculationMethodOption as CalculationMethodEnum, HighLatitudeRuleOption as HighLatitudeRuleEnum, MadhabOption as MadhabEnum } from "@oumoul/api";

type StoredPrayerSettings = {
  latitude: string;
  longitude: string;
  timeZone: string;
  method?: CalculationMethodOption;
  madhab?: MadhabOption;
  highLatitudeRule?: HighLatitudeRuleOption;
  fajrAdjustment?: number;
  dhuhrAdjustment?: number;
  asrAdjustment?: number;
  maghribAdjustment?: number;
  ishaAdjustment?: number;
};

const STORAGE_KEY = "oumoul.prayerSettings";

const DEFAULTS: StoredPrayerSettings = {
  latitude: "4.0511",
  longitude: "9.7679",
  timeZone: "Africa/Douala",
  method: CalculationMethodEnum.MuslimWorldLeague,
  madhab: MadhabEnum.Shafi,
  highLatitudeRule: HighLatitudeRuleEnum.MiddleOfTheNight,
  fajrAdjustment: 0,
  dhuhrAdjustment: 0,
  asrAdjustment: 0,
  maghribAdjustment: 0,
  ishaAdjustment: 0,
};

const METHOD_OPTIONS: Array<{ value: CalculationMethodOption; label: string }> = [
  { value: CalculationMethodEnum.MuslimWorldLeague, label: "MWL" },
  { value: CalculationMethodEnum.Egyptian, label: "Egyptian" },
  { value: CalculationMethodEnum.Karachi, label: "Karachi" },
  { value: CalculationMethodEnum.UmmAlQura, label: "Umm Al-Qura" },
  { value: CalculationMethodEnum.Dubai, label: "Dubai" },
  { value: CalculationMethodEnum.Kuwait, label: "Kuwait" },
  { value: CalculationMethodEnum.Qatar, label: "Qatar" },
  { value: CalculationMethodEnum.Singapore, label: "Singapore" },
  { value: CalculationMethodEnum.Turkey, label: "Turkey" },
  { value: CalculationMethodEnum.NorthAmerica, label: "North America" },
  { value: CalculationMethodEnum.Other, label: "Other" },
];

const MADHAB_OPTIONS: Array<{ value: MadhabOption; label: string }> = [
  { value: MadhabEnum.Shafi, label: "Shafi" },
  { value: MadhabEnum.Hanafi, label: "Hanafi" },
];

const HIGH_LAT_OPTIONS: Array<{ value: HighLatitudeRuleOption; label: string }> = [
  { value: HighLatitudeRuleEnum.MiddleOfTheNight, label: "Middle of the Night" },
  { value: HighLatitudeRuleEnum.SeventhOfTheNight, label: "1/7 of the Night" },
  { value: HighLatitudeRuleEnum.AngleBased, label: "Angle Based" },
];

function parseAdjustment(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? 0 : n;
}

function ChoiceRow<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View className="mt-lg">
      <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700" }}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-sm">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              className={`px-md py-sm rounded-md mr-sm border ${active ? "bg-neutral-100 border-transparent" : "border-white/40"}`}
              onPress={() => onChange(option.value)}
            >
              <Text style={{ color: active ? colors.primary : colors.neutral100, fontWeight: "700" }}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <View className="mt-lg">
      <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700" }}>{label}</Text>
      <TextInput
        className="w-full bg-white/10 text-neutral-100 rounded-lg px-md py-sm mt-sm"
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.6)"
        value={value}
        style={{ color: colors.neutral100 }}
        onChangeText={onChangeText}
      />
    </View>
  );
}

export function PrayerSettingsScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const [settings, setSettings] = useState<StoredPrayerSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => {
    const lat = Number.parseFloat(settings.latitude);
    const lng = Number.parseFloat(settings.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && Boolean(settings.timeZone.trim());
  }, [settings.latitude, settings.longitude, settings.timeZone]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredPrayerSettings>;
        setSettings({ ...DEFAULTS, ...parsed });
      } else {
        setSettings(DEFAULTS);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger les réglages.";
      setError(message);
      setSettings(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
      onBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d’enregistrer les réglages.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [canSave, onBack, settings]);

  const reset = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      setSettings(DEFAULTS);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de réinitialiser.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color={colors.neutral100} />
        <Text className="text-neutral-100 mt-sm">Chargement…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <ScrollView contentContainerStyle={{ paddingVertical: 32, paddingHorizontal: 20 }}>
        <View className="mb-xl">
          <Text className="text-neutral-100 text-xs tracking-[4px] uppercase">{user.firstName || user.email}</Text>
          <Text className="text-neutral-100 text-3xl font-bold mt-sm">Réglages prière</Text>
          <Text className="text-neutral-100/80 text-base leading-6 mt-xs">Méthode, madhab, ajustements, localisation.</Text>
        </View>

        {error ? <Text style={{ color: "#FFD6D6", marginBottom: 12 }}>{error}</Text> : null}

        <Field
          label="Latitude"
          value={settings.latitude}
          onChangeText={(v) => setSettings((prev) => ({ ...prev, latitude: v }))}
          placeholder="4.0511"
        />
        <Field
          label="Longitude"
          value={settings.longitude}
          onChangeText={(v) => setSettings((prev) => ({ ...prev, longitude: v }))}
          placeholder="9.7679"
        />
        <Field
          label="Time zone"
          value={settings.timeZone}
          onChangeText={(v) => setSettings((prev) => ({ ...prev, timeZone: v }))}
          placeholder="Africa/Douala"
        />

        <ChoiceRow
          title="Méthode"
          options={METHOD_OPTIONS}
          value={(settings.method ?? DEFAULTS.method) as CalculationMethodOption}
          onChange={(method) => setSettings((prev) => ({ ...prev, method }))}
        />

        <ChoiceRow
          title="Madhab (Asr)"
          options={MADHAB_OPTIONS}
          value={(settings.madhab ?? DEFAULTS.madhab) as MadhabOption}
          onChange={(madhab) => setSettings((prev) => ({ ...prev, madhab }))}
        />

        <ChoiceRow
          title="Règle hautes latitudes"
          options={HIGH_LAT_OPTIONS}
          value={(settings.highLatitudeRule ?? DEFAULTS.highLatitudeRule) as HighLatitudeRuleOption}
          onChange={(highLatitudeRule) => setSettings((prev) => ({ ...prev, highLatitudeRule }))}
        />

        <View className="mt-lg">
          <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700" }}>Ajustements (minutes)</Text>

          <Field
            label="Fajr"
            value={String(settings.fajrAdjustment ?? 0)}
            onChangeText={(v) => setSettings((prev) => ({ ...prev, fajrAdjustment: parseAdjustment(v) }))}
            placeholder="0"
          />
          <Field
            label="Dhuhr"
            value={String(settings.dhuhrAdjustment ?? 0)}
            onChangeText={(v) => setSettings((prev) => ({ ...prev, dhuhrAdjustment: parseAdjustment(v) }))}
            placeholder="0"
          />
          <Field
            label="Asr"
            value={String(settings.asrAdjustment ?? 0)}
            onChangeText={(v) => setSettings((prev) => ({ ...prev, asrAdjustment: parseAdjustment(v) }))}
            placeholder="0"
          />
          <Field
            label="Maghrib"
            value={String(settings.maghribAdjustment ?? 0)}
            onChangeText={(v) => setSettings((prev) => ({ ...prev, maghribAdjustment: parseAdjustment(v) }))}
            placeholder="0"
          />
          <Field
            label="Isha"
            value={String(settings.ishaAdjustment ?? 0)}
            onChangeText={(v) => setSettings((prev) => ({ ...prev, ishaAdjustment: parseAdjustment(v) }))}
            placeholder="0"
          />
        </View>

        <View className="mt-2xl flex-row" style={{ gap: 12 }}>
          <TouchableOpacity
            className="flex-1 bg-white/10 rounded-lg py-sm items-center"
            disabled={saving}
            onPress={() => void reset()}
          >
            <Text style={{ color: colors.neutral100, fontWeight: "700" }}>{saving ? "…" : "Réinitialiser"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-neutral-100 rounded-lg py-sm items-center"
            disabled={saving || !canSave}
            onPress={() => void save()}
          >
            <Text style={{ color: colors.primary, fontWeight: "800" }}>{saving ? "Enregistrement…" : "Enregistrer"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="mt-lg self-center" onPress={onBack} disabled={saving}>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700", textDecorationLine: "underline" }}>
            Retour
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

export const prayerSettingsStorage = {
  key: STORAGE_KEY,
  defaults: DEFAULTS,
} as const;
