"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  FastingLogStatus,
  MakeupStrategy,
  type FastingLog,
  type FastingSummary,
  type MakeupPlan,
  type MakeupPlanEntry,
} from "@oumoul/api";
import { fastingApi } from "@/lib/api";
import { colors, spacing } from "@oumoul/ui";
import { useAuth } from "@/context/auth-context";

type LogDraft = {
  status: FastingLogStatus;
  notes: string;
};

type LogFormState = {
  date: string;
  status: FastingLogStatus;
  notes: string;
};

const fastingStatusLabels: Record<FastingLogStatus, string> = {
  [FastingLogStatus.FASTED]: "Jeûné",
  [FastingLogStatus.MISSED]: "Manqué",
  [FastingLogStatus.MADE_UP]: "Rattrapé",
  [FastingLogStatus.EXEMPTION]: "Dispense",
};

const fastingStatusOptions = Object.entries(fastingStatusLabels).map(([value, label]) => ({
  value: value as FastingLogStatus,
  label,
}));

const makeupStrategyLabels: Record<MakeupStrategy, string> = {
  [MakeupStrategy.SixDaysAfterEid]: "6 jours après l’Aïd",
  [MakeupStrategy.MondaysThursdays]: "Lundis & jeudis",
  [MakeupStrategy.WhiteDays]: "Jours blancs",
  [MakeupStrategy.Custom]: "Personnalisé",
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function FastingDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<FastingSummary | null>(null);
  const [logs, setLogs] = useState<FastingLog[]>([]);
  const [logDrafts, setLogDrafts] = useState<Record<string, LogDraft>>({});
  const [plan, setPlan] = useState<(MakeupPlan & { entries?: MakeupPlanEntry[] }) | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [logForm, setLogForm] = useState<LogFormState>({
    date: todayInput(),
    status: FastingLogStatus.FASTED,
    notes: "",
  });
  const [creatingLog, setCreatingLog] = useState(false);
  const [updatingLogId, setUpdatingLogId] = useState<string | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
      const [summaryResponse, logsResponse, planResponse] = await Promise.all([
        fastingApi.summary(),
        fastingApi.listLogs({ startDate }),
        fastingApi.getActivePlan(),
      ]);

      const sortedLogs = [...logsResponse].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      const drafts: Record<string, LogDraft> = {};
      for (const log of sortedLogs) {
        drafts[log.id] = {
          status: log.status,
          notes: log.notes ?? "",
        };
      }

      setSummary(summaryResponse);
      setLogs(sortedLogs);
      setLogDrafts(drafts);
      setPlan(planResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger les données du jeûne.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
      return;
    }
    if (!authLoading && user) {
      void loadData();
    }
  }, [authLoading, user, router, loadData]);

  const summaryCards = useMemo(() => {
    if (!summary) return [];
    return fastingStatusOptions.map((option) => ({
      label: option.label,
      value: summary.statusCounts?.[option.value] ?? 0,
    }));
  }, [summary]);

  const handleLogFormChange = useCallback(<K extends keyof LogFormState>(key: K, value: LogFormState[K]) => {
    setLogForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleCreateLog = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setCreatingLog(true);
      setError(null);
      try {
        await fastingApi.upsertLog({
          date: logForm.date,
          status: logForm.status,
          notes: logForm.notes.trim() ? logForm.notes.trim() : undefined,
        });
        setLogForm({ date: todayInput(), status: FastingLogStatus.FASTED, notes: "" });
        await loadData();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible d’enregistrer le journal.";
        setError(message);
      } finally {
        setCreatingLog(false);
      }
    },
    [logForm, loadData],
  );

  const handleDraftChange = useCallback(
    <K extends keyof LogDraft>(logId: string, key: K, value: LogDraft[K]) => {
      setLogDrafts((prev) => ({
        ...prev,
        [logId]: {
          ...prev[logId],
          [key]: value,
        },
      }));
    },
  []);

  const handleUpdateLog = useCallback(
    async (logId: string) => {
      const draft = logDrafts[logId];
      if (!draft) return;
      setUpdatingLogId(logId);
      setError(null);
      try {
        await fastingApi.updateLog(logId, {
          status: draft.status,
          notes: draft.notes.trim() ? draft.notes.trim() : null,
        });
        await loadData();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de mettre à jour le journal.";
        setError(message);
      } finally {
        setUpdatingLogId(null);
      }
    },
    [logDrafts, loadData],
  );

  const handleDeleteLog = useCallback(
    async (logId: string) => {
      setDeletingLogId(logId);
      setError(null);
      try {
        await fastingApi.deleteLog(logId);
        await loadData();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de supprimer le journal.";
        setError(message);
      } finally {
        setDeletingLogId(null);
      }
    },
    [loadData],
  );

  const quickStats = useMemo(
    () => [
      { label: "Journaux recensés", value: logs.length.toString() },
      {
        label: "Rattrapages restants",
        value: summary ? summary.outstandingMakeupDays.toString() : "—",
      },
      {
        label: "Plan actif",
        value: plan ? (plan.isActive ? "Oui" : "Suspendu") : "Aucun",
      },
    ],
    [logs.length, summary, plan],
  );

  const goToRamadan = useCallback(() => {
    router.push("/dashboard/imane/ramadan");
  }, [router]);

  if (authLoading || loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primary,
          color: colors.neutral100,
        }}
      >
        <p>Chargement du tableau de bord…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.primary,
        color: colors.neutral100,
        maxWidth: 1080,
        margin: "0 auto",
        padding: spacing.lg,
        display: "grid",
        gap: spacing.lg,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: spacing.sm,
        }}
      >
        <button
          type="button"
          onClick={goToRamadan}
          style={{
            padding: `${spacing.xs * 1.2}px ${spacing.md * 1.4}px`,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.4)",
            backgroundColor: "rgba(0,0,0,0.2)",
            color: colors.neutral100,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Voir le calendrier de Ramadan
        </button>
      </div>
      <div style={quickStatsRowStyle}>
        {quickStats.map((stat) => (
          <div key={stat.label} style={quickStatItemStyle}>
            <span style={cardLabelStyle}>{stat.label}</span>
            <strong style={quickStatValueStyle}>{stat.value}</strong>
          </div>
        ))}
      </div>
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Vue d’ensemble</h2>
          <p style={sectionSubtitleStyle}>
            Suivi des trente derniers jours et estimation de tes rattrapages.
          </p>
        </div>
        {error && <p style={{ color: "#ffb4ab" }}>{error}</p>}
        <div style={cardsGridStyle}>
          {summaryCards.map((card) => (
            <div key={card.label} style={cardStyle}>
              <span style={cardLabelStyle}>{card.label}</span>
              <strong style={cardValueStyle}>{card.value}</strong>
            </div>
          ))}
          {summary && (
            <div style={{ ...cardStyle, border: "1px solid rgba(255,255,255,0.25)" }}>
              <span style={cardLabelStyle}>Rattrapages restants</span>
              <strong style={cardValueStyle}>{summary.outstandingMakeupDays}</strong>
            </div>
          )}
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Ajouter un journal</h2>
          <p style={sectionSubtitleStyle}>Consigne tes journées de jeûne, dispenses et rattrapages.</p>
        </div>
        <form onSubmit={handleCreateLog} style={{ display: "grid", gap: spacing.md }}>
          <div style={{ display: "grid", gap: spacing.sm, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <label style={fieldLabelStyle}>
              Date
              <input
                type="date"
                required
                value={logForm.date}
                onChange={(event) => handleLogFormChange("date", event.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={fieldLabelStyle}>
              Statut
              <select
                value={logForm.status}
                onChange={(event) => handleLogFormChange("status", event.target.value as FastingLogStatus)}
                style={inputStyle}
              >
                {fastingStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label style={fieldLabelStyle}>
            Notes (facultatif)
            <textarea
              value={logForm.notes}
              onChange={(event) => handleLogFormChange("notes", event.target.value)}
              style={{ ...inputStyle, minHeight: 96, resize: "vertical" }}
              placeholder="Ajoute un contexte, une intention, etc."
            />
          </label>
          <button
            type="submit"
            disabled={creatingLog}
            style={{
              padding: `${spacing.sm}px ${spacing.lg}px`,
              borderRadius: spacing.md,
              backgroundColor: colors.neutral100,
              color: colors.primary,
              fontWeight: 700,
              border: "none",
              opacity: creatingLog ? 0.7 : 1,
              alignSelf: "flex-start",
            }}
          >
            {creatingLog ? "Enregistrement…" : "Ajouter le journal"}
          </button>
        </form>
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Historique récent</h2>
          <p style={sectionSubtitleStyle}>Actualise les statuts, ajoute des notes ou supprime des entrées.</p>
        </div>
        {logs.length === 0 ? (
          <p style={{ opacity: 0.8 }}>Aucun journal enregistré pour le moment.</p>
        ) : (
          <div style={{ display: "grid", gap: spacing.sm }}>
            {logs.map((log) => {
              const draft = logDrafts[log.id];
              return (
                <div key={log.id} style={logItemStyle}>
                  <div style={{ display: "grid", gap: spacing.xs }}>
                    <strong>{new Date(log.date).toLocaleDateString(user.locale ?? "fr")}</strong>
                    <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
                      <label style={miniLabelStyle}>
                        Statut
                        <select
                          value={draft?.status ?? log.status}
                          onChange={(event) =>
                            handleDraftChange(log.id, "status", event.target.value as FastingLogStatus)
                          }
                          style={{ ...inputStyle, width: 180, marginTop: spacing.xs }}
                        >
                          {fastingStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={miniLabelStyle}>
                        Notes
                        <textarea
                          value={draft?.notes ?? log.notes ?? ""}
                          onChange={(event) => handleDraftChange(log.id, "notes", event.target.value)}
                          style={{ ...inputStyle, minHeight: 72, resize: "vertical", marginTop: spacing.xs }}
                          placeholder="Ajouter ou modifier les notes"
                        />
                      </label>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: spacing.sm }}>
                    <button
                      type="button"
                      onClick={() => void handleUpdateLog(log.id)}
                      disabled={updatingLogId === log.id}
                      style={{
                        padding: `${spacing.xs}px ${spacing.md}px`,
                        borderRadius: spacing.md,
                        border: "1px solid rgba(255,255,255,0.4)",
                        backgroundColor: "transparent",
                        color: colors.neutral100,
                        fontWeight: 600,
                        opacity: updatingLogId === log.id ? 0.6 : 1,
                      }}
                    >
                      {updatingLogId === log.id ? "Enregistrement…" : "Enregistrer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteLog(log.id)}
                      disabled={deletingLogId === log.id}
                      style={{
                        padding: `${spacing.xs}px ${spacing.md}px`,
                        borderRadius: spacing.md,
                        border: "1px solid rgba(255,120,120,0.6)",
                        backgroundColor: "rgba(255,120,120,0.15)",
                        color: "#ffb4ab",
                        fontWeight: 600,
                        opacity: deletingLogId === log.id ? 0.6 : 1,
                      }}
                    >
                      {deletingLogId === log.id ? "Suppression…" : "Supprimer"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Plan de rattrapage</h2>
          <p style={sectionSubtitleStyle}>
            Suis ta stratégie en cours et visualise les prochaines échéances.
          </p>
        </div>
        {!plan ? (
          <p style={{ opacity: 0.8 }}>Aucun plan actif pour le moment.</p>
        ) : (
          <div style={{ display: "grid", gap: spacing.md }}>
            <div style={planSummaryStyle}>
              <div>
                <span style={cardLabelStyle}>Stratégie</span>
                <strong style={cardValueStyle}>{makeupStrategyLabels[plan.strategy]}</strong>
              </div>
              <div>
                <span style={cardLabelStyle}>Objectif</span>
                <strong style={cardValueStyle}>
                  {plan.completedDays}/{plan.targetDays} jours
                </strong>
              </div>
              <div>
                <span style={cardLabelStyle}>Statut</span>
                <strong style={cardValueStyle}>{plan.isActive ? "Actif" : "Suspendu"}</strong>
              </div>
            </div>
            {plan.entries && plan.entries.length > 0 && (
              <div style={{ display: "grid", gap: spacing.xs }}>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>Prochaines sessions</h3>
                <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: spacing.xs }}>
                  {plan.entries
                    .slice(0, 6)
                    .sort(
                      (a: MakeupPlanEntry, b: MakeupPlanEntry) =>
                        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime(),
                    )
                    .map((entry: MakeupPlanEntry) => (
                      <li key={entry.id} style={planEntryStyle}>
                        <span>{new Date(entry.scheduledDate).toLocaleDateString(user.locale ?? "fr")}</span>
                        <span style={{ opacity: 0.75 }}>Statut : {entry.status}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

const sectionStyle: CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.35)",
  borderRadius: spacing.lg,
  padding: `${spacing.lg * 1.5}px`,
  border: "1px solid rgba(255,255,255,0.12)",
  color: colors.neutral100,
  display: "grid",
  gap: spacing.md,
};

const sectionHeaderStyle: CSSProperties = {
  display: "grid",
  gap: spacing.xs,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  margin: 0,
};

const sectionSubtitleStyle: CSSProperties = {
  opacity: 0.78,
  lineHeight: 1.6,
  margin: 0,
};

const inputStyle: CSSProperties = {
  width: "100%",
  marginTop: 8,
  padding: "12px 16px",
  borderRadius: spacing.md,
  border: "1px solid rgba(0,0,0,0.12)",
  backgroundColor: "rgba(255,252,248,0.94)",
  color: colors.neutral900,
  fontSize: 15,
  outline: "none",
};

const fieldLabelStyle: CSSProperties = {
  display: "grid",
  gap: spacing.xs,
  fontSize: 14,
  opacity: 0.9,
};

const cardsGridStyle: CSSProperties = {
  display: "grid",
  gap: spacing.sm,
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
};

const cardStyle: CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.45)",
  borderRadius: spacing.md,
  padding: `${spacing.md}px`,
  display: "grid",
  gap: spacing.xs,
};

const cardLabelStyle: CSSProperties = {
  textTransform: "uppercase",
  fontSize: 12,
  letterSpacing: 2,
  opacity: 0.7,
};

const cardValueStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
};

const logItemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: spacing.md,
  alignItems: "flex-start",
  backgroundColor: "rgba(0,0,0,0.3)",
  color: colors.neutral100,
  borderRadius: spacing.md,
  padding: `${spacing.md}px`,
  flexWrap: "wrap",
};

const miniLabelStyle: CSSProperties = {
  display: "grid",
  gap: spacing.xs,
  fontSize: 13,
  opacity: 0.85,
};

const planSummaryStyle: CSSProperties = {
  display: "flex",
  gap: spacing.lg,
  flexWrap: "wrap",
  backgroundColor: "rgba(0,0,0,0.25)",
  borderRadius: spacing.md,
  padding: `${spacing.md}px`,
};

const planEntryStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  backgroundColor: "rgba(0,0,0,0.25)",
  borderRadius: spacing.md,
  padding: `${spacing.xs}px ${spacing.md}px`,
};

const quickStatsRowStyle: CSSProperties = {
  display: "grid",
  gap: spacing.sm,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const quickStatItemStyle: CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.4)",
  borderRadius: spacing.md,
  padding: `${spacing.md}px`,
  display: "grid",
  gap: spacing.xs,
};

const quickStatValueStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
};
