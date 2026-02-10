"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { colors, spacing } from "@oumoul/ui";
import { FastingLogStatus, type CycleStatus, type RamadanDaySummary, type RamadanSummaryResponse } from "@oumoul/api";
import { cycleApi, ramadanApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

export type RamadanDay = {
  date: string; // YYYY-MM-DD
  fastStatus: FastingLogStatus | null;
  cycleStatus: CycleStatus | null; // PURE / MENSES / SPOTTING / POSTPARTUM / null
  notes: string | null;
};

function toRamadanDay(day: RamadanDaySummary): RamadanDay {
  return {
    date: day.date,
    fastStatus: day.fastStatus,
    cycleStatus: day.cycleStatus,
    notes: day.notes,
  };
}

const FASTING_LABELS: Record<NonNullable<RamadanDay["fastStatus"]>, string> = {
  FASTED: "Jeûné",
  EXEMPTION: "Exemptée",
  MISSED: "Raté",
  MADE_UP: "Rattrapé",
};

const FASTING_COLORS: Record<NonNullable<RamadanDay["fastStatus"]>, string> = {
  FASTED: "#1B5E20",
  EXEMPTION: "#6A1B9A",
  MISSED: "#B71C1C",
  MADE_UP: "#0D47A1",
};

const CYCLE_BADGE_COLORS: Record<string, string> = {
  PURE: "rgba(255,255,255,0.15)",
  MENSES: "rgba(183,28,28,0.35)",
  SPOTTING: "rgba(255,143,0,0.4)",
  POSTPARTUM: "rgba(106,27,154,0.4)",
};

const CYCLE_LABELS: Record<string, string> = {
  PURE: "Pure",
  MENSES: "Règles",
  SPOTTING: "Spotting",
  POSTPARTUM: "Post-partum",
};

const CYCLE_STATUSES: CycleStatus[] = ["PURE", "MENSES", "SPOTTING", "POSTPARTUM"];

function getInitialYear() {
  return new Date().getUTCFullYear();
}

export default function ImaneRamadanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [year, setYear] = useState<number>(getInitialYear);
  const [days, setDays] = useState<RamadanDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [fastStatusDraft, setFastStatusDraft] = useState<NonNullable<RamadanDay["fastStatus"]> | null>(null);
  const [cycleStatusDraft, setCycleStatusDraft] = useState<CycleStatus | null>(null);
  const [notesDraft, setNotesDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [savingCycle, setSavingCycle] = useState(false);

  const selectedDay = useMemo(() => days.find((d) => d.date === selectedDate) ?? null, [days, selectedDate]);

  const loadData = useCallback(
    async (targetYear: number) => {
      setLoading(true);
      setError(null);
      try {
        const data: RamadanSummaryResponse = await ramadanApi.summary(targetYear);
        setYear(data.year);
        setDays(data.days.map(toRamadanDay));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue lors du chargement.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
      return;
    }
    if (!authLoading && user) {
      void loadData(year);
    }
  }, [authLoading, user, router, loadData, year]);

  const handleSelectDay = useCallback(
    (day: RamadanDay) => {
      setSelectedDate(day.date);
      setFastStatusDraft((day.fastStatus as NonNullable<RamadanDay["fastStatus"]>) ?? null);
      setCycleStatusDraft(day.cycleStatus ?? null);
      setNotesDraft(day.notes ?? "");
      setPanelOpen(true);
    },
    [],
  );

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    setSelectedDate(null);
    setFastStatusDraft(null);
    setCycleStatusDraft(null);
    setNotesDraft("");
  }, []);

  const handleSaveDay = useCallback(async () => {
    if (!selectedDate || !fastStatusDraft) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await ramadanApi.upsertDay({
        date: selectedDate,
        fastStatus: fastStatusDraft,
        notes: notesDraft.trim() ? notesDraft.trim() : null,
      });

      setDays((prev) =>
        prev.map((day) =>
          day.date === updated.date
            ? {
                ...day,
                fastStatus: updated.fastStatus as FastingLogStatus,
                notes: updated.notes,
              }
            : day,
        ),
      );

      setPanelOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue lors de l’enregistrement.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [selectedDate, fastStatusDraft, notesDraft]);

  const handleSaveCycleStatus = useCallback(async () => {
    if (!selectedDate || !cycleStatusDraft) {
      return;
    }

    setSavingCycle(true);
    setError(null);
    try {
      const updated = await cycleApi.upsertDay({ date: selectedDate, status: cycleStatusDraft });
      setDays((prev) =>
        prev.map((day) =>
          day.date === updated.date
            ? {
                ...day,
                cycleStatus: updated.status,
              }
            : day,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue lors de la mise à jour du cycle.";
      setError(message);
    } finally {
      setSavingCycle(false);
    }
  }, [selectedDate, cycleStatusDraft]);

  const handleChangeYear = useCallback(
    (delta: number) => {
      setYear((prev) => prev + delta);
    },
    [],
  );

  const yearSupported = useMemo(() => year >= 2024 && year <= 2028, [year]);

  const statusSummary = useMemo(() => {
    const counts: Partial<Record<NonNullable<RamadanDay["fastStatus"]>, number>> = {};
    for (const day of days) {
      if (!day.fastStatus) continue;
      counts[day.fastStatus] = (counts[day.fastStatus] ?? 0) + 1;
    }
    return counts;
  }, [days]);

  const outstandingMakeupDays = useMemo(() => {
    const missed = statusSummary.MISSED ?? 0;
    const madeUp = statusSummary.MADE_UP ?? 0;
    return Math.max(0, missed - madeUp);
  }, [statusSummary]);

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
        <p>Chargement du calendrier de Ramadan…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        display: "grid",
        gap: spacing.lg,
      }}
    >
      <section style={headerSectionStyle}>
        <div style={{ display: "grid", gap: spacing.xs }}>
          <span style={eyebrowStyle}>Ramadan & cycle</span>
          <h1 style={titleStyle}>Ton calendrier de Ramadan</h1>
          <p style={subtitleStyle}>
            Visualise chaque jour de Ramadan, note les journées jeûnées, exemptées ou à rattraper, et garde une trace
            de ton cycle.
          </p>
        </div>
        <div style={yearSwitcherStyle}>
          <button type="button" onClick={() => handleChangeYear(-1)} style={yearButtonStyle}>
            ◀
          </button>
          <span style={yearLabelStyle}>{year}</span>
          <button type="button" onClick={() => handleChangeYear(1)} style={yearButtonStyle}>
            ▶
          </button>
        </div>
      </section>

      {error && (
        <p style={{ color: "#ffb4ab", margin: 0 }}>
          {error}
          {!yearSupported && " — Les dates de Ramadan ne sont configurées que pour 2024–2028 pour le moment."}
        </p>
      )}

      {yearSupported && (
        <section
          style={{
            backgroundColor: "rgba(0,0,0,0.35)",
            borderRadius: spacing.lg,
            padding: `${spacing.lg}px`,
            border: "1px solid rgba(255,255,255,0.12)",
            display: "grid",
            gap: spacing.sm,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: spacing.sm,
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Résumé pour {year}
            </h2>
            <span
              style={{
                fontSize: 12,
                opacity: 0.8,
              }}
            >
              Comptes basés uniquement sur les jours de Ramadan visibles ci-dessous.
            </span>
            <span
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 999,
                backgroundColor: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.24)",
              }}
            >
              Jours à rattraper restants : <strong>{outstandingMakeupDays}</strong>
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gap: spacing.sm,
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            }}
          >
            {(Object.keys(FASTING_LABELS) as Array<keyof typeof FASTING_LABELS>).map((key) => {
              const label = FASTING_LABELS[key];
              const value = statusSummary[key] ?? 0;
              return (
                <div
                  key={key}
                  style={{
                    display: "grid",
                    gap: 4,
                    padding: `${spacing.sm}px`,
                    borderRadius: spacing.md,
                    backgroundColor: "rgba(0,0,0,0.45)",
                    border:
                      key === "MISSED"
                        ? "1px solid rgba(183,28,28,0.8)"
                        : key === "MADE_UP"
                        ? "1px solid rgba(13,71,161,0.8)"
                        : "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                      opacity: 0.8,
                    }}
                  >
                    {label}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: spacing.xs,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: FASTING_COLORS[key],
                      }}
                    />
                    <strong
                      style={{
                        fontSize: 18,
                      }}
                    >
                      {value}
                    </strong>
                    <span
                      style={{
                        fontSize: 12,
                        opacity: 0.8,
                      }}
                    >
                      jour{value > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!yearSupported ? (
        <p style={{ opacity: 0.85 }}>
          Les dates de Ramadan sont actuellement configurées pour les années 2024 à 2028. Merci de choisir une année dans
          cet intervalle.
        </p>
      ) : (
        <section style={calendarSectionStyle}>
          {days.length === 0 ? (
            <p style={{ opacity: 0.8 }}>Aucun jour de Ramadan trouvé pour cette année.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: spacing.md,
              }}
            >
              <div style={calendarGridStyle}>
                {days.map((day) => {
                  const isSelected = day.date === selectedDate && panelOpen;
                  const fastColor = day.fastStatus ? FASTING_COLORS[day.fastStatus] : "rgba(0,0,0,0.35)";
                  const cycleBadgeColor = day.cycleStatus
                    ? CYCLE_BADGE_COLORS[day.cycleStatus] ?? "rgba(0,0,0,0.15)"
                    : null;

                  const isMissed = day.fastStatus === "MISSED";
                  const isMadeUp = day.fastStatus === "MADE_UP";

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      style={{
                        ...dayCellStyle,
                        borderColor: isSelected
                          ? "#D4AF37"
                          : isMissed
                          ? "#B71C1C"
                          : isMadeUp
                          ? "#0D47A1"
                          : "rgba(255,255,255,0.18)",
                        boxShadow: isSelected ? "0 0 0 1px rgba(212,175,55,0.7)" : "none",
                        background: `linear-gradient(135deg, ${fastColor}, rgba(0,0,0,0.7))`,
                      }}
                    >
                      <span style={dayDateStyle}>{new Date(`${day.date}T00:00:00Z`).getUTCDate()}</span>
                      {day.fastStatus && <span style={dayStatusLabelStyle}>{FASTING_LABELS[day.fastStatus]}</span>}
                      {cycleBadgeColor && day.cycleStatus && (
                        <span
                          style={{
                            ...cycleBadgeStyle,
                            backgroundColor: cycleBadgeColor,
                          }}
                        >
                          {CYCLE_LABELS[day.cycleStatus] ?? day.cycleStatus}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div
                style={{
                  marginTop: spacing.md,
                  display: "grid",
                  gap: spacing.xs,
                  fontSize: 12,
                  opacity: 0.9,
                }}
              >
                <span style={{ fontWeight: 600 }}>Légende</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.xs }}>
                  {Object.entries(FASTING_LABELS).map(([key, label]) => (
                    <span
                      key={key}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 8px",
                        borderRadius: 999,
                        backgroundColor: "rgba(0,0,0,0.35)",
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: FASTING_COLORS[key as keyof typeof FASTING_COLORS],
                        }}
                      />
                      <span>{label}</span>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.xs }}>
                  {Object.entries(CYCLE_LABELS).map(([key, label]) => (
                    <span
                      key={key}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 8px",
                        borderRadius: 999,
                        backgroundColor: "rgba(0,0,0,0.35)",
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: CYCLE_BADGE_COLORS[key] ?? "rgba(255,255,255,0.2)",
                        }}
                      />
                      <span>{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {panelOpen && selectedDay && (
        <section style={panelSectionStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: spacing.md }}>
            <div style={{ display: "grid", gap: spacing.xs }}>
              <h2 style={panelTitleStyle}>
                Jour du {new Date(`${selectedDay.date}T00:00:00Z`).toLocaleDateString(user.locale ?? "fr-FR")}
              </h2>
              <p style={panelSubtitleStyle}>
                Choisis le statut de ton jeûne pour ce jour et ajoute une raison si tu le souhaites.
              </p>
            </div>
            <button type="button" onClick={handleClosePanel} style={closeButtonStyle}>
              Fermer
            </button>
          </div>

          <div style={{ display: "grid", gap: spacing.md }}>
            <div style={{ display: "grid", gap: spacing.xs }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
                <span style={{ fontWeight: 700 }}>Cycle</span>
                {selectedDay.cycleStatus && (
                  <span
                    style={{
                      ...cycleBadgeStyle,
                      backgroundColor: CYCLE_BADGE_COLORS[selectedDay.cycleStatus] ?? "rgba(255,255,255,0.16)",
                    }}
                  >
                    {CYCLE_LABELS[selectedDay.cycleStatus] ?? selectedDay.cycleStatus}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
                {CYCLE_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setCycleStatusDraft(status)}
                    style={{
                      ...choiceButtonStyle,
                      backgroundColor:
                        cycleStatusDraft === status
                          ? CYCLE_BADGE_COLORS[status] ?? "rgba(255,255,255,0.16)"
                          : "rgba(0,0,0,0.35)",
                    }}
                  >
                    {CYCLE_LABELS[status] ?? status}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => void handleSaveCycleStatus()}
                  disabled={savingCycle || !cycleStatusDraft}
                  style={{
                    padding: `${spacing.xs}px ${spacing.md}px`,
                    borderRadius: spacing.md,
                    border: "1px solid rgba(255,255,255,0.4)",
                    backgroundColor: "transparent",
                    color: colors.neutral100,
                    fontWeight: 700,
                    opacity: savingCycle || !cycleStatusDraft ? 0.7 : 1,
                    cursor: savingCycle || !cycleStatusDraft ? "default" : "pointer",
                  }}
                >
                  {savingCycle ? "Mise à jour…" : "Mettre à jour le cycle"}
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: spacing.sm,
              }}
            >
              <button
                type="button"
                onClick={() => setFastStatusDraft(FastingLogStatus.FASTED)}
                style={{
                  ...choiceButtonStyle,
                  backgroundColor: fastStatusDraft === FastingLogStatus.FASTED ? "#1B5E20" : "rgba(0,0,0,0.35)",
                }}
              >
                Jeûné
              </button>
              <button
                type="button"
                onClick={() => setFastStatusDraft(FastingLogStatus.EXEMPTION)}
                style={{
                  ...choiceButtonStyle,
                  backgroundColor: fastStatusDraft === FastingLogStatus.EXEMPTION ? "#6A1B9A" : "rgba(0,0,0,0.35)",
                }}
              >
                Exemptée (règles/maladie/voyage…)
              </button>
              <button
                type="button"
                onClick={() => setFastStatusDraft(FastingLogStatus.MISSED)}
                style={{
                  ...choiceButtonStyle,
                  backgroundColor: fastStatusDraft === FastingLogStatus.MISSED ? "#B71C1C" : "rgba(0,0,0,0.35)",
                }}
              >
                Raté (à rattraper)
              </button>
              <button
                type="button"
                onClick={() => setFastStatusDraft(FastingLogStatus.MADE_UP)}
                style={{
                  ...choiceButtonStyle,
                  backgroundColor: fastStatusDraft === FastingLogStatus.MADE_UP ? "#0D47A1" : "rgba(0,0,0,0.35)",
                }}
              >
                Rattrapé
              </button>
            </div>

            <label style={fieldLabelStyle}>
              Raison (facultatif)
              <textarea
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                style={{ ...inputStyle, minHeight: 96, resize: "vertical" }}
                placeholder="Ex : règles, malade, voyage, fatigue intense…"
              />
            </label>

            <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void handleSaveDay()}
                disabled={saving || !fastStatusDraft}
                style={{
                  padding: `${spacing.sm}px ${spacing.lg}px`,
                  borderRadius: spacing.md,
                  border: "none",
                  backgroundColor: colors.neutral100,
                  color: colors.primary,
                  fontWeight: 700,
                  opacity: saving || !fastStatusDraft ? 0.7 : 1,
                  cursor: saving || !fastStatusDraft ? "default" : "pointer",
                }}
              >
                {saving ? "Enregistrement…" : "Enregistrer ce jour"}
              </button>
              <button
                type="button"
                onClick={handleClosePanel}
                style={{
                  padding: `${spacing.sm}px ${spacing.lg}px`,
                  borderRadius: spacing.md,
                  border: "1px solid rgba(255,255,255,0.4)",
                  backgroundColor: "transparent",
                  color: colors.neutral100,
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

const headerSectionStyle: CSSProperties = {
  backgroundColor: "rgba(255,252,248,0.94)",
  borderRadius: spacing.lg,
  padding: `${spacing.lg * 1.5}px`,
  boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
  border: "1px solid rgba(0,0,0,0.04)",
  color: colors.neutral900,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: spacing.lg,
  flexWrap: "wrap",
};

const eyebrowStyle: CSSProperties = {
  fontSize: 13,
  letterSpacing: 3,
  textTransform: "uppercase",
  color: "#2F5F3A",
  fontWeight: 600,
};

const titleStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  margin: 0,
  color: colors.primaryDark,
};

const subtitleStyle: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "#1F4D3B",
  margin: 0,
};

const yearSwitcherStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
};

const yearButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,0.1)",
  backgroundColor: "rgba(255,252,248,0.94)",
  cursor: "pointer",
};

const yearLabelStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
};

const calendarSectionStyle: CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.35)",
  borderRadius: spacing.lg,
  padding: `${spacing.lg * 1.5}px`,
  border: "1px solid rgba(255,255,255,0.12)",
};

const calendarGridStyle: CSSProperties = {
  display: "grid",
  gap: spacing.sm,
  gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
};

const dayCellStyle: CSSProperties = {
  borderRadius: spacing.md,
  padding: `${spacing.sm}px`,
  border: "1px solid rgba(255,255,255,0.18)",
  color: colors.neutral100,
  display: "grid",
  gap: 4,
  alignItems: "flex-start",
  justifyItems: "flex-start",
  cursor: "pointer",
  minHeight: 80,
};

const dayDateStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
};

const dayStatusLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: "2px 6px",
  borderRadius: 999,
  backgroundColor: "rgba(255,255,255,0.16)",
};

