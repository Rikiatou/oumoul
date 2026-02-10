"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { colors, spacing } from "@oumoul/ui";
import type { CycleDayDto, CycleStatus } from "@oumoul/api";
import { cycleApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

export default function ImaneCyclePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const today = new Date();
  const initialYear = today.getUTCFullYear();
  const initialMonth = today.getUTCMonth() + 1;

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState<CycleDayDto[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const fetchMonth = async () => {
      if (!user) return;
      setLoadingMonth(true);
      setError(null);
      try {
        const data = await cycleApi.getMonth(year, month);
        setDays(data.days);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de charger le cycle.";
        setError(message);
      } finally {
        setLoadingMonth(false);
      }
    };

    if (!loading && user) {
      void fetchMonth();
    }
  }, [loading, user, year, month]);

  const daysMap = useMemo(() => {
    const map = new Map<string, CycleDayDto>();
    for (const day of days) {
      map.set(day.date, day);
    }
    return map;
  }, [days]);

  if (loading || (!user && !loading)) {
    return (
      <div style={fullHeightCentered}>
        <p>Chargement…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const lastOfMonth = new Date(Date.UTC(year, month, 0));
  const daysInMonth = lastOfMonth.getUTCDate();
  const startWeekday = firstOfMonth.getUTCDay() || 7; // 1 (Mon) .. 7 (Sun)

  const weeks: Array<Array<string | null>> = [];
  let currentDay = 1;
  const totalCells = Math.ceil((daysInMonth + startWeekday - 1) / 7) * 7;
  for (let cell = 0; cell < totalCells; cell += 1) {
    const weekIndex = Math.floor(cell / 7);
    if (!weeks[weekIndex]) weeks[weekIndex] = [];
    const dayIndexInWeek = cell % 7;
    const absoluteDayIndex = cell + 1;
    if (absoluteDayIndex < startWeekday || currentDay > daysInMonth) {
      weeks[weekIndex][dayIndexInWeek] = null;
    } else {
      const dateIso = new Date(Date.UTC(year, month - 1, currentDay)).toISOString().slice(0, 10);
      weeks[weekIndex][dayIndexInWeek] = dateIso;
      currentDay += 1;
    }
  }

  const handleChangeStatus = async (dateIso: string, status: CycleStatus) => {
    setUpdating(true);
    setError(null);
    try {
      const updated = await cycleApi.upsertDay({ date: dateIso, status });
      setDays((prev) => {
        const next = prev.filter((d) => d.date !== updated.date);
        next.push(updated);
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d’enregistrer le cycle.";
      setError(message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={containerStyle}>
      <section style={introSectionStyle}>
        <span style={badgeStyle}>Cycle & Ramadan</span>
        <h1 style={titleStyle}>Suivre ton cycle en douceur</h1>
        <p style={subtitleStyle}>
          Ce calendrier te permet de noter tes jours de règles, spotting ou postpartum. Plus tard, il t’aidera à croiser ton cycle
          avec les jours de Ramadan pour organiser ton jeûne et tes rattrapages.
        </p>
      </section>

      <section style={mainSectionStyle}>
        <header style={headerRowStyle}>
          <div style={{ display: "flex", gap: spacing.xs }}>
            <button
              type="button"
              onClick={() => setMonth((prev) => (prev === 1 ? 12 : prev - 1))}
              style={chipButtonStyle(false)}
            >
              ← Mois précédent
            </button>
            <button
              type="button"
              onClick={() => setMonth((prev) => (prev === 12 ? 1 : prev + 1))}
              style={chipButtonStyle(false)}
            >
              Mois suivant →
            </button>
          </div>
          <span style={monthLabelStyle}>
            {firstOfMonth.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
            })}
          </span>
        </header>

        {error && <p style={{ fontSize: 13, color: "#D32F2F" }}>{error}</p>}
        {loadingMonth ? (
          <p style={infoTextStyle}>Chargement du calendrier…</p>
        ) : (
          <>
            <div style={weekdayHeaderStyle}>
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                <div key={day} style={{ textAlign: "center", fontWeight: 600 }}>
                  {day}
                </div>
              ))}
            </div>
            <div style={calendarGridStyle}>
              {weeks.map((week, wIdx) =>
                week.map((dateIso, dIdx) => {
                  if (!dateIso) {
                    return <div key={`${wIdx}-${dIdx}`} />;
                  }
                  const dateNum = Number(dateIso.slice(-2));
                  const day = daysMap.get(dateIso);

                  return (
                    <button
                      key={dateIso}
                      type="button"
                      onClick={() => {
                        const nextStatus = nextCycleStatus(day?.status ?? "PURE");
                        void handleChangeStatus(dateIso, nextStatus);
                      }}
                      style={cycleDayStyle(day?.status ?? "PURE")}
                    >
                      <span>{dateNum}</span>
                    </button>
                  );
                }),
              )}
            </div>
            <div style={legendRowStyle}>
              <LegendDot color="rgba(255,252,248,0.94)" label="Jour pur" />
              <LegendDot color="rgba(244, 67, 54, 0.25)" label="Règles" />
              <LegendDot color="rgba(255, 160, 0, 0.25)" label="Spotting" />
              <LegendDot color="rgba(156, 39, 176, 0.25)" label="Postpartum" />
            </div>
            {updating && <p style={{ fontSize: 12, opacity: 0.8 }}>Mise à jour en cours…</p>}
          </>
        )}
      </section>
    </div>
  );
}

