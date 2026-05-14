import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import type { AuthUser, CalculationMethodOption, HighLatitudeRuleOption, MadhabOption } from "@oumoul/api";
import { CalculationMethodOption as CalculationMethodEnum, HighLatitudeRuleOption as HighLatitudeRuleEnum, MadhabOption as MadhabEnum } from "@oumoul/api";
import { useLocationContext } from "../context/location-context";
import { useTheme } from "../context/theme-context";
import { setupDailyReminders, cancelDailyReminders } from "../notifications/daily-reminders";
import { scheduleAdhanReminder, cancelReminder, syncPushTokenWithBackend } from "../push-notifications";
import * as Notifications from "expo-notifications";

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

const PRAYER_NAMES = [
  { key: 'fajrAdjustment' as const, label: 'Fajr', icon: 'sunny-outline' },
  { key: 'dhuhrAdjustment' as const, label: 'Dhuhr', icon: 'sunny' },
  { key: 'asrAdjustment' as const, label: 'Asr', icon: 'partly-sunny-outline' },
  { key: 'maghribAdjustment' as const, label: 'Maghrib', icon: 'cloudy-night-outline' },
  { key: 'ishaAdjustment' as const, label: 'Isha', icon: 'moon-outline' },
];

function _parseAdjustment(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? 0 : n;
}