const cycleBadgeStyle: CSSProperties = {
  fontSize: 10,
  padding: "2px 6px",
  borderRadius: 999,
  textTransform: "uppercase",
  letterSpacing: 1,
};

const panelSectionStyle: CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.35)",
  borderRadius: spacing.lg,
  padding: `${spacing.lg * 1.5}px`,
  border: "1px solid rgba(255,255,255,0.12)",
  display: "grid",
  gap: spacing.md,
};

const panelTitleStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  margin: 0,
};

const panelSubtitleStyle: CSSProperties = {
  margin: 0,
  opacity: 0.85,
};

const closeButtonStyle: CSSProperties = {
  padding: `${spacing.xs}px ${spacing.md}px`,
  borderRadius: spacing.md,
  border: "1px solid rgba(255,255,255,0.5)",
  backgroundColor: "transparent",
  color: colors.neutral100,
  cursor: "pointer",
};

const fieldLabelStyle: CSSProperties = {
  display: "grid",
  gap: spacing.xs,
  fontSize: 14,
  opacity: 0.9,
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

const choiceButtonStyle: CSSProperties = {
  padding: `${spacing.sm}px ${spacing.md}px`,
  borderRadius: spacing.md,
  border: "1px solid rgba(255,255,255,0.3)",
  color: colors.neutral100,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};
