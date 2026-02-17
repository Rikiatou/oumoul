import { useMemo, useCallback, useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  AppState,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import {
  FastingLogStatus,
  RamadanDaySummary,
  RamadanSummaryResponse,
  AuthUser,
  FastingLog,
  FastingSummary,
  MakeupPlan,
  MakeupPlanEntry,
  MakeupStrategy,
  PlanEntryStatus,
  PrayerTimesRequest,
  PrayerTimesResponse,
  ReminderPreference,
  ReminderPreferenceListItem,
  DhikrCategory,
  DhikrRecord,
  ReminderType,
  CalculationMethodOption,
  MadhabOption,
  HighLatitudeRuleOption,
} from "@oumoul/api";
import { ramadanApi, prayerApi, fastingApi, remindersApi, dhikrApi } from "../api";
import { useAuth } from "../context/auth-context";
import {
  cancelReminder,
  scheduleAdhanReminder,
  scheduleDhikrMorningReminder,
  scheduleDhikrEveningReminder,
  scheduleIftarReminder,
  scheduleSuhoorReminder,
  scheduleJumuahReminder,
  syncPushTokenWithBackend,
} from "../push-notifications";
import * as SecureStore from "expo-secure-store";
import { offlineCache, CACHE_KEYS, CACHE_TTL } from "../utils/offline-cache";
import { t, Locale } from "../i18n";
import { useLocationContext } from "../context/location-context";
import { prayerSettingsStorage } from "./prayer-settings";
import { Skeleton, SkeletonCard } from "../ui/skeleton";
import { getTodayInspiration } from "../data/daily-inspiration";
import { palette } from "../theme";
import { getRamadanInfo, getCurrentHijriDate } from "../utils/hijri-calendar";
import { Header } from "./dashboard/Header";
import { NextPrayerCard } from "./dashboard/NextPrayerCard";
import { DailyInspirationCard } from "./dashboard/DailyInspirationCard";
import { RamadanBanner } from "./dashboard/RamadanBanner";
import { StatsRow } from "./dashboard/StatsRow";
import { LocalRemindersSection } from "./dashboard/LocalRemindersSection";
import { StreakCard } from "./dashboard/StreakCard";

const DEFAULT_COORDS = {
  latitude: "4.0511",
  longitude: "9.7679",
  timeZone: "Africa/Douala",
};

const REMINDER_LABELS: Record<ReminderType, string> = {
  AfterEid: "6 jours après l’Aïd",
  WeeklyMonday: "Rappel du lundi (jeûne, programme…)",
  WeeklyThursday: "Rappel du jeudi (jeûne, programme…)",
  Monthly: "Rappel mensuel (jours blancs, bilan…) ",
  Custom: "Rappels personnalisés",
  ImaneProgramDaily: "Programme Imane – rappel quotidien",
  RamadanDailyCheckin: "Ramadan – check-in du jour",
};

const FASTING_STATUS_LABELS: Record<FastingLogStatus, string> = {
  FASTED: "Jeûné",
  MISSED: "Manqué",
  MADE_UP: "Rattrapé",
  EXEMPTION: "Dispense",
};

const FASTING_STATUS_ORDER: FastingLogStatus[] = [
  FastingLogStatus.FASTED,
  FastingLogStatus.MISSED,
  FastingLogStatus.MADE_UP,
  FastingLogStatus.EXEMPTION,
];

const MAKEUP_STRATEGY_LABELS: Record<MakeupStrategy, string> = {
  [MakeupStrategy.MondaysThursdays]: "Lundis & jeudis",
  [MakeupStrategy.SixDaysAfterEid]: "6 jours après l’Aïd",
  [MakeupStrategy.WhiteDays]: "Jours blancs",
  [MakeupStrategy.Custom]: "Personnalisé",
};

const REMINDER_TYPES: ReminderType[] = [
  ReminderType.ImaneProgramDaily,
  ReminderType.RamadanDailyCheckin,
  ReminderType.AfterEid,
  ReminderType.WeeklyMonday,
  ReminderType.WeeklyThursday,
  ReminderType.Monthly,
  ReminderType.Custom,
];

const LOCAL_REMINDER_TYPES = [
  "AdhanFajr",
  "AdhanDhuhr",
  "AdhanAsr",
  "AdhanMaghrib",
  "AdhanIsha",
  "SuhoorLocal",
  "IftarLocal",
  "DhikrMorning",
  "DhikrEvening",
  "JumuahReminder",
] as const;

type LocalReminderType = (typeof LOCAL_REMINDER_TYPES)[number];

const LOCAL_REMINDER_LABELS: Record<LocalReminderType, string> = {
  AdhanFajr: "Adhan Fajr",
  AdhanDhuhr: "Adhan Dhuhr",
  AdhanAsr: "Adhan Asr",
  AdhanMaghrib: "Adhan Maghrib",
  AdhanIsha: "Adhan Isha",
  SuhoorLocal: "Suhoor (30 min avant Fajr)",
  IftarLocal: "Iftar (Maghrib)",
  DhikrMorning: "Adhkar du matin (06h30)",
  DhikrEvening: "Adhkar du soir (18h00)",
  JumuahReminder: "Rappel Jumu'ah (vendredi 12h)",
};

function createReminderRecord<T>(value: T): Record<ReminderType, T> {
  return REMINDER_TYPES.reduce((acc, type) => {
    acc[type] = value;
    return acc;
  }, {} as Record<ReminderType, T>);
}

function createLocalReminderRecord<T>(value: T): Record<LocalReminderType, T> {
  return LOCAL_REMINDER_TYPES.reduce((acc, type) => {
    acc[type] = value;
    return acc;
  }, {} as Record<LocalReminderType, T>);
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface ReminderUIState {
  list: ReminderPreferenceListItem[];
  loading: boolean;
  error: string | null;
  updating: Record<ReminderType, boolean>;
  times: Record<ReminderType, string>;
}

export function DashboardScreen({ user, onSearch }: { user: AuthUser; onSearch?: () => void }) {
  const { logout } = useAuth();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const locale = (user.locale as Locale | undefined) ?? "fr";
  const { location: detectedLoc, loading: locLoading } = useLocationContext();

  const [prayerForm, setPrayerForm] = useState({
    latitude: DEFAULT_COORDS.latitude,
    longitude: DEFAULT_COORDS.longitude,
    date: "",
    timeZone: DEFAULT_COORDS.timeZone,
  });

  // Auto-fill prayer form from GPS location
  const [gpsCoordsKey, setGpsCoordsKey] = useState("");
  useEffect(() => {
    if (locLoading) return;
    if (detectedLoc.latitude && detectedLoc.longitude) {
      const newLat = String(detectedLoc.latitude);
      const newLng = String(detectedLoc.longitude);
      const newTz = detectedLoc.timeZone;
      setPrayerForm((prev) => {
        if (prev.latitude === newLat && prev.longitude === newLng) return prev;
        return {
          ...prev,
          latitude: newLat,
          longitude: newLng,
          timeZone: newTz ?? prev.timeZone,
        };
      });
      // Track GPS change to trigger prayer re-fetch
      const key = `${newLat},${newLng}`;
      setGpsCoordsKey((prev) => (prev === key ? prev : key));
    }
  }, [detectedLoc, locLoading]);

  const [prayerSettings, setPrayerSettings] = useState<{
    method?: CalculationMethodOption;
    madhab?: MadhabOption;
    highLatitudeRule?: HighLatitudeRuleOption;
    fajrAdjustment?: number;
    dhuhrAdjustment?: number;
    asrAdjustment?: number;
    maghribAdjustment?: number;
    ishaAdjustment?: number;
  } | null>(null);
  const [prayerResult, setPrayerResult] = useState<PrayerTimesResponse | null>(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [prayerError, setPrayerError] = useState<string | null>(null);

  const [fastingSummary, setFastingSummary] = useState<FastingSummary | null>(null);
  const [fastingLogs, setFastingLogs] = useState<FastingLog[]>([]);
  const [fastingLoading, setFastingLoading] = useState(true);
  const [fastingError, setFastingError] = useState<string | null>(null);

  const [makeupPlan, setMakeupPlan] = useState<(MakeupPlan & { entries?: MakeupPlanEntry[] }) | null>(null);
  const [makeupPlanError, setMakeupPlanError] = useState<string | null>(null);
  const [makeupPlanCreating, setMakeupPlanCreating] = useState(false);
  const [makeupPlanUpdatingEntryId, setMakeupPlanUpdatingEntryId] = useState<string | null>(null);

  const [ramadanSummary, setRamadanSummary] = useState<RamadanSummaryResponse | null>(null);
  const [ramadanLoading, setRamadanLoading] = useState(true);
  const [ramadanError, setRamadanError] = useState<string | null>(null);

  const [reminderState, setReminderState] = useState<ReminderUIState>({
    list: [],
    loading: true,
    error: null,
    updating: createReminderRecord(false),
    times: createReminderRecord(""),
  });

  const [dhikrCategories, setDhikrCategories] = useState<DhikrCategory[]>([]);
  const [dhikrRecords, setDhikrRecords] = useState<DhikrRecord[]>([]);
  const [dhikrForm, setDhikrForm] = useState({ entryId: "", count: 33, notes: "" });
  const [dhikrLoading, setDhikrLoading] = useState(true);
  const [dhikrError, setDhikrError] = useState<string | null>(null);
  const [dhikrSaving, setDhikrSaving] = useState(false);
  const [dhikrDeletingId, setDhikrDeletingId] = useState<string | null>(null);

  const [localReminderEnabled, setLocalReminderEnabled] = useState<Record<LocalReminderType, boolean>>(
    createLocalReminderRecord(false),
  );
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [localReminderLoading, setLocalReminderLoading] = useState(false);
  const [localReminderError, setLocalReminderError] = useState<string | null>(null);

  const formatDate = useCallback(
    (value: string | Date) => new Date(value).toLocaleDateString(user.locale ?? "fr"),
    [user.locale],
  );

  const formatTime = useCallback(
    (value: string | Date) =>
      new Date(value).toLocaleTimeString(user.locale ?? "fr", { hour: "2-digit", minute: "2-digit" }),
    [user.locale],
  );

  const dhikrEntries = useMemo(() => dhikrCategories.flatMap((category) => category.entries), [dhikrCategories]);

  const activeDhikrEntry = useMemo(() => {
    return dhikrEntries.find((entry) => entry.id === dhikrForm.entryId) ?? null;
  }, [dhikrEntries, dhikrForm.entryId]);

  const dhikrTotalCount = useMemo(
    () => dhikrRecords.reduce((sum, record) => sum + record.count, 0),
    [dhikrRecords],
  );

  const adhanTimes = useMemo(() => {
    if (!prayerResult) return null;
    const parse = (value?: string) => {
      if (!value) return null;
      const [hh, mm] = value.split(":").map((v) => Number.parseInt(v, 10));
      if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
      return { hour: hh, minute: mm };
    };
    return {
      Fajr: parse(prayerResult.times?.Fajr),
      Dhuhr: parse(prayerResult.times?.Dhuhr),
      Asr: parse(prayerResult.times?.Asr),
      Maghrib: parse(prayerResult.times?.Maghrib),
      Isha: parse(prayerResult.times?.Isha),
    };
  }, [prayerResult]);

  const subtractMinutes = useCallback((time: { hour: number; minute: number }, deltaMinutes: number) => {
    const total = time.hour * 60 + time.minute - deltaMinutes;
    const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    return { hour: Math.floor(normalized / 60), minute: normalized % 60 };
  }, []);

  const ramadanStatusCounts = useMemo(() => {
    const counts: Partial<Record<FastingLogStatus, number>> = {};
    if (!ramadanSummary) return counts;
    for (const day of ramadanSummary.days) {
      if (day.fastStatus) {
        counts[day.fastStatus] = (counts[day.fastStatus] ?? 0) + 1;
      }
    }
    return counts;
  }, [ramadanSummary]);

  const [todayIso, setTodayIso] = useState(() => new Date().toISOString().slice(0, 10));
  const lastPrayerRefreshIsoRef = useRef(todayIso);

  const ramadanTodayText = useMemo(() => {
    if (ramadanLoading) return "Ramadan: chargement…";
    if (ramadanError) return "Ramadan indisponible";
    if (!ramadanSummary) return "Ramadan: —";
    const today = ramadanSummary.days.find((d) => d.date === todayIso);
    if (!today || !today.fastStatus) return "Ramadan: pas de statut saisi";
    const label = FASTING_STATUS_LABELS[today.fastStatus];
    return `Ramadan: ${label}`;
  }, [ramadanLoading, ramadanError, ramadanSummary, todayIso]);

  const ramadanProgressText = useMemo(() => {
    if (!ramadanSummary || ramadanLoading || ramadanError) return "";
    const total = ramadanSummary.days.length;
    const fasted = ramadanStatusCounts.FASTED ?? 0;
    const missed = ramadanStatusCounts.MISSED ?? 0;
    const madeUp = ramadanStatusCounts.MADE_UP ?? 0;
    return `Avancement ${fasted}/${total} · Ratés ${missed} · Rattrapés ${madeUp}`;
  }, [ramadanSummary, ramadanLoading, ramadanError, ramadanStatusCounts]);

  const prayerStatusText = useMemo(() => {
    if (prayerLoading) return "Prière: chargement…";
    if (prayerError) return "Prière indisponible";
    if (!prayerResult) return "Prière: calcule les horaires";
    const current = prayerResult.currentPrayer;
    const currentTime = prayerResult.currentPrayerTime ? formatTime(prayerResult.currentPrayerTime) : null;
    const next = prayerResult.nextPrayer;
    const nextTime = prayerResult.nextPrayerTime ? formatTime(prayerResult.nextPrayerTime) : null;
    if (current && currentTime && next && nextTime) {
      return `En cours: ${current} (${currentTime}) · Prochaine: ${next} (${nextTime})`;
    }
    if (next && nextTime) {
      return `Prochaine: ${next} (${nextTime})`;
    }
    return "Horaires disponibles";
  }, [prayerLoading, prayerError, prayerResult, formatTime]);

  const fetchPrayer = useCallback(async () => {
    setPrayerLoading(true);
    setPrayerError(null);
    try {
      if (!prayerSettings) {
        try {
          const raw = await SecureStore.getItemAsync(prayerSettingsStorage.key);
          if (raw) {
            const parsed = JSON.parse(raw) as {
              latitude?: string;
              longitude?: string;
              timeZone?: string;
              method?: CalculationMethodOption;
              madhab?: MadhabOption;
              highLatitudeRule?: HighLatitudeRuleOption;
              fajrAdjustment?: number;
              dhuhrAdjustment?: number;
              asrAdjustment?: number;
              maghribAdjustment?: number;
              ishaAdjustment?: number;
            };

            if (parsed.latitude && parsed.longitude) {
              setPrayerForm((prev) => ({
                ...prev,
                latitude: parsed.latitude ?? prev.latitude,
                longitude: parsed.longitude ?? prev.longitude,
                timeZone: parsed.timeZone ?? prev.timeZone,
              }));
            }

            setPrayerSettings({
              method: parsed.method,
              madhab: parsed.madhab,
              highLatitudeRule: parsed.highLatitudeRule,
              fajrAdjustment: parsed.fajrAdjustment,
              dhuhrAdjustment: parsed.dhuhrAdjustment,
              asrAdjustment: parsed.asrAdjustment,
              maghribAdjustment: parsed.maghribAdjustment,
              ishaAdjustment: parsed.ishaAdjustment,
            });
          } else {
            setPrayerSettings({
              method: prayerSettingsStorage.defaults.method,
              madhab: prayerSettingsStorage.defaults.madhab,
              highLatitudeRule: prayerSettingsStorage.defaults.highLatitudeRule,
              fajrAdjustment: prayerSettingsStorage.defaults.fajrAdjustment,
              dhuhrAdjustment: prayerSettingsStorage.defaults.dhuhrAdjustment,
              asrAdjustment: prayerSettingsStorage.defaults.asrAdjustment,
              maghribAdjustment: prayerSettingsStorage.defaults.maghribAdjustment,
              ishaAdjustment: prayerSettingsStorage.defaults.ishaAdjustment,
            });
          }
        } catch {
          setPrayerSettings({
            method: prayerSettingsStorage.defaults.method,
            madhab: prayerSettingsStorage.defaults.madhab,
            highLatitudeRule: prayerSettingsStorage.defaults.highLatitudeRule,
            fajrAdjustment: prayerSettingsStorage.defaults.fajrAdjustment,
            dhuhrAdjustment: prayerSettingsStorage.defaults.dhuhrAdjustment,
            asrAdjustment: prayerSettingsStorage.defaults.asrAdjustment,
            maghribAdjustment: prayerSettingsStorage.defaults.maghribAdjustment,
            ishaAdjustment: prayerSettingsStorage.defaults.ishaAdjustment,
          });
        }
      }

      const latitude = Number.parseFloat(prayerForm.latitude);
      const longitude = Number.parseFloat(prayerForm.longitude);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        throw new Error("Veuillez entrer des coordonnées valides.");
      }

      const params: PrayerTimesRequest = {
        latitude,
        longitude,
      };
      if (prayerForm.date) {
        params.date = prayerForm.date;
      }
      if (prayerForm.timeZone.trim()) {
        params.timeZone = prayerForm.timeZone.trim();
      }

      const effective = prayerSettings ?? {
        method: prayerSettingsStorage.defaults.method,
        madhab: prayerSettingsStorage.defaults.madhab,
        highLatitudeRule: prayerSettingsStorage.defaults.highLatitudeRule,
        fajrAdjustment: prayerSettingsStorage.defaults.fajrAdjustment,
        dhuhrAdjustment: prayerSettingsStorage.defaults.dhuhrAdjustment,
        asrAdjustment: prayerSettingsStorage.defaults.asrAdjustment,
        maghribAdjustment: prayerSettingsStorage.defaults.maghribAdjustment,
        ishaAdjustment: prayerSettingsStorage.defaults.ishaAdjustment,
      };

      if (effective.method) params.method = effective.method;
      if (effective.madhab) params.madhab = effective.madhab;
      if (effective.highLatitudeRule) params.highLatitudeRule = effective.highLatitudeRule;
      if (effective.fajrAdjustment !== undefined) params.fajrAdjustment = effective.fajrAdjustment;
      if (effective.dhuhrAdjustment !== undefined) params.dhuhrAdjustment = effective.dhuhrAdjustment;
      if (effective.asrAdjustment !== undefined) params.asrAdjustment = effective.asrAdjustment;
      if (effective.maghribAdjustment !== undefined) params.maghribAdjustment = effective.maghribAdjustment;
      if (effective.ishaAdjustment !== undefined) params.ishaAdjustment = effective.ishaAdjustment;

      const result = await offlineCache.getWithFallback<PrayerTimesResponse>(
        CACHE_KEYS.PRAYER_TIMES,
        () => prayerApi.getPrayerTimes(params),
        CACHE_TTL.SHORT,
      );
      setPrayerResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de calculer les horaires.";
      setPrayerError(message);
      setPrayerResult(null);
    } finally {
      setPrayerLoading(false);
    }
  }, [prayerForm, prayerSettings]);

  const loadFasting = useCallback(async () => {
    setFastingLoading(true);
    setFastingError(null);
    setMakeupPlanError(null);
    try {
      const startDate = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
      const [summary, logs, plan] = await Promise.all([
        fastingApi.summary(),
        fastingApi.listLogs({ startDate }),
        fastingApi.getActivePlan(),
      ]);
      setFastingSummary(summary);
      const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setFastingLogs(sorted.slice(0, 5));
      setMakeupPlan(plan);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de récupérer les données de jeûne.";
      setFastingError(message);
      setMakeupPlan(null);
    } finally {
      setFastingLoading(false);
    }
  }, []);

  const canCreateMakeupPlan = useMemo(() => {
    if (!fastingSummary) return false;
    if (fastingSummary.outstandingMakeupDays <= 0) return false;
    if (makeupPlan?.isActive) return false;
    return true;
  }, [fastingSummary, makeupPlan?.isActive]);

  const handleCreateMakeupPlan = useCallback(
    async (strategy: MakeupStrategy) => {
      if (!fastingSummary) return;
      if (fastingSummary.outstandingMakeupDays <= 0) return;

      setMakeupPlanCreating(true);
      setMakeupPlanError(null);
      try {
        const synced = await syncPushTokenWithBackend();
        if (!synced) {
          throw new Error("Active les notifications pour recevoir les rappels du plan.");
        }

        if (strategy === MakeupStrategy.WhiteDays || strategy === MakeupStrategy.Custom) {
          throw new Error("Cette stratégie n’est pas encore disponible sur mobile.");
        }

        const plan = await fastingApi.createPlan({
          strategy,
          targetDays: fastingSummary.outstandingMakeupDays,
        });
        setMakeupPlan(plan);
        await loadFasting();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de créer le plan de rattrapage.";
        setMakeupPlanError(message);
      } finally {
        setMakeupPlanCreating(false);
      }
    },
    [fastingSummary, loadFasting],
  );

  const handleCompleteMakeupEntry = useCallback(
    async (entry: MakeupPlanEntry) => {
      if (!makeupPlan) return;
      setMakeupPlanUpdatingEntryId(entry.id);
      setMakeupPlanError(null);
      try {
        await fastingApi.updatePlanEntry(makeupPlan.id, entry.id, { status: PlanEntryStatus.Completed });
        await loadFasting();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de mettre à jour le plan.";
        setMakeupPlanError(message);
      } finally {
        setMakeupPlanUpdatingEntryId(null);
      }
    },
    [loadFasting, makeupPlan],
  );

  const upcomingMakeupEntries = useMemo(() => {
    if (!makeupPlan?.entries?.length) return [];
    const now = Date.now();
    return makeupPlan.entries
      .slice()
      .filter((entry) => entry.status !== PlanEntryStatus.Completed)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .filter((entry) => new Date(entry.scheduledDate).getTime() >= now - 24 * 60 * 60 * 1000)
      .slice(0, 8);
  }, [makeupPlan?.entries]);

  const loadRamadan = useCallback(async () => {
    setRamadanLoading(true);
    setRamadanError(null);
    try {
      const currentYear = new Date().getFullYear();
      const summary = await ramadanApi.summary(currentYear);
      setRamadanSummary(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de récupérer les données de Ramadan.";
      setRamadanError(message);
    } finally {
      setRamadanLoading(false);
    }
  }, []);

  const loadReminders = useCallback(async () => {
    setReminderState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const list = await remindersApi.listPreferences();
      const times = createReminderRecord("");
      for (const item of list) {
        times[item.type] = item.sendTime ?? "";
      }
      setReminderState({ list, loading: false, error: null, updating: createReminderRecord(false), times });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de récupérer les rappels.";
      setReminderState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const loadDhikr = useCallback(async () => {
    setDhikrLoading(true);
    setDhikrError(null);
    try {
      const [categoriesResponse, recordsResponse] = await Promise.all([dhikrApi.listCategories(), dhikrApi.listRecords()]);
      setDhikrCategories(categoriesResponse);
      setDhikrRecords(recordsResponse);
      if (!dhikrForm.entryId && categoriesResponse.length > 0) {
        const first = categoriesResponse.find((category) => category.entries.length > 0)?.entries[0];
        if (first) {
          setDhikrForm((prev) => ({ ...prev, entryId: first.id }));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de récupérer les données de dhikr.";
      setDhikrError(message);
    } finally {
      setDhikrLoading(false);
    }
  }, [dhikrForm.entryId]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchPrayer(), loadFasting(), loadReminders(), loadDhikr(), loadRamadan()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPrayer, loadFasting, loadReminders, loadDhikr, loadRamadan]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  // Re-fetch prayer times when GPS location updates coords
  useEffect(() => {
    if (!gpsCoordsKey) return;
    void fetchPrayer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsCoordsKey]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;

      const nowIso = new Date().toISOString().slice(0, 10);
      if (nowIso === lastPrayerRefreshIsoRef.current) return;

      lastPrayerRefreshIsoRef.current = nowIso;
      setTodayIso(nowIso);
      void fetchPrayer();
    });

    return () => subscription.remove();
  }, [fetchPrayer]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loadLocalToggles = async () => {
      setLocalReminderLoading(true);
      try {
        const raw = await SecureStore.getItemAsync("oumoul.localReminders");
        if (raw) {
          const parsed = JSON.parse(raw) as Record<LocalReminderType, boolean>;
          setLocalReminderEnabled((prev) => ({ ...prev, ...parsed }));
        } else {
          // First launch: auto-enable adhan + dhikr reminders (smart default)
          const autoEnabled: Record<LocalReminderType, boolean> = {
            AdhanFajr: true,
            AdhanDhuhr: true,
            AdhanAsr: true,
            AdhanMaghrib: true,
            AdhanIsha: true,
            SuhoorLocal: false,
            IftarLocal: false,
            DhikrMorning: true,
            DhikrEvening: true,
            JumuahReminder: true,
          };
          setLocalReminderEnabled(autoEnabled);
          await SecureStore.setItemAsync("oumoul.localReminders", JSON.stringify(autoEnabled));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de charger les rappels locaux.";
        setLocalReminderError(message);
      } finally {
        setLocalReminderLoading(false);
      }
    };
    void loadLocalToggles();
  }, []);

  const persistLocalReminders = useCallback(async (state: Record<LocalReminderType, boolean>) => {
    try {
      await SecureStore.setItemAsync("oumoul.localReminders", JSON.stringify(state));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d’enregistrer les rappels locaux.";
      setLocalReminderError(message);
    }
  }, []);

  const toggleLocalReminder = useCallback(
    async (type: LocalReminderType) => {
      const currentlyEnabled = localReminderEnabled[type];
      const id =
        type === "SuhoorLocal"
          ? "suhoor"
          : type === "IftarLocal"
          ? "iftar"
          : type === "DhikrMorning"
          ? "dhikr-morning"
          : type === "DhikrEvening"
          ? "dhikr-evening"
          : type === "JumuahReminder"
          ? "jumuah-reminder"
          : `adhan-${type.replace("Adhan", "")}`;

      if (currentlyEnabled) {
        await cancelReminder(id);
        setLocalReminderEnabled((prev) => {
          const next = { ...prev, [type]: false };
          void persistLocalReminders(next);
          return next;
        });
        setToast(t(locale, "notif.local.toast.disabled", "Rappel désactivé"));
        return;
      }

      const synced = await syncPushTokenWithBackend();
      if (!synced) {
        setToast(t(locale, "notif.local.toast.permission", "Active les notifications dans les réglages."));
        return;
      }

      try {
        if (type.startsWith("Adhan")) {
          const key = type.replace("Adhan", "") as keyof NonNullable<typeof adhanTimes>;
          const slot = adhanTimes?.[key];
          if (!slot) {
            setPrayerError("Calcule d’abord les horaires pour activer l’Adhan.");
            return;
          }
          await scheduleAdhanReminder(key, slot.hour, slot.minute);
        } else if (type === "SuhoorLocal") {
          const fajr = adhanTimes?.Fajr;
          if (!fajr) {
            setPrayerError("Calcule d’abord les horaires pour activer Suhoor.");
            return;
          }
          const suhoor = subtractMinutes(fajr, 30);
          await scheduleSuhoorReminder(suhoor.hour, suhoor.minute);
        } else if (type === "IftarLocal") {
          const maghrib = adhanTimes?.Maghrib;
          if (!maghrib) {
            setPrayerError("Calcule d’abord les horaires pour activer Iftar.");
            return;
          }
          await scheduleIftarReminder(maghrib.hour, maghrib.minute);
        } else if (type === "DhikrMorning") {
          await scheduleDhikrMorningReminder();
        } else if (type === "DhikrEvening") {
          await scheduleDhikrEveningReminder();
        } else if (type === "JumuahReminder") {
          await scheduleJumuahReminder();
        }

        setLocalReminderEnabled((prev) => {
          const next = { ...prev, [type]: true };
          void persistLocalReminders(next);
          return next;
        });
        setToast(t(locale, "notif.local.toast.enabled", "Rappel activé"));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible d’activer le rappel.";
        setPrayerError(message);
      }
    },
    [localReminderEnabled, adhanTimes, setPrayerError, persistLocalReminders, locale],
  );

  const rescheduleEnabledLocalReminders = useCallback(
    async (times: NonNullable<typeof adhanTimes>) => {
      const enabled = localReminderEnabled;
      const tasks: Array<Promise<unknown>> = [];

      const push = (p: Promise<unknown>) => tasks.push(p);

      if (enabled.AdhanFajr && times.Fajr) {
        push(cancelReminder("adhan-Fajr").catch(() => undefined));
        push(scheduleAdhanReminder("Fajr", times.Fajr.hour, times.Fajr.minute));
      }
      if (enabled.AdhanDhuhr && times.Dhuhr) {
        push(cancelReminder("adhan-Dhuhr").catch(() => undefined));
        push(scheduleAdhanReminder("Dhuhr", times.Dhuhr.hour, times.Dhuhr.minute));
      }
      if (enabled.AdhanAsr && times.Asr) {
        push(cancelReminder("adhan-Asr").catch(() => undefined));
        push(scheduleAdhanReminder("Asr", times.Asr.hour, times.Asr.minute));
      }
      if (enabled.AdhanMaghrib && times.Maghrib) {
        push(cancelReminder("adhan-Maghrib").catch(() => undefined));
        push(scheduleAdhanReminder("Maghrib", times.Maghrib.hour, times.Maghrib.minute));
      }
      if (enabled.AdhanIsha && times.Isha) {
        push(cancelReminder("adhan-Isha").catch(() => undefined));
        push(scheduleAdhanReminder("Isha", times.Isha.hour, times.Isha.minute));
      }

      if (enabled.SuhoorLocal && times.Fajr) {
        push(cancelReminder("suhoor").catch(() => undefined));
        const suhoor = subtractMinutes(times.Fajr, 30);
        push(scheduleSuhoorReminder(suhoor.hour, suhoor.minute));
      }

      if (enabled.IftarLocal && times.Maghrib) {
        push(cancelReminder("iftar").catch(() => undefined));
        push(scheduleIftarReminder(times.Maghrib.hour, times.Maghrib.minute));
      }

      if (enabled.DhikrMorning) {
        push(cancelReminder("dhikr-morning").catch(() => undefined));
        push(scheduleDhikrMorningReminder());
      }
      if (enabled.DhikrEvening) {
        push(cancelReminder("dhikr-evening").catch(() => undefined));
        push(scheduleDhikrEveningReminder());
      }

      if (enabled.JumuahReminder) {
        push(cancelReminder("jumuah-reminder").catch(() => undefined));
        push(scheduleJumuahReminder());
      }

      try {
        const synced = await syncPushTokenWithBackend();
        if (!synced) return;
        await Promise.all(tasks);
      } catch {
        // Best effort: on ne bloque pas l'app si reschedule échoue.
      }
    },
    [localReminderEnabled, subtractMinutes],
  );

  const showScheduledLocalNotifications = useCallback(async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const ids = scheduled
        .map((item) => item.identifier)
        .filter(Boolean)
        .slice(0, 8)
        .join(", ");
      setToast(scheduled.length === 0 ? "Aucune notification locale programmée." : `Programmées: ${scheduled.length} · ${ids}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de lire les notifications programmées.";
      setToast(message);
    }
  }, []);

  useEffect(() => {
    if (!adhanTimes) return;
    void rescheduleEnabledLocalReminders(adhanTimes);
  }, [adhanTimes, rescheduleEnabledLocalReminders]);

  const handleDhikrEntryChange = useCallback((entryId: string) => {
    setDhikrForm((prev) => ({ ...prev, entryId }));
  }, []);

  const handleDhikrCountChange = useCallback((value: string) => {
    const parsed = Number.parseInt(value, 10);
    setDhikrForm((prev) => ({ ...prev, count: Number.isNaN(parsed) || parsed < 0 ? 0 : parsed }));
  }, []);

  const handleDhikrNotesChange = useCallback((value: string) => {
    setDhikrForm((prev) => ({ ...prev, notes: value }));
  }, []);

  const handleDhikrSave = useCallback(async () => {
    if (!dhikrForm.entryId) return;
    setDhikrSaving(true);
    setDhikrError(null);
    try {
      await dhikrApi.upsertRecord({
        entryId: dhikrForm.entryId,
        count: dhikrForm.count,
        notes: dhikrForm.notes.trim() ? dhikrForm.notes.trim() : undefined,
      });
      await loadDhikr();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d’enregistrer le dhikr.";
      setDhikrError(message);
    } finally {
      setDhikrSaving(false);
    }
  }, [dhikrForm, loadDhikr]);

  const handleDhikrIncrement = useCallback(
    async (record: DhikrRecord) => {
      setDhikrError(null);
      try {
        await dhikrApi.updateRecord(record.id, { count: record.count + 1 });
        await loadDhikr();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de mettre à jour le dhikr.";
        setDhikrError(message);
      }
    },
    [loadDhikr],
  );

  const handleDhikrDelete = useCallback(
    async (id: string) => {
      setDhikrDeletingId(id);
      setDhikrError(null);
      try {
        await dhikrApi.deleteRecord(id);
        await loadDhikr();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de supprimer le dhikr.";
        setDhikrError(message);
      } finally {
        setDhikrDeletingId(null);
      }
    },
    [loadDhikr],
  );

  const handleReminderToggle = useCallback(
    async (pref: ReminderPreferenceListItem) => {
      setReminderState((prev) => ({
        ...prev,
        updating: { ...prev.updating, [pref.type]: true },
      }));
      try {
        const updated = await remindersApi.updatePreference(pref.type, {
          isEnabled: !pref.isEnabled,
          sendTime: pref.sendTime ?? undefined,
        });
        setReminderState((prev) => ({
          ...prev,
          list: prev.list.map((item) => (item.type === pref.type ? toListItem(updated) : item)),
          updating: { ...prev.updating, [pref.type]: false },
          times: { ...prev.times, [pref.type]: updated.sendTime ?? "" },
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de mettre à jour le rappel.";
        setReminderState((prev) => ({
          ...prev,
          error: message,
          updating: { ...prev.updating, [pref.type]: false },
        }));
      }
    },
    [],
  );

  const handleReminderTimeBlur = useCallback(
    async (pref: ReminderPreferenceListItem, input: string) => {
      if ((pref.sendTime ?? "") === input.trim()) {
        return;
      }
      setReminderState((prev) => ({
        ...prev,
        updating: { ...prev.updating, [pref.type]: true },
        times: { ...prev.times, [pref.type]: input },
      }));
      try {
        const updated = await remindersApi.updatePreference(pref.type, {
          isEnabled: pref.isEnabled,
          sendTime: input.trim() || undefined,
        });
        setReminderState((prev) => ({
          ...prev,
          list: prev.list.map((item) => (item.type === pref.type ? toListItem(updated) : item)),
          updating: { ...prev.updating, [pref.type]: false },
          times: { ...prev.times, [pref.type]: updated.sendTime ?? "" },
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de mettre à jour le rappel.";
        setReminderState((prev) => ({
          ...prev,
          error: message,
          updating: { ...prev.updating, [pref.type]: false },
        }));
      }
    },
    [],
  );

  const onLogout = useCallback(async () => {
    setLogoutBusy(true);
    try {
      await logout();
    } finally {
      setLogoutBusy(false);
    }
  }, [logout]);

  const prayerTimesEntries = useMemo(() => {
    if (!prayerResult) return [];
    return Object.entries(prayerResult.times) as Array<[string, string]>;
  }, [prayerResult]);

  const hijriLabel = useMemo(() => {
    try {
      const hijri = getCurrentHijriDate();
      return `${hijri.day} ${hijri.monthName} ${hijri.year} AH`;
    } catch {
      // Fallback to browser's Islamic calendar if available
      try {
        const formatter = new Intl.DateTimeFormat(user.locale ?? "fr-FR", {
          calendar: "islamic-umalqura",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        return formatter.format(new Date());
      } catch {
        return "";
      }
    }
  }, [user.locale]);

  const dashLocLabel = useMemo(() => {
    if (detectedLoc.city && detectedLoc.country) return `${detectedLoc.city}, ${detectedLoc.country}`;
    if (detectedLoc.city) return detectedLoc.city;
    return "Position GPS détectée";
  }, [detectedLoc.city, detectedLoc.country]);

  const todayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(user.locale ?? "fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [user.locale]);

  const ramadanDayInfo = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return getRamadanInfo(currentYear);
  }, []);

  const nextPrayerInfo = useMemo(() => {
    if (!prayerResult) return null;
    const next = prayerResult.nextPrayer;
    const nextTime = prayerResult.nextPrayerTime ? formatTime(prayerResult.nextPrayerTime) : null;
    if (!next || !nextTime) return null;
    return { name: next, time: nextTime };
  }, [prayerResult, formatTime]);

  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    if (!prayerResult?.nextPrayerTime) { setCountdown(""); return; }
    const target = new Date(prayerResult.nextPrayerTime).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setCountdown("maintenant"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setCountdown(h > 0 ? `dans ${h}h ${String(m).padStart(2, "0")}min` : `dans ${m}min ${String(s).padStart(2, "0")}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [prayerResult?.nextPrayerTime]);

  return (
    <View style={[ds.screen, { paddingTop: 0 }]}>
      <ScrollView
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshAll()} tintColor={ds_c.primaryDark} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting header */}
        <Header
          user={user}
          todayLabel={todayLabel}
          hijriLabel={hijriLabel}
          locationLabel={dashLocLabel}
          isLocationLoading={locLoading}
          onSearch={onSearch}
        />

        {/* Next prayer highlight */}
        <NextPrayerCard
          isLoading={prayerLoading && !nextPrayerInfo}
          nextPrayerInfo={nextPrayerInfo}
          countdown={countdown}
        />

        {/* Dua / Ayah of the Day */}
        <DailyInspirationCard locale={locale} />

        {/* Streak Card */}
        <StreakCard />

        {/* Ramadan banner */}
        <RamadanBanner
          ramadanDayInfo={ramadanDayInfo}
          ramadanTodayText={ramadanTodayText}
          ramadanProgressText={ramadanProgressText}
        />

        {/* Stats row */}
        <StatsRow
          prayerStatusText={prayerStatusText}
          ramadanTodayText={ramadanTodayText}
          ramadanProgressText={ramadanProgressText}
          fastingSummary={fastingSummary}
          locale={locale}
        />

        <LocalRemindersSection
          isLoading={localReminderLoading}
          error={localReminderError}
          enabled={localReminderEnabled}
          onToggle={toggleLocalReminder}
          locale={locale}
        />

        <Section title={t(locale, "dash.makeup.plan.title", "Plan de rattrapage")} subtitle={t(locale, "dash.makeup.plan.subtitle", "Rappels pour rattraper tes jours manqués.")}>
          {makeupPlanError ? <Text style={ds.errorText}>{makeupPlanError}</Text> : null}
          {fastingLoading ? (
            <ActivityIndicator color={ds_c.primaryDark} />
          ) : makeupPlan?.isActive ? (
            <View style={{ gap: 10 }}>
              <View style={ds.infoRow}>
                <Text style={ds.infoTitle}>{t(locale, "dash.makeup.plan.active", "Plan actif")} · {MAKEUP_STRATEGY_LABELS[makeupPlan.strategy]}</Text>
                <Text style={ds.infoSub}>{makeupPlan.completedDays}/{makeupPlan.targetDays} {t(locale, "dash.makeup.plan.done", "fait(s)")}</Text>
              </View>
              {upcomingMakeupEntries.length === 0 ? (
                <Text style={ds.mutedText}>{t(locale, "dash.makeup.plan.none", "Aucune date à venir.")}</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {upcomingMakeupEntries.map((entry) => (
                    <View key={entry.id} style={ds.entryRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={ds.entryTitle}>{formatDate(entry.scheduledDate)}</Text>
                        <Text style={ds.entrySub}>{entry.status}</Text>
                      </View>
                      <TouchableOpacity style={ds.smallBtn} onPress={() => void handleCompleteMakeupEntry(entry)} disabled={makeupPlanUpdatingEntryId === entry.id}>
                        <Text style={[ds.smallBtnText, makeupPlanUpdatingEntryId === entry.id && { opacity: 0.5 }]}>
                          {makeupPlanUpdatingEntryId === entry.id ? "…" : t(locale, "dash.makeup.plan.complete", "Fait")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={ds.mutedText}>
                {fastingSummary ? `${fastingSummary.outstandingMakeupDays} ${t(locale, "dash.makeup.label", "jour(s) à rattraper")}` : t(locale, "dash.makeup.loading", "Chargement…")}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity style={ds.primaryBtn} onPress={() => void handleCreateMakeupPlan(MakeupStrategy.MondaysThursdays)} disabled={!canCreateMakeupPlan || makeupPlanCreating}>
                  <Text style={[ds.primaryBtnText, (!canCreateMakeupPlan || makeupPlanCreating) && { opacity: 0.5 }]}>{t(locale, "dash.makeup.plan.create.mondayThursday", "Lun/Jeu")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ds.outlineBtn} onPress={() => void handleCreateMakeupPlan(MakeupStrategy.SixDaysAfterEid)} disabled={!canCreateMakeupPlan || makeupPlanCreating}>
                  <Text style={[ds.outlineBtnText, (!canCreateMakeupPlan || makeupPlanCreating) && { opacity: 0.5 }]}>{t(locale, "dash.makeup.plan.create.afterEid", "Après Aïd")}</Text>
                </TouchableOpacity>
              </View>
              {!canCreateMakeupPlan && fastingSummary?.outstandingMakeupDays === 0 ? (
                <Text style={ds.mutedText}>{t(locale, "dash.makeup.plan.zero", "Aucun rattrapage en attente.")}</Text>
              ) : null}
            </View>
          )}
        </Section>

        {toast ? (
          <View style={ds.toast}>
            <Text style={{ color: ds_c.text, fontSize: 13 }}>{toast}</Text>
          </View>
        ) : null}

        <Section title={t(locale, "dash.prayer.section.title", "Horaires de prière")} subtitle={dashLocLabel}>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(26,127,100,0.08)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Ionicons name="location" size={14} color={ds_c.primaryDark} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: ds_c.text, flex: 1 }}>
                {locLoading ? "Détection GPS…" : dashLocLabel}
              </Text>
              <Text style={{ fontSize: 11, color: ds_c.muted }}>{prayerForm.timeZone}</Text>
            </View>
            {prayerError && <Text style={ds.errorText}>{prayerError}</Text>}
            {prayerLoading ? (
              <ActivityIndicator color={ds_c.primaryDark} />
            ) : prayerResult ? (
              <View style={{ gap: 6 }}>
                {prayerTimesEntries.map(([key, value]) => (
                  <View key={key} style={ds.prayerRow}>
                    <Text style={ds.prayerKey}>{key}</Text>
                    <Text style={ds.prayerVal}>{formatTime(value)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={ds.mutedText}>{t(locale, "dash.prayer.section.subtitle", "Calcul automatique en cours…")}</Text>
            )}
          </View>
        </Section>

        <Section title={t(locale, "dash.ramadan.section.title", "Suivi du jeûne (30j)")} subtitle={t(locale, "dash.ramadan.subtitle", "Résumé Ramadan.")}>
          {ramadanLoading ? (
            <ActivityIndicator color={ds_c.primaryDark} />
          ) : ramadanError ? (
            <Text style={ds.errorText}>{ramadanError}</Text>
          ) : !ramadanSummary ? (
            <Text style={ds.mutedText}>{t(locale, "dash.ramadan.today.none", "Pas de statut saisi")}</Text>
          ) : (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {FASTING_STATUS_ORDER.map((status) => (
                  <View key={status} style={ds.miniStat}>
                    <Text style={ds.miniStatLabel}>{FASTING_STATUS_LABELS[status]}</Text>
                    <Text style={ds.miniStatVal}>{ramadanStatusCounts[status] ?? 0}</Text>
                  </View>
                ))}
              </View>
              <Text style={ds.subHeading}>{t(locale, "dash.ramadan.recentDays", "Jours récents")}</Text>
              {ramadanSummary.days.length === 0 ? (
                <Text style={ds.mutedText}>{t(locale, "dash.ramadan.noDays", "Aucun jour enregistré.")}</Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {ramadanSummary.days
                    .slice()
                    .sort((a: RamadanDaySummary, b: RamadanDaySummary) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 7)
                    .map((day) => (
                      <View key={day.date} style={ds.infoRow}>
                        <Text style={ds.infoTitle}>{formatDate(day.date)}</Text>
                        <Text style={ds.infoSub}>
                          {day.fastStatus ? FASTING_STATUS_LABELS[day.fastStatus] : t(locale, "dash.ramadan.unknown", "Non renseigné")}
                          {day.cycleStatus ? ` · ${day.cycleStatus}` : ""}
                          {day.notes ? ` · ${day.notes}` : ""}
                        </Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
          )}
        </Section>

        <Section title={t(locale, "dash.dhikr.section.title", "Dhikr")} subtitle={t(locale, "dash.dhikr.subtitle", "Enregistre un nouveau décompte.")}>
          {dhikrLoading ? (
            <ActivityIndicator color={ds_c.primaryDark} />
          ) : dhikrError ? (
            <Text style={ds.errorText}>{dhikrError}</Text>
          ) : dhikrEntries.length === 0 ? (
            <Text style={ds.mutedText}>{t(locale, "dash.dhikr.none", "Aucun dhikr enregistré.")}</Text>
          ) : (
            <View style={{ gap: 14 }}>
              <View style={ds.dhikrTotal}>
                <Text style={ds.mutedText}>{t(locale, "dash.dhikr.total", "Total enregistré")}</Text>
                <Text style={ds.dhikrTotalNum}>{dhikrTotalCount}</Text>
              </View>

              <Text style={ds.subHeading}>{t(locale, "dash.dhikr.formula", "Formule")}</Text>
              {dhikrCategories.map((category) => (
                <View key={category.id} style={{ gap: 4 }}>
                  <Text style={ds.catLabel}>{category.name}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {category.entries.map((entry) => {
                      const isActive = entry.id === dhikrForm.entryId;
                      return (
                        <TouchableOpacity key={entry.id} style={[ds.chip, isActive && ds.chipActive]} onPress={() => handleDhikrEntryChange(entry.id)}>
                          <Text style={{ color: isActive ? "#fff" : ds_c.text, fontWeight: isActive ? "700" : "500", fontSize: 13 }}>{entry.title}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              <View style={{ gap: 10, marginTop: 6 }}>
                <TextInput style={ds.input} placeholder={t(locale, "dash.dhikr.count", "Comptage")} placeholderTextColor={ds_c.muted} keyboardType="number-pad" value={String(dhikrForm.count)} onChangeText={handleDhikrCountChange} />
                <TextInput style={[ds.input, { textAlignVertical: "top" }]} placeholder={t(locale, "dash.dhikr.notes", "Notes")} placeholderTextColor={ds_c.muted} multiline value={dhikrForm.notes} onChangeText={handleDhikrNotesChange} numberOfLines={3} />
                <TouchableOpacity style={[ds.primaryBtn, (!dhikrForm.entryId || dhikrSaving) && { opacity: 0.5 }]} onPress={() => void handleDhikrSave()} disabled={dhikrSaving || !dhikrForm.entryId}>
                  <Text style={ds.primaryBtnText}>{dhikrSaving ? t(locale, "dash.dhikr.saving", "Enregistrement…") : t(locale, "dash.dhikr.save", "Enregistrer")}</Text>
                </TouchableOpacity>
              </View>

              {activeDhikrEntry && (
                <View style={ds.arabicCard}>
                  <Text style={ds.subHeading}>{activeDhikrEntry.title}</Text>
                  <Text style={ds.arabicText}>{activeDhikrEntry.arabicText}</Text>
                  {activeDhikrEntry.translit && <Text style={ds.mutedText}>{activeDhikrEntry.translit}</Text>}
                  {activeDhikrEntry.translation && <Text style={ds.mutedText}>{activeDhikrEntry.translation}</Text>}
                  {activeDhikrEntry.source && <Text style={[ds.mutedText, { fontSize: 11 }]}>Source · {activeDhikrEntry.source}</Text>}
                </View>
              )}

              <Text style={ds.subHeading}>{t(locale, "dash.dhikr.history", "Historique récent")}</Text>
              {dhikrRecords.length === 0 ? (
                <Text style={ds.mutedText}>{t(locale, "dash.dhikr.history.none", "Aucun enregistrement.")}</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {dhikrRecords.map((record) => (
                    <View key={record.id} style={ds.infoRow}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View style={{ flex: 1 }}>
                          <Text style={ds.infoTitle}>{record.entry.title}</Text>
                          <Text style={[ds.mutedText, { fontSize: 11 }]}>{new Date(record.notedAt).toLocaleString(user.locale ?? "fr")}</Text>
                        </View>
                        <Text style={{ color: ds_c.text, fontSize: 22, fontWeight: "700" }}>{record.count}</Text>
                      </View>
                      {record.notes && <Text style={ds.mutedText}>{record.notes}</Text>}
                      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                        <TouchableOpacity style={ds.outlineBtn} onPress={() => void handleDhikrIncrement(record)}>
                          <Text style={ds.outlineBtnText}>+1</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[ds.outlineBtn, { borderColor: ds_c.error }]} onPress={() => void handleDhikrDelete(record.id)} disabled={dhikrDeletingId === record.id}>
                          <Text style={[ds.outlineBtnText, { color: ds_c.error }]}>
                            {dhikrDeletingId === record.id ? t(locale, "dash.common.deleting", "…") : t(locale, "dash.common.delete", "Supprimer")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </Section>

        <Section title="Rappels intelligents" subtitle="Notifications automatiques pour ta pratique.">
          {reminderState.loading ? (
            <ActivityIndicator color={ds_c.primaryDark} />
          ) : reminderState.error ? (
            <Text style={ds.errorText}>{reminderState.error}</Text>
          ) : reminderState.list.length === 0 ? (
            <Text style={ds.mutedText}>Aucun rappel disponible.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {reminderState.list.map((pref) => (
                <View key={pref.type} style={ds.switchRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={ds.switchLabel}>{REMINDER_LABELS[pref.type]}</Text>
                    {pref.sendTime ? <Text style={{ fontSize: 11, color: ds_c.muted, marginTop: 2 }}>Envoi à {pref.sendTime}</Text> : null}
                  </View>
                  <Switch
                    value={pref.isEnabled}
                    onValueChange={() => void handleReminderToggle(pref)}
                    trackColor={{ true: ds_c.primaryDark, false: "rgba(0,0,0,0.1)" }}
                    thumbColor={pref.isEnabled ? palette.primary : "#ccc"}
                    disabled={reminderState.updating[pref.type]}
                  />
                </View>
              ))}
            </View>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={ds.section}>
      <Text style={ds.sectionTitle}>{title}</Text>
      {subtitle && <Text style={ds.sectionSub}>{subtitle}</Text>}
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

function toListItem(pref: ReminderPreference): ReminderPreferenceListItem {
  return { type: pref.type, isEnabled: pref.isEnabled, sendTime: pref.sendTime };
}

const ds_c = {
  bg: palette.bg,
  card: palette.card,
  border: palette.border,
  text: palette.text,
  textSoft: palette.textSoft,
  muted: palette.muted,
  primaryDark: palette.primaryDark,
  error: palette.error,
};

const ds = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds_c.bg },
  headerGreeting: { fontSize: 12, fontWeight: "600", color: ds_c.primaryDark, letterSpacing: 0.3, marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: "700", color: ds_c.text, letterSpacing: -0.3 },
  headerDate: { fontSize: 13, color: ds_c.textSoft, marginTop: 4, textTransform: "capitalize" },
  headerSub: { fontSize: 14, color: ds_c.textSoft, marginTop: 2 },
  hijri: { fontSize: 12, color: ds_c.muted, marginTop: 2 },

  nextPrayerCard: {
    backgroundColor: ds_c.primaryDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  nextPrayerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  nextPrayerLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1 },
  nextPrayerName: { fontSize: 18, fontWeight: "700", color: "#fff", marginTop: 2 },
  nextPrayerTime: { fontSize: 28, fontWeight: "800", color: "#fff" },
  nextPrayerCountdown: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.7)", marginTop: 2 },

  ramadanBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A2332",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  ramadanBannerTitle: { fontSize: 14, fontWeight: "700", color: "#fff" },
  ramadanBannerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  ramadanDayBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFC107",
    alignItems: "center",
    justifyContent: "center",
  },
  ramadanDayBadgeText: { fontSize: 18, fontWeight: "800", color: "#1A2332" },

  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: ds_c.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: ds_c.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statLabel: { fontSize: 11, fontWeight: "600", color: ds_c.muted, textTransform: "uppercase", letterSpacing: 1 },
  statValue: { fontSize: 13, fontWeight: "600", color: ds_c.text, marginTop: 2 },
  statExtra: { fontSize: 11, color: ds_c.textSoft, marginTop: 2 },

  section: {
    backgroundColor: ds_c.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ds_c.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: ds_c.text },
  sectionSub: { fontSize: 13, color: ds_c.textSoft, marginTop: 2 },
  subHeading: { fontSize: 15, fontWeight: "600", color: ds_c.text },

  errorText: { color: ds_c.error, fontSize: 13 },
  mutedText: { color: ds_c.textSoft, fontSize: 13 },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  switchLabel: { fontSize: 14, fontWeight: "600", color: ds_c.text, flex: 1, marginRight: 8 },

  input: {
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: ds_c.text,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  primaryBtn: {
    backgroundColor: palette.primaryDark,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  outlineBtn: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  outlineBtnText: { color: ds_c.text, fontWeight: "600", fontSize: 13 },

  smallBtn: {
    backgroundColor: palette.primaryDark,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  smallBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  infoRow: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  infoTitle: { fontSize: 14, fontWeight: "600", color: ds_c.text },
  infoSub: { fontSize: 12, color: ds_c.textSoft },

  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  entryTitle: { fontSize: 14, fontWeight: "600", color: ds_c.text },
  entrySub: { fontSize: 12, color: ds_c.textSoft },

  prayerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  prayerKey: { fontSize: 13, fontWeight: "600", color: ds_c.textSoft, textTransform: "uppercase", letterSpacing: 1.5 },
  prayerVal: { fontSize: 14, fontWeight: "700", color: ds_c.text },

  miniStat: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  miniStatLabel: { fontSize: 10, fontWeight: "600", color: ds_c.muted, textTransform: "uppercase", letterSpacing: 1 },
  miniStatVal: { fontSize: 18, fontWeight: "700", color: ds_c.text },

  toast: {
    backgroundColor: ds_c.card,
    borderWidth: 1,
    borderColor: ds_c.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },

  dhikrTotal: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  dhikrTotalNum: { fontSize: 28, fontWeight: "700", color: ds_c.text },

  catLabel: { fontSize: 11, fontWeight: "600", color: ds_c.muted, textTransform: "uppercase", letterSpacing: 1.5 },

  chip: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: palette.primaryDark,
  },

  arabicCard: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  arabicText: {
    fontSize: 22,
    color: "#1B3A2D",
    textAlign: "right",
    lineHeight: 38,
    fontFamily: "Amiri-Regular",
  },

  dailyCard: {
    backgroundColor: ds_c.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: ds_c.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  dailyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(26,127,100,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  dailyLabel: { fontSize: 14, fontWeight: "700", color: ds_c.text },
  dailyArabic: {
    fontSize: 22,
    lineHeight: 40,
    color: "#1B3A2D",
    textAlign: "right",
    fontFamily: "Amiri-Regular",
    marginBottom: 8,
  },
  dailyTranslit: { fontSize: 13, fontStyle: "italic", color: "#6B4C3B", lineHeight: 20, marginBottom: 4 },
  dailyTranslation: { fontSize: 14, color: ds_c.textSoft, lineHeight: 22, marginBottom: 8 },
  dailySource: { fontSize: 11, color: ds_c.muted, fontWeight: "600" },
});