function ProChoiceRow<T extends string>({
  title,
  icon,
  options,
  value,
  onChange,
}: {
  title: string;
  icon: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Ionicons name={icon as any} size={16} color={palette.primaryDark} />
        <Text style={[ps.fieldLabel, { color: palette.muted }]}>{title}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[ps.choiceChip, { borderColor: palette.border }, active && { backgroundColor: palette.primaryDark, borderColor: palette.primaryDark }]}
                onPress={() => onChange(option.value)}
              >
                <Text style={[ps.choiceChipText, { color: palette.text }, active && ps.choiceChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function _ProField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  icon: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
}) {
  const { palette } = useTheme();
  return (
    <View style={ps.fieldRow}>
      <View style={[ps.fieldIconWrap, { backgroundColor: palette.accentLight }]}>
        <Ionicons name={icon as any} size={16} color={palette.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ps.fieldSmallLabel, { color: palette.muted }]}>{label}</Text>
        <TextInput
          style={[ps.fieldInput, { color: palette.text, borderColor: palette.border }]}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

const ADHAN_STORAGE_KEY = 'oumoul.localReminders';

const ADHAN_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
type AdhanPrayer = typeof ADHAN_PRAYERS[number];

const ADHAN_ICONS: Record<AdhanPrayer, string> = {
  Fajr: 'sunny-outline',
  Dhuhr: 'sunny',
  Asr: 'partly-sunny-outline',
  Maghrib: 'cloudy-night-outline',
  Isha: 'moon-outline',
};

export function PrayerSettingsScreen({ user: _user, onBack }: { user: AuthUser; onBack: () => void }) {
  const { palette } = useTheme();
  const ps_c = {
    bg: palette.bgAlt,
    card: palette.card,
    border: palette.border,
    text: palette.text,
    textSoft: palette.textSoft,
    muted: palette.muted,
    accent: palette.primaryDark,
    accentLight: palette.accentLight,
  };
  const { location: detectedLoc, loading: locLoading } = useLocationContext();
  const [settings, setSettings] = useState<StoredPrayerSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpsApplied, setGpsApplied] = useState(false);
  const [dailyNotifications, setDailyNotifications] = useState(false);
  const [adhanEnabled, setAdhanEnabled] = useState<Record<AdhanPrayer, boolean>>({ Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false });
  const [adhanLoading, setAdhanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill from GPS if no saved settings exist
  useEffect(() => {
    if (locLoading || gpsApplied) return;
    if (detectedLoc.latitude && detectedLoc.longitude) {
      setSettings((prev) => {
        // Only auto-fill if still on defaults
        if (prev.latitude === DEFAULTS.latitude && prev.longitude === DEFAULTS.longitude) {
          return {
            ...prev,
            latitude: String(detectedLoc.latitude),
            longitude: String(detectedLoc.longitude),
            timeZone: detectedLoc.timeZone ?? prev.timeZone,
          };
        }
        return prev;
      });
      setGpsApplied(true);
    }
  }, [detectedLoc, locLoading, gpsApplied]);

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

  // Load persisted adhan toggles
  useEffect(() => {
    SecureStore.getItemAsync(ADHAN_STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, boolean>;
          setAdhanEnabled((prev) => ({
            ...prev,
            Fajr: parsed.AdhanFajr ?? prev.Fajr,
            Dhuhr: parsed.AdhanDhuhr ?? prev.Dhuhr,
            Asr: parsed.AdhanAsr ?? prev.Asr,
            Maghrib: parsed.AdhanMaghrib ?? prev.Maghrib,
            Isha: parsed.AdhanIsha ?? prev.Isha,
          }));
        } catch { /* ignore */ }
      }
    }).catch(() => {});
  }, []);

  const toggleAdhan = useCallback(async (prayer: AdhanPrayer) => {
    const id = `adhan-${prayer}`;
    const isEnabled = adhanEnabled[prayer];
    setAdhanLoading(true);
    try {
      if (isEnabled) {
        await cancelReminder(id);
      } else {
        const synced = await syncPushTokenWithBackend();
        if (!synced) {
          setError('Active les notifications dans les réglages système.');
          return;
        }
        // Use saved prayer times if available — otherwise schedule at a placeholder time
        // The actual time will be rescheduled when the dashboard loads prayer times
        await scheduleAdhanReminder(prayer, 0, 0);
      }
      setAdhanEnabled((prev) => {
        const next = { ...prev, [prayer]: !isEnabled };
        const stored: Record<string, boolean> = {
          AdhanFajr: next.Fajr,
          AdhanDhuhr: next.Dhuhr,
          AdhanAsr: next.Asr,
          AdhanMaghrib: next.Maghrib,
          AdhanIsha: next.Isha,
        };
        SecureStore.setItemAsync(ADHAN_STORAGE_KEY, JSON.stringify(stored)).catch(() => {});
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur notification');
    } finally {
      setAdhanLoading(false);
    }
  }, [adhanEnabled]);

  const save = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
      onBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d'enregistrer les réglages.";
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

  const toggleDailyNotifications = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          setError("Permission de notification refusée");
          return;
        }
      }

      if (dailyNotifications) {
        await cancelDailyReminders();
        setDailyNotifications(false);
      } else {
        await setupDailyReminders();
        setDailyNotifications(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur de notification";
      setError(message);
    }
  }, [dailyNotifications]);

  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={[ps.screen, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={ps_c.accent} />
        <Text style={[ps.mutedText, { marginTop: 8 }]}>Chargement…</Text>
      </View>
    );
  }

  return (
    <View style={[ps.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={ps.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={ps_c.accent} />
        </TouchableOpacity>
        <Text style={ps.topTitle}>Réglages prière</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={ps.heroCard}>
          <Ionicons name="compass-outline" size={24} color={ps_c.accent} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={ps.heroTitle}>Configuration</Text>
            <Text style={ps.heroSub}>Méthode, madhab, ajustements et localisation</Text>
          </View>
        </View>

        {error && <Text style={ps.errorText}>{error}</Text>}

        {/* Location card — auto-detected, read-only */}
        <View style={ps.card}>
          <View style={ps.cardHeader}>
            <Ionicons name="location-outline" size={18} color={ps_c.accent} />
            <Text style={ps.sectionTitle}>Localisation</Text>
          </View>
          <View style={{ backgroundColor: "rgba(26,127,100,0.08)", borderRadius: 12, padding: 14, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="navigate" size={16} color={ps_c.accent} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: ps_c.text, flex: 1 }}>
                {locLoading ? "Détection GPS…" : (detectedLoc.city && detectedLoc.country ? `${detectedLoc.city}, ${detectedLoc.country}` : "Position GPS détectée")}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: "600", color: ps_c.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Latitude</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: ps_c.text }}>{settings.latitude}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: "600", color: ps_c.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Longitude</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: ps_c.text }}>{settings.longitude}</Text>
              </View>
            </View>
            <View>
              <Text style={{ fontSize: 10, fontWeight: "600", color: ps_c.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Fuseau horaire</Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: ps_c.text }}>{settings.timeZone}</Text>
            </View>
          </View>
        </View>

        {/* Method card */}
        <View style={ps.card}>
          <View style={ps.cardHeader}>
            <Ionicons name="calculator-outline" size={18} color={ps_c.accent} />
            <Text style={ps.sectionTitle}>Méthode de calcul</Text>
          </View>
          <ProChoiceRow
            title="Méthode"
            icon="globe-outline"
            options={METHOD_OPTIONS}
            value={(settings.method ?? DEFAULTS.method) as CalculationMethodOption}
            onChange={(method) => setSettings((prev) => ({ ...prev, method }))}
          />
          <ProChoiceRow
            title="Madhab (Asr)"
            icon="book-outline"
            options={MADHAB_OPTIONS}
            value={(settings.madhab ?? DEFAULTS.madhab) as MadhabOption}
            onChange={(madhab) => setSettings((prev) => ({ ...prev, madhab }))}
          />
          <ProChoiceRow
            title="Règle hautes latitudes"
            icon="earth-outline"
            options={HIGH_LAT_OPTIONS}
            value={(settings.highLatitudeRule ?? DEFAULTS.highLatitudeRule) as HighLatitudeRuleOption}
            onChange={(highLatitudeRule) => setSettings((prev) => ({ ...prev, highLatitudeRule }))}
          />
        </View>

        {/* Adjustments card */}
        <View style={ps.card}>
          <View style={ps.cardHeader}>
            <Ionicons name="options-outline" size={18} color={ps_c.accent} />
            <Text style={ps.sectionTitle}>Ajustements (minutes)</Text>
          </View>
          {PRAYER_NAMES.map((prayer) => (
            <View key={prayer.key} style={ps.adjustRow}>
              <View style={ps.adjustIconWrap}>
                <Ionicons name={prayer.icon as any} size={16} color={ps_c.accent} />
              </View>
              <Text style={ps.adjustLabel}>{prayer.label}</Text>
              <View style={ps.adjustControls}>
                <TouchableOpacity
                  style={ps.adjustBtn}
                  onPress={() => setSettings((prev) => ({ ...prev, [prayer.key]: (prev[prayer.key] ?? 0) - 1 }))}
                >
                  <Ionicons name="remove" size={16} color={ps_c.accent} />
                </TouchableOpacity>
                <Text style={ps.adjustValue}>{settings[prayer.key] ?? 0}</Text>
                <TouchableOpacity
                  style={ps.adjustBtn}
                  onPress={() => setSettings((prev) => ({ ...prev, [prayer.key]: (prev[prayer.key] ?? 0) + 1 }))}
                >
                  <Ionicons name="add" size={16} color={ps_c.accent} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Adhan notifications card */}
        <View style={ps.card}>
          <View style={ps.cardHeader}>
            <Ionicons name="notifications-outline" size={18} color={ps_c.accent} />
            <Text style={ps.sectionTitle}>Notifications Adhan</Text>
          </View>
          <Text style={{ fontSize: 12, color: ps_c.muted, marginBottom: 12, lineHeight: 17 }}>
            Active les rappels pour chaque prière. Les horaires sont mis à jour automatiquement selon ta localisation.
          </Text>
          {adhanLoading && <ActivityIndicator size="small" color={ps_c.accent} style={{ marginBottom: 8 }} />}
          {ADHAN_PRAYERS.map((prayer) => (
            <View key={prayer} style={ps.adhanRow}>
              <View style={ps.adhanIconWrap}>
                <Ionicons name={ADHAN_ICONS[prayer] as any} size={16} color={ps_c.accent} />
              </View>
              <Text style={ps.adhanLabel}>{prayer}</Text>
              <Switch
                value={adhanEnabled[prayer]}
                onValueChange={() => void toggleAdhan(prayer)}
                trackColor={{ true: ps_c.accent, false: 'rgba(0,0,0,0.1)' }}
                thumbColor={adhanEnabled[prayer] ? ps_c.accent : '#ccc'}
                disabled={adhanLoading}
              />
            </View>
          ))}
        </View>

        {/* Daily reminders card */}
        <View style={ps.card}>
          <View style={ps.cardHeader}>
            <Ionicons name="sparkles-outline" size={18} color={ps_c.accent} />
            <Text style={ps.sectionTitle}>Rappels spirituels</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: ps_c.text }}>Hadith, dhikr, Coran, douas</Text>
              <Text style={{ fontSize: 12, color: ps_c.muted, marginTop: 2 }}>Notifications quotidiennes automatiques</Text>
            </View>
            <TouchableOpacity
              style={[
                { width: 48, height: 28, borderRadius: 14, backgroundColor: dailyNotifications ? ps_c.accent : ps_c.border },
                { justifyContent: 'center', alignItems: 'center' }
              ]}
              onPress={toggleDailyNotifications}
            >
              <View
                style={[
                  { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
                  dailyNotifications ? { alignSelf: 'flex-end', marginRight: 2 } : { alignSelf: 'flex-start', marginLeft: 2 }
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 8 }}>
          <TouchableOpacity
            style={ps.resetBtn}
            disabled={saving}
            onPress={() => void reset()}
          >
            <Ionicons name="refresh-outline" size={18} color={ps_c.text} />
            <Text style={ps.resetBtnText}>{saving ? '…' : 'Réinitialiser'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[ps.saveBtn, (saving || !canSave) && { opacity: 0.5 }]}
            disabled={saving || !canSave}
            onPress={() => void save()}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={ps.saveBtnText}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Text>
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

const ps = StyleSheet.create({
  screen: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topTitle: { fontSize: 20, fontWeight: '700' },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
  },
  heroTitle: { fontSize: 16, fontWeight: '700' },
  heroSub: { fontSize: 12, marginTop: 2 },

  errorText: { color: '#C62828', fontSize: 13, paddingHorizontal: 16, marginTop: 8 },
  mutedText: { fontSize: 13 },

  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  fieldLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  fieldIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldSmallLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  fieldInput: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
  },

  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
  },
  choiceChipActive: {},
  choiceChipText: { fontSize: 12, fontWeight: '600' },
  choiceChipTextActive: { color: '#fff' },

  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  adjustIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  adjustControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adjustBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustValue: { fontSize: 16, fontWeight: '700', minWidth: 28, textAlign: 'center' },

  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  resetBtnText: { fontWeight: '600', fontSize: 14 },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  adhanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  adhanIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adhanLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
});
