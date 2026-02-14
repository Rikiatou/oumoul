import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { colors } from "@oumoul/ui";
import type { AuthUser, CalculationMethodOption, HighLatitudeRuleOption, MadhabOption } from "@oumoul/api";
import { CalculationMethodOption as CalculationMethodEnum, HighLatitudeRuleOption as HighLatitudeRuleEnum, MadhabOption as MadhabEnum } from "@oumoul/api";
import { sc, ss } from "../ui/theme";

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
    <View style={{ marginTop: 14 }}>
      <Text style={ss.label}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[ss.chip, { marginRight: 6 }, active && ss.chipActive]}
              onPress={() => onChange(option.value)}
            >
              <Text style={[ss.chipText, active && ss.chipTextActive]}>{option.label}</Text>
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
    <View style={{ marginTop: 12 }}>
      <Text style={ss.label}>{label}</Text>
      <TextInput
        style={[ss.input, { marginTop: 4 }]}
        placeholder={placeholder}
        placeholderTextColor={sc.muted}
        value={value}
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

  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={[ss.screen, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={sc.accent} />
        <Text style={[ss.muted, { marginTop: 8 }]}>Chargement…</Text>
      </View>
    );
  }

  return (
    <View style={[ss.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={ss.mb20}>
          <TouchableOpacity onPress={onBack} style={[ss.row, ss.gap4, ss.mb12]}>
            <Ionicons name="chevron-back" size={20} color={sc.accent} />
            <Text style={{ color: sc.accent, fontWeight: '600', fontSize: 14 }}>Retour</Text>
          </TouchableOpacity>
          <Text style={ss.title}>Réglages prière</Text>
          <Text style={ss.subtitle}>Méthode, madhab, ajustements, localisation.</Text>
        </View>

        {error ? <Text style={[ss.errorText, ss.mb8]}>{error}</Text> : null}

        {/* Location card */}
        <View style={ss.card}>
          <Text style={ss.sectionTitle}>Localisation</Text>
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
        </View>

        {/* Method card */}
        <View style={ss.card}>
          <Text style={ss.sectionTitle}>Méthode de calcul</Text>
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
        </View>

        {/* Adjustments card */}
        <View style={ss.card}>
          <Text style={ss.sectionTitle}>Ajustements (minutes)</Text>
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

        {/* Action buttons */}
        <View style={[ss.row, { gap: 12, marginTop: 20 }]}>
          <TouchableOpacity
            style={[ss.outlineBtn, { flex: 1, alignItems: 'center', paddingVertical: 12 }]}
            disabled={saving}
            onPress={() => void reset()}
          >
            <Text style={ss.outlineBtnText}>{saving ? '…' : 'Réinitialiser'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[ss.primaryBtn, { flex: 1 }, (saving || !canSave) && { opacity: 0.5 }]}
            disabled={saving || !canSave}
            onPress={() => void save()}
          >
            <Text style={ss.primaryBtnText}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export const prayerSettingsStorage = {
  key: STORAGE_KEY,
  defaults: DEFAULTS,
} as const;