function nextCycleStatus(current: CycleStatus): CycleStatus {
  if (current === "PURE") return "MENSES";
  if (current === "MENSES") return "SPOTTING";
  if (current === "SPOTTING") return "POSTPARTUM";
  return "PURE";
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          border: "1px solid rgba(0,0,0,0.12)",
          backgroundColor: color,
        }}
      />
      <span style={{ fontSize: 12, color: "rgba(0,0,0,0.8)" }}>{label}</span>
    </div>
  );
}

const containerStyle: CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  display: "grid",
  gap: spacing.lg,
};

const fullHeightCentered: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.primary,
  color: colors.neutral100,
};

const introSectionStyle: CSSProperties = {
  backgroundColor: "rgba(255,252,248,0.94)",
  borderRadius: spacing.lg,
  padding: `${spacing.lg * 1.5}px`,
  boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
  border: "1px solid rgba(0,0,0,0.04)",
  color: colors.neutral900,
  display: "grid",
  gap: spacing.sm,
};

const badgeStyle: CSSProperties = {
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

const mainSectionStyle: CSSProperties = {
  backgroundColor: "rgba(255,252,248,0.94)",
  borderRadius: spacing.lg,
  padding: `${spacing.lg * 1.5}px`,
  boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
  border: "1px solid rgba(0,0,0,0.04)",
  color: colors.neutral900,
  display: "grid",
  gap: spacing.md,
};

const headerRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: spacing.sm,
};

const chipButtonStyle = (active: boolean): CSSProperties => ({
  borderRadius: 999,
  border: `1px solid ${active ? "#D4AF37" : "rgba(0,0,0,0.12)"}`,
  backgroundColor: active ? "rgba(212,175,55,0.1)" : "rgba(255,252,248,0.94)",
  padding: `${spacing.xs * 0.8}px ${spacing.sm}px`,
  fontSize: 12,
  display: "flex",
  gap: 6,
  alignItems: "center",
  color: "rgba(0,0,0,0.8)",
  cursor: "pointer",
});

const monthLabelStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: colors.primaryDark,
};

const infoTextStyle: CSSProperties = {
  fontSize: 13,
  color: "rgba(0,0,0,0.7)",
};

const weekdayHeaderStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 4,
  fontSize: 11,
  color: "rgba(0,0,0,0.7)",
};

const calendarGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 4,
};

const cycleDayStyle = (status: CycleStatus): CSSProperties => {
  let bg = "rgba(255,252,248,0.94)";
  if (status === "MENSES") bg = "rgba(244, 67, 54, 0.25)";
  if (status === "SPOTTING") bg = "rgba(255, 160, 0, 0.25)";
  if (status === "POSTPARTUM") bg = "rgba(156, 39, 176, 0.25)";

  return {
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.08)",
    backgroundColor: bg,
    padding: 6,
    minHeight: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    color: "rgba(0,0,0,0.85)",
    cursor: "pointer",
  };
};

const legendRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.sm,
  marginTop: spacing.sm,
};
