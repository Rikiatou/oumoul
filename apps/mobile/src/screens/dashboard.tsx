import { useMemo, useCallback, useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  AppState,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "@oumoul/ui";
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
  scheduleIftarReminder,
  scheduleSuhoorReminder,
  syncPushTokenWithBackend,
} from "../push-notifications";
import * as SecureStore from "expo-secure-store";
import { t, Locale } from "../i18n";
import { prayerSettingsStorage } from "./prayer-settings";

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

function getHijriDateLabel(locale: string = "fr-FR") {
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
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

interface ReminderUIState {
  list: ReminderPreferenceListItem[];
  loading: boolean;
  error: string | null;
  updating: Record<ReminderType, boolean>;
  times: Record<ReminderType, string>;
}

export function DashboardScreen({ user }: { user: AuthUser }) {
  const { logout } = useAuth();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const locale = (user.locale as Locale | undefined) ?? "fr";

  const [prayerForm, setPrayerForm] = useState({
    latitude: DEFAULT_COORDS.latitude,
    longitude: DEFAULT_COORDS.longitude,
    date: "",
    timeZone: DEFAULT_COORDS.timeZone,
  });

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

      const result = await prayerApi.getPrayerTimes(params);
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

  const palette = {
    primary: colors.primary,
    surface: "#111827",
  };

  const hijriLabel = useMemo(() => getHijriDateLabel(user.locale ?? "fr-FR"), [user.locale]);

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <ScrollView
        contentContainerStyle={{ paddingVertical: 32, paddingHorizontal: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshAll()} tintColor={colors.neutral100} />}
      >
        <View className="mb-xl">
          <Text className="text-neutral-100 text-xs tracking-[4px] uppercase">{user.firstName || user.email}</Text>
          <Text className="text-neutral-100 text-3xl font-bold mt-sm">
            {t(locale, "dash.header.title", "Tableau de bord quotidien")}
          </Text>
          <Text className="text-neutral-100/80 text-base leading-6 mt-xs">
            {t(
              locale,
              "dash.header.subtitle",
              "Consulte les horaires, vérifie tes journaux de jeûne, enregistre ton dhikr et ajuste tes rappels.",
            )}
          </Text>
          {hijriLabel ? <Text className="text-neutral-100/60 text-sm mt-[4px]">Hijri · {hijriLabel}</Text> : null}
          <TouchableOpacity
            className="self-start mt-md border border-white/60 rounded-md px-md py-xs"
            onPress={() => void onLogout()}
            disabled={logoutBusy}
          >
            <Text style={{ color: colors.neutral100, fontWeight: "600", opacity: logoutBusy ? 0.6 : 1 }}>
              {logoutBusy ? t(locale, "dash.button.calculating", "Déconnexion…") : t(locale, "dash.logout", "Se déconnecter")}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap gap-sm mb-lg">
          <View className="bg-white/10 rounded-xl px-md py-sm" style={{ minWidth: 160 }}>
            <Text className="text-neutral-100/70 text-xs tracking-[2px] uppercase">
              {t(locale, "dash.prayer.status.title", "Prière")}
            </Text>
            <Text className="text-neutral-100 font-semibold mt-[2px]">{prayerStatusText}</Text>
          </View>
          <View className="bg-white/10 rounded-xl px-md py-sm" style={{ minWidth: 160 }}>
            <Text className="text-neutral-100/70 text-xs tracking-[2px] uppercase">
              {t(locale, "dash.ramadan.title", "Ramadan")}
            </Text>
            <Text className="text-neutral-100 font-semibold mt-[2px]">{ramadanTodayText}</Text>
            {ramadanProgressText ? (
              <Text className="text-neutral-100/70 text-xs mt-[2px]">{ramadanProgressText}</Text>
            ) : null}
          </View>
          {fastingSummary && (
            <View className="bg-white/10 rounded-xl px-md py-sm" style={{ minWidth: 160 }}>
              <Text className="text-neutral-100/70 text-xs tracking-[2px] uppercase">
                {t(locale, "dash.makeup.title", "Rattrapages")}
              </Text>
              <Text className="text-neutral-100 font-semibold mt-[2px]">
                {fastingSummary.outstandingMakeupDays} {t(locale, "dash.makeup.label", "jour(s) à rattraper")}
              </Text>
            </View>
          )}
        </View>

        <Section
          title={t(locale, "notif.local.title", "Notifications locales")}
          subtitle={t(locale, "notif.local.subtitle", "Adhan, Suhoor, Iftar (sur cet appareil)")}
        >
          {localReminderLoading ? (
            <ActivityIndicator color={colors.neutral100} />
          ) : (
            <View className="gap-sm">
              {localReminderError ? <Text className="text-[#ffb4ab]">{localReminderError}</Text> : null}
              <Text className="text-neutral-100/70 text-sm">{t(locale, "notif.local.help")}</Text>
              <TouchableOpacity
                className="self-start border border-white/50 rounded-md px-sm py-xs"
                onPress={() => void showScheduledLocalNotifications()}
              >
                <Text className="text-neutral-100 text-xs font-semibold">Voir les notifications programmées</Text>
              </TouchableOpacity>
              {LOCAL_REMINDER_TYPES.map((type) => (
                <View key={type} className="bg-white/10 rounded-lg px-md py-sm flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="text-neutral-100 font-semibold">
                      {t(locale, `notif.local.label.${type}`, LOCAL_REMINDER_LABELS[type])}
                    </Text>
                  </View>
                  <Switch
                    value={localReminderEnabled[type]}
                    onValueChange={() => void toggleLocalReminder(type)}
                    trackColor={{ true: colors.neutral100, false: "rgba(255,255,255,0.2)" }}
                    thumbColor={localReminderEnabled[type] ? colors.primary : colors.neutral100}
                  />
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section
          title={t(locale, "dash.makeup.plan.title", "Plan de rattrapage (push)")}
          subtitle={t(locale, "dash.makeup.plan.subtitle", "Rappels automatiques pour rattraper tes jours manqués.")}
        >
          {makeupPlanError ? <Text className="text-[#ffb4ab]">{makeupPlanError}</Text> : null}

          {fastingLoading ? (
            <ActivityIndicator color={colors.neutral100} />
          ) : makeupPlan?.isActive ? (
            <View className="gap-sm">
              <View className="bg-white/10 rounded-lg px-md py-sm">
                <Text className="text-neutral-100 font-semibold">
                  {t(locale, "dash.makeup.plan.active", "Plan actif")} · {MAKEUP_STRATEGY_LABELS[makeupPlan.strategy]}
                </Text>
                <Text className="text-neutral-100/70 text-sm">
                  {makeupPlan.completedDays}/{makeupPlan.targetDays} {t(locale, "dash.makeup.plan.done", "fait(s)")}
                </Text>
              </View>

              {upcomingMakeupEntries.length === 0 ? (
                <Text className="text-neutral-100/70">
                  {t(locale, "dash.makeup.plan.none", "Aucune date à venir. Tu peux créer un nouveau plan si besoin.")}
                </Text>
              ) : (
                <View className="gap-xs">
                  {upcomingMakeupEntries.map((entry) => (
                    <View key={entry.id} className="bg-white/10 rounded-lg px-md py-sm flex-row items-center justify-between gap-sm">
                      <View className="flex-1">
                        <Text className="text-neutral-100 font-semibold">{formatDate(entry.scheduledDate)}</Text>
                        <Text className="text-neutral-100/70 text-sm">{entry.status}</Text>
                      </View>
                      <TouchableOpacity
                        className="bg-neutral-100 rounded-lg px-md py-xs"
                        onPress={() => void handleCompleteMakeupEntry(entry)}
                        disabled={makeupPlanUpdatingEntryId === entry.id}
                      >
                        <Text style={{ color: colors.primary, fontWeight: "700", opacity: makeupPlanUpdatingEntryId === entry.id ? 0.6 : 1 }}>
                          {makeupPlanUpdatingEntryId === entry.id
                            ? t(locale, "dash.makeup.plan.updating", "…")
                            : t(locale, "dash.makeup.plan.complete", "Fait")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View className="gap-sm">
              <Text className="text-neutral-100/80">
                {fastingSummary
                  ? `${fastingSummary.outstandingMakeupDays} ${t(locale, "dash.makeup.label", "jour(s) à rattraper")}`
                  : t(locale, "dash.makeup.loading", "Chargement des rattrapages…")}
              </Text>

              <View className="flex-row flex-wrap gap-sm">
                <TouchableOpacity
                  className="bg-neutral-100 rounded-lg px-md py-sm"
                  onPress={() => void handleCreateMakeupPlan(MakeupStrategy.MondaysThursdays)}
                  disabled={!canCreateMakeupPlan || makeupPlanCreating}
                >
                  <Text style={{ color: colors.primary, fontWeight: "700", opacity: !canCreateMakeupPlan || makeupPlanCreating ? 0.6 : 1 }}>
                    {t(locale, "dash.makeup.plan.create.mondayThursday", "Créer (Lun/Jeu)")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="border border-white/40 rounded-lg px-md py-sm"
                  onPress={() => void handleCreateMakeupPlan(MakeupStrategy.SixDaysAfterEid)}
                  disabled={!canCreateMakeupPlan || makeupPlanCreating}
                >
                  <Text style={{ color: colors.neutral100, fontWeight: "700", opacity: !canCreateMakeupPlan || makeupPlanCreating ? 0.6 : 1 }}>
                    {t(locale, "dash.makeup.plan.create.afterEid", "Créer (Après Aïd)")}
                  </Text>
                </TouchableOpacity>
              </View>

              {!canCreateMakeupPlan && fastingSummary?.outstandingMakeupDays === 0 ? (
                <Text className="text-neutral-100/70">
                  {t(locale, "dash.makeup.plan.zero", "Aucun rattrapage en attente.")}
                </Text>
              ) : null}
            </View>
          )}
        </Section>

        {toast ? (
          <View className="bg-white/10 border border-white/20 rounded-lg px-md py-sm mt-sm">
            <Text className="text-neutral-100">{toast}</Text>
          </View>
        ) : null}

        <Section
          title={t(locale, "dash.reminders.section.title", "Rappels")}
          subtitle={t(locale, "dash.reminders.subtitle.detail", "Rappels backend (serveur).")}
        >
          {reminderState.error ? <Text className="text-[#ffb4ab]">{reminderState.error}</Text> : null}
          <View className="flex-row items-center gap-sm">
            <Text className="text-neutral-100/80 text-sm flex-1">
              Paramètre la réception de certains rappels côté serveur (dans le cloud).
            </Text>
          </View>
        </Section>

        <Section
          title={t(locale, "dash.prayer.section.title", "Horaires de prière")}
          subtitle={t(locale, "dash.prayer.section.subtitle", "Définis ta position pour calculer les horaires.")}
        >
          <View className="gap-sm">
            <View className="flex-row gap-sm">
              <TextInput
                className="flex-1 bg-white/10 text-neutral-100 rounded-lg px-md py-sm"
                placeholder="Latitude"
                placeholderTextColor="rgba(255,255,255,0.6)"
                keyboardType="decimal-pad"
                value={prayerForm.latitude}
                onChangeText={(value) => setPrayerForm((prev) => ({ ...prev, latitude: value }))}
              />
              <TextInput
                className="flex-1 bg-white/10 text-neutral-100 rounded-lg px-md py-sm"
                placeholder="Longitude"
                placeholderTextColor="rgba(255,255,255,0.6)"
                keyboardType="decimal-pad"
                value={prayerForm.longitude}
                onChangeText={(value) => setPrayerForm((prev) => ({ ...prev, longitude: value }))}
              />
            </View>
            <TextInput
              className="bg-white/10 text-neutral-100 rounded-lg px-md py-sm"
              placeholder="Date (AAAA-MM-JJ)"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={prayerForm.date}
              onChangeText={(value) => setPrayerForm((prev) => ({ ...prev, date: value }))}
            />
            <TextInput
              className="bg-white/10 text-neutral-100 rounded-lg px-md py-sm"
              placeholder="Fuseau horaire"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={prayerForm.timeZone}
              onChangeText={(value) => setPrayerForm((prev) => ({ ...prev, timeZone: value }))}
            />
            <TouchableOpacity
              className="bg-neutral-100 rounded-lg py-sm items-center"
              disabled={prayerLoading}
              onPress={() => void fetchPrayer()}
            >
              <Text style={{ color: palette.surface, fontWeight: "700" }}>
                {prayerLoading
                  ? t(locale, "dash.button.calculating", "Calcul…")
                  : t(locale, "dash.button.show", "Afficher")}
              </Text>
            </TouchableOpacity>
            {prayerError && <Text className="text-[#ffb4ab]">{prayerError}</Text>}
            {prayerResult && (
              <View className="bg-white/10 rounded-lg px-md py-sm gap-xs">
                <Text className="text-neutral-100/80">
                  {prayerResult.location.timeZone} · {formatDate(prayerResult.date)}
                </Text>
                <View className="mt-sm">
                  {prayerTimesEntries.map(([key, value]) => (
                    <View key={key} className="flex-row justify-between bg-white/5 rounded-md px-md py-sm mb-xs">
                      <Text className="text-neutral-100 uppercase tracking-[2px]">{key}</Text>
                      <Text className="text-neutral-100 font-semibold">{formatTime(value)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </Section>

        <Section
          title={t(locale, "dash.ramadan.section.title", "Suivi du jeûne (30j)")}
          subtitle={t(locale, "dash.ramadan.subtitle", "Résumé de ton Ramadan pour l’année en cours.")}
        >
          {ramadanLoading ? (
            <ActivityIndicator color={colors.neutral100} />
          ) : ramadanError ? (
            <Text className="text-[#ffb4ab]">{ramadanError}</Text>
          ) : !ramadanSummary ? (
            <Text className="text-neutral-100/80">{t(locale, "dash.ramadan.today.none", "Ramadan: pas de statut saisi")}</Text>
          ) : (
            <View className="gap-sm">
              <View className="flex-wrap flex-row gap-sm">
                {FASTING_STATUS_ORDER.map((status) => (
                  <View key={status} className="bg-white/10 rounded-lg px-md py-sm">
                    <Text className="text-neutral-100 uppercase text-xs tracking-[2px]">
                      {FASTING_STATUS_LABELS[status]}
                    </Text>
                    <Text className="text-neutral-100 text-xl font-semibold">{ramadanStatusCounts[status] ?? 0}</Text>
                  </View>
                ))}
              </View>
              <View>
                <Text className="text-neutral-100 text-lg font-semibold mb-sm">
                  {t(locale, "dash.ramadan.recentDays", "Jours récents")}
                </Text>
                {ramadanSummary.days.length === 0 ? (
                  <Text className="text-neutral-100/70">{t(locale, "dash.ramadan.noDays", "Aucun jour enregistré pour Ramadan.")}</Text>
                ) : (
                  <View className="gap-xs">
                    {ramadanSummary.days
                      .slice()
                      .sort((a: RamadanDaySummary, b: RamadanDaySummary) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 7)
                      .map((day) => (
                        <View key={day.date} className="bg-white/10 rounded-lg px-md py-sm">
                          <Text className="text-neutral-100 font-semibold">{formatDate(day.date)}</Text>
                          <Text className="text-neutral-100/80">
                            {day.fastStatus ? FASTING_STATUS_LABELS[day.fastStatus] : t(locale, "dash.ramadan.unknown", "Non renseigné")}
                            {day.cycleStatus ? ` · ${t(locale, "dash.cycle.label", "Cycle")}: ${day.cycleStatus}` : ""}
                            {day.notes ? ` · ${day.notes}` : ""}
                          </Text>
                        </View>
                      ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </Section>

        <Section
          title={t(locale, "dash.dhikr.section.title", "Dhikr")}
          subtitle={t(locale, "dash.dhikr.subtitle", "Sélectionne un dhikr et enregistre un nouveau décompte.")}
        >
          {dhikrLoading ? (
            <ActivityIndicator color={colors.neutral100} />
          ) : dhikrError ? (
            <Text className="text-[#ffb4ab]">{dhikrError}</Text>
          ) : dhikrEntries.length === 0 ? (
            <Text className="text-neutral-100/80">{t(locale, "dash.dhikr.none", "Aucun dhikr enregistré.")}</Text>
          ) : (
            <View className="gap-md">
              <View className="bg-white/5 rounded-xl p-md gap-sm">
                <Text className="text-neutral-100/80 text-sm">{t(locale, "dash.dhikr.total", "Total enregistré")}</Text>
                <Text className="text-neutral-100 text-3xl font-bold">{dhikrTotalCount}</Text>
              </View>
              <View className="gap-sm">
                <Text className="text-neutral-100 text-lg font-semibold">{t(locale, "dash.dhikr.formula", "Formule")}</Text>
                <View className="gap-xs">
                  {dhikrCategories.map((category) => (
                    <View key={category.id} className="gap-1">
                      <Text className="text-neutral-100/70 text-sm uppercase tracking-[2px]">{category.name}</Text>
                      <View className="flex-row flex-wrap gap-xs">
                        {category.entries.map((entry) => {
                          const isActive = entry.id === dhikrForm.entryId;
                          return (
                            <TouchableOpacity
                              key={entry.id}
                              className={`px-md py-xs rounded-lg ${isActive ? "bg-neutral-100" : "bg-white/10"}`}
                              onPress={() => handleDhikrEntryChange(entry.id)}
                            >
                              <Text
                                style={{
                                  color: isActive ? colors.primary : colors.neutral100,
                                  fontWeight: isActive ? "700" : "500",
                                }}
                              >
                                {entry.title}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
                <View className="gap-sm mt-sm">
                  <TextInput
                    className="bg-white/10 text-neutral-100 rounded-lg px-md py-sm"
                    placeholder={t(locale, "dash.dhikr.count", "Comptage")}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    keyboardType="number-pad"
                    value={String(dhikrForm.count)}
                    onChangeText={handleDhikrCountChange}
                  />
                  <TextInput
                    className="bg-white/10 text-neutral-100 rounded-lg px-md py-sm"
                    placeholder={t(locale, "dash.dhikr.notes", "Notes")}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    multiline
                    value={dhikrForm.notes}
                    onChangeText={handleDhikrNotesChange}
                    numberOfLines={3}
                    style={{ textAlignVertical: "top" }}
                  />
                  <TouchableOpacity
                    className="bg-neutral-100 rounded-lg py-sm items-center"
                    onPress={() => void handleDhikrSave()}
                    disabled={dhikrSaving || !dhikrForm.entryId}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "700", opacity: dhikrSaving ? 0.6 : 1 }}>
                      {dhikrSaving
                        ? t(locale, "dash.dhikr.saving", "Enregistrement…")
                        : t(locale, "dash.dhikr.save", "Enregistrer")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {activeDhikrEntry && (
                <View className="bg-white/5 rounded-xl p-md gap-sm">
                  <Text className="text-neutral-100 text-lg font-semibold">{activeDhikrEntry.title}</Text>
                  <Text className="text-neutral-100 text-2xl text-right" style={{ lineHeight: 36 }}>
                    {activeDhikrEntry.arabicText}
                  </Text>
                  {activeDhikrEntry.translit && <Text className="text-neutral-100/80">{activeDhikrEntry.translit}</Text>}
                  {activeDhikrEntry.translation && <Text className="text-neutral-100/80">{activeDhikrEntry.translation}</Text>}
                  {activeDhikrEntry.source && <Text className="text-neutral-100/60 text-sm">Source · {activeDhikrEntry.source}</Text>}
                </View>
              )}

              <View className="gap-sm">
                <Text className="text-neutral-100 text-lg font-semibold">
                  {t(locale, "dash.dhikr.history", "Historique récent")}
                </Text>
                {dhikrRecords.length === 0 ? (
                  <Text className="text-neutral-100/70">{t(locale, "dash.dhikr.history.none", "Aucun enregistrement pour l’instant.")}</Text>
                ) : (
                  <View className="gap-xs">
                    {dhikrRecords.map((record) => (
                      <View key={record.id} className="bg-white/10 rounded-lg px-md py-sm gap-xs">
                        <View className="flex-row justify-between">
                          <View>
                            <Text className="text-neutral-100 font-semibold">{record.entry.title}</Text>
                            <Text className="text-neutral-100/70 text-xs">
                              {new Date(record.notedAt).toLocaleString(user.locale ?? "fr")}
                            </Text>
                          </View>
                          <Text className="text-neutral-100 text-2xl font-bold">{record.count}</Text>
                        </View>
                        {record.notes && <Text className="text-neutral-100/80">{record.notes}</Text>}
                        <View className="flex-row justify-end gap-sm">
                          <TouchableOpacity
                            className="border border-white/40 rounded-md px-md py-xs"
                            onPress={() => void handleDhikrIncrement(record)}
                          >
                            <Text className="text-neutral-100 font-semibold">+1</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            className="border border-[#ffb4ab]/60 rounded-md px-md py-xs"
                            onPress={() => void handleDhikrDelete(record.id)}
                            disabled={dhikrDeletingId === record.id}
                          >
                            <Text className="text-[#ffb4ab] font-semibold">
                              {dhikrDeletingId === record.id
                                ? t(locale, "dash.common.deleting", "Suppression…")
                                : t(locale, "dash.common.delete", "Supprimer")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </Section>

        <Section title="Rappels personnalisés" subtitle="Active ou ajuste tes notifications.">
          {reminderState.loading ? (
            <ActivityIndicator color={colors.neutral100} />
          ) : reminderState.error ? (
            <Text className="text-[#ffb4ab]">{reminderState.error}</Text>
          ) : reminderState.list.length === 0 ? (
            <Text className="text-neutral-100/80">Aucun rappel configuré.</Text>
          ) : (
            <View className="gap-sm">
              {reminderState.list.map((pref) => (
                <View key={pref.type} className="bg-white/10 rounded-lg px-md py-sm gap-xs">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text className="text-neutral-100 font-semibold">{REMINDER_LABELS[pref.type]}</Text>
                      <Text className="text-neutral-100/70 text-sm">
                        {pref.sendTime ? `Envoi à ${pref.sendTime}` : "Heure par défaut"}
                      </Text>
                    </View>
                    <Switch
                      value={pref.isEnabled}
                      onValueChange={() => void handleReminderToggle(pref)}
                      trackColor={{ true: colors.neutral100, false: "rgba(255,255,255,0.2)" }}
                      thumbColor={pref.isEnabled ? colors.primary : colors.neutral100}
                      disabled={reminderState.updating[pref.type]}
                    />
                  </View>
                  <TextInput
                    className="bg-white/10 text-neutral-100 rounded-lg px-md py-sm"
                    placeholder="HH:MM"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={reminderState.times[pref.type] ?? ""}
                    onChangeText={(value) =>
                      setReminderState((prev) => ({
                        ...prev,
                        times: { ...prev.times, [pref.type]: value },
                      }))
                    }
                    onEndEditing={() => void handleReminderTimeBlur(pref, reminderState.times[pref.type] ?? "")}
                    editable={pref.isEnabled && !reminderState.updating[pref.type]}
                  />
                </View>
              ))}
            </View>
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View className="bg-black/30 rounded-2xl px-lg py-lg mb-xl">
      <Text className="text-neutral-100 text-xl font-semibold">{title}</Text>
      {subtitle && <Text className="text-neutral-100/70 mt-xs">{subtitle}</Text>}
      <View className="mt-md">{children}</View>
    </View>
  );
}

function toListItem(pref: ReminderPreference): ReminderPreferenceListItem {
  return { type: pref.type, isEnabled: pref.isEnabled, sendTime: pref.sendTime };
}
