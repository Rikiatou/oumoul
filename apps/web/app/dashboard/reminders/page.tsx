"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  ReminderType,
  type ReminderPreference,
  type ReminderPreferenceListItem,
  type UpdateReminderPreferencePayload,
} from "@oumoul/api";
import { remindersApi } from "@/lib/api";
import { colors, spacing } from "@oumoul/ui";
import { useAuth } from "@/context/auth-context";

interface ReminderUIState {
  list: ReminderPreferenceListItem[];
  loading: boolean;
  error: string | null;
  updating: Record<ReminderType, boolean>;
  times: Record<ReminderType, string>;
}

const reminderLabels: Record<ReminderType, string> = {
  [ReminderType.AfterEid]: "6 jours après l’Aïd",
  [ReminderType.WeeklyMonday]: "Lundi",
  [ReminderType.WeeklyThursday]: "Jeudi",
  [ReminderType.Monthly]: "Jours blancs",
  [ReminderType.Custom]: "Personnalisés",
  [ReminderType.ImaneProgramDaily]: "Programme Imane",
  [ReminderType.RamadanDailyCheckin]: "Check-in Ramadan",
};

const reminderDescriptions: Record<ReminderType, string> = {
  [ReminderType.AfterEid]: "6 jours recommandés après l’Aïd al-Fitr.",
  [ReminderType.WeeklyMonday]: "Rappel récurrent chaque lundi matin.",
  [ReminderType.WeeklyThursday]: "Rappel récurrent chaque jeudi.",
  [ReminderType.Monthly]: "Jours blancs : 13-14-15 de chaque mois lunaire.",
  [ReminderType.Custom]: "Rappels configurés manuellement depuis ton plan.",
  [ReminderType.ImaneProgramDaily]: "Rappel quotidien pour ton programme Imane.",
  [ReminderType.RamadanDailyCheckin]: "Rappel quotidien pour valider ta journée de Ramadan.",
};

const REMINDER_TYPES: ReminderType[] = [
  ReminderType.AfterEid,
  ReminderType.WeeklyMonday,
  ReminderType.WeeklyThursday,
  ReminderType.Monthly,
  ReminderType.Custom,
  ReminderType.ImaneProgramDaily,
  ReminderType.RamadanDailyCheckin,
];

function createReminderRecord<T>(initial: T): Record<ReminderType, T> {
  return REMINDER_TYPES.reduce((acc, type) => {
    acc[type] = initial;
    return acc;
  }, {} as Record<ReminderType, T>);
}

export default function RemindersDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [state, setState] = useState<ReminderUIState>({
    list: [],
    loading: true,
    error: null,
    updating: createReminderRecord(false),
    times: createReminderRecord(""),
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  const loadReminders = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const list = await remindersApi.listPreferences();
      const times = createReminderRecord("");
      for (const pref of list) {
        const type = pref.type as ReminderType;
        times[type] = pref.sendTime ?? "";
      }
      setState({
        list,
        loading: false,
        error: null,
        updating: createReminderRecord(false),
        times,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger les rappels.";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    if (!authLoading && user) {
      queueMicrotask(() => {
        if (!isActive) return;
        void loadReminders();
      });
    }
    return () => {
      isActive = false;
    };
  }, [authLoading, user, loadReminders]);

  const updateReminder = useCallback(
    async (type: ReminderType, payload: UpdateReminderPreferencePayload) => {
      setState((prev) => ({
        ...prev,
        updating: { ...prev.updating, [type]: true },
        error: null,
      }));
      try {
        const updated = await remindersApi.updatePreference(type, payload);
        setState((prev) => ({
          ...prev,
          list: prev.list.map((pref) => (pref.type === type ? toListItem(updated) : pref)),
          updating: { ...prev.updating, [type]: false },
          times: { ...prev.times, [type]: updated.sendTime ?? "" },
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de mettre à jour le rappel.";
        setState((prev) => ({
          ...prev,
          error: message,
          updating: { ...prev.updating, [type]: false },
        }));
      }
    },
    [],
  );

  const handleToggle = useCallback(
    (pref: ReminderPreferenceListItem) => {
      void updateReminder(pref.type, {
        isEnabled: !pref.isEnabled,
        sendTime: pref.sendTime ?? undefined,
      });
    },
    [updateReminder],
  );

  const handleTimeBlur = useCallback(
    (pref: ReminderPreferenceListItem, inputTime: string) => {
      const trimmed = inputTime.trim();
      if ((pref.sendTime ?? "") === trimmed) {
        return;
      }
      void updateReminder(pref.type, {
        isEnabled: pref.isEnabled,
        sendTime: trimmed || undefined,
      });
    },
    [updateReminder],
  );

  const activeReminders = useMemo(
    () => state.list.filter((pref) => pref.isEnabled),
    [state.list],
  );

  if (authLoading) {
    return (
      <div style={fullPageFallbackStyle}>
        <p>Chargement…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Rappels actifs</h2>
          <p style={sectionSubtitleStyle}>
            Ajuste les rappels planifiés depuis le service de jeûne. Les modifications prennent effet immédiatement.
          </p>
        </div>
        {state.error && <p style={{ color: "#ffb4ab" }}>{state.error}</p>}
        {state.loading ? (
          <p>Chargement des préférences…</p>
        ) : state.list.length === 0 ? (
          <p style={{ opacity: 0.75 }}>Aucune préférence enregistrée.</p>
        ) : (
          <div style={{ display: "grid", gap: spacing.sm }}>
            {state.list.map((pref) => (
              <div key={pref.type} style={reminderItemStyle}>
                <div style={{ display: "grid", gap: spacing.xs }}>
                  <div style={{ display: "flex", gap: spacing.sm, alignItems: "center", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 16 }}>{reminderLabels[pref.type]}</strong>
                    <span style={{ opacity: 0.7, fontSize: 13 }}>
                      {pref.isEnabled ? "Activé" : "Désactivé"}
                    </span>
                  </div>
                  <p style={{ opacity: 0.75 }}>{reminderDescriptions[pref.type]}</p>
                </div>
                <div style={controlsStyle}>
                  <label style={timeLabelStyle}>
                    Heure d’envoi
                    <input
                      type="time"
                      value={state.times[pref.type] ?? ""}
                      onChange={(event) =>
                        setState((prev) => ({
                          ...prev,
                          times: { ...prev.times, [pref.type]: event.target.value },
                        }))
                      }
                      onBlur={() => handleTimeBlur(pref, state.times[pref.type] ?? "")}
                      disabled={!pref.isEnabled || state.updating[pref.type]}
                      style={{
                        ...inputStyle,
                        width: 140,
                        marginTop: spacing.xs,
                        backgroundColor: "rgba(255,255,255,0.1)",
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleToggle(pref)}
                    disabled={state.updating[pref.type]}
                    style={{
                      padding: `${spacing.xs}px ${spacing.md}px`,
                      borderRadius: spacing.md,
                      border: "1px solid rgba(255,255,255,0.4)",
                      backgroundColor: pref.isEnabled ? colors.neutral100 : "transparent",
                      color: pref.isEnabled ? colors.primary : colors.neutral100,
                      fontWeight: 600,
                      opacity: state.updating[pref.type] ? 0.6 : 1,
                    }}
                  >
                    {pref.isEnabled ? "Désactiver" : "Activer"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Récapitulatif</h2>
          <p style={sectionSubtitleStyle}>
            Vue rapide des rappels qui resteront actifs pour les prochains jours.
          </p>
        </div>
        {state.loading ? (
          <p>Chargement…</p>
        ) : activeReminders.length === 0 ? (
          <p style={{ opacity: 0.75 }}>Aucun rappel actif pour l’instant.</p>
        ) : (
          <ul style={summaryListStyle}>
            {activeReminders.map((pref) => (
              <li key={pref.type} style={summaryItemStyle}>
                <div>
                  <strong>{reminderLabels[pref.type]}</strong>
                  <p style={{ opacity: 0.75 }}>{reminderDescriptions[pref.type]}</p>
                </div>
                <span style={{ fontWeight: 600 }}>
                  {state.times[pref.type] ? `${state.times[pref.type]}` : "Heure par défaut"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function toListItem(pref: ReminderPreference): ReminderPreferenceListItem {
  return { type: pref.type, isEnabled: pref.isEnabled, sendTime: pref.sendTime };
}

const containerStyle: CSSProperties = {
  maxWidth: 940,
  margin: "0 auto",
  display: "grid",
  gap: spacing.lg,
};

const sectionStyle: CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.35)",
  borderRadius: spacing.lg,
  padding: `${spacing.lg * 1.5}px`,
  border: "1px solid rgba(255,255,255,0.12)",
  display: "grid",
  gap: spacing.lg,
};

const sectionHeaderStyle: CSSProperties = {
  display: "grid",
  gap: spacing.xs,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  margin: 0,
};

const sectionSubtitleStyle: CSSProperties = {
  opacity: 0.78,
  lineHeight: 1.6,
  margin: 0,
};

const reminderItemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: spacing.lg,
  alignItems: "flex-start",
  flexWrap: "wrap",
  backgroundColor: "rgba(0,0,0,0.3)",
  borderRadius: spacing.md,
  padding: `${spacing.md}px`,
};

const controlsStyle: CSSProperties = {
  display: "grid",
  gap: spacing.xs,
  justifyItems: "flex-start",
};

const timeLabelStyle: CSSProperties = {
  display: "grid",
  gap: spacing.xs,
  fontSize: 13,
  opacity: 0.85,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: spacing.md,
  border: "1px solid rgba(255,255,255,0.25)",
  backgroundColor: "rgba(255,255,255,0.12)",
  color: colors.neutral100,
  fontSize: 15,
  outline: "none",
};

const summaryListStyle: CSSProperties = {
  listStyle: "none",
  display: "grid",
  gap: spacing.sm,
  padding: 0,
  margin: 0,
};

const summaryItemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "rgba(0,0,0,0.3)",
  borderRadius: spacing.md,
  padding: `${spacing.sm}px ${spacing.md}px`,
};

const fullPageFallbackStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.primary,
  color: colors.neutral100,
};
