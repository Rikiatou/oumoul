"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { colors, spacing } from "@oumoul/ui";
import { useAuth } from "@/context/auth-context";
import { imaneProgramApi } from "@/lib/api";

interface ProgramItem {
  id: string;
  title: string;
  description: string;
  category: "coran" | "dhikr" | "duas" | "sadaqa" | "autre";
}

interface ImaneProgramItems {
  coranTilawa: boolean;
  dhikrMatinSoir: boolean;
  duasPersonnelles: boolean;
  sadaqa: boolean;
  autreBienfait: boolean;
}

const DAILY_ITEMS: ProgramItem[] = [
  {
    id: "coran-tilawa",
    title: "Lecture de Coran",
    description: "Lire un passage (même quelques versets) avec présence du cœur.",
    category: "coran",
  },
  {
    id: "dhikr-matin-soir",
    title: "Dhikr matin/soir",
    description: "Réciter quelques adhkar authentiques du matin ou du soir.",
    category: "dhikr",
  },
  {
    id: "duas-personnelles",
    title: "Duas personnelles",
    description: "Prendre quelques minutes pour invoquer Allah pour tes besoins.",
    category: "duas",
  },
  {
    id: "sadaqa",
    title: "Sadaqa ou service",
    description: "Un geste de sadaqa ou de service envers quelqu’un de ton entourage.",
    category: "sadaqa",
  },
  {
    id: "autre-bienfait",
    title: "Un bienfait à noter",
    description: "Noter un bienfait d’Allah pour renforcer la gratitude.",
    category: "autre",
  },
];

const itemKeyMap: Record<string, keyof ImaneProgramItems> = {
  "coran-tilawa": "coranTilawa",
  "dhikr-matin-soir": "dhikrMatinSoir",
  "duas-personnelles": "duasPersonnelles",
  sadaqa: "sadaqa",
  "autre-bienfait": "autreBienfait",
};

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDateIsoWithOffset(offsetDays: number): string {
  const now = new Date();
  const shifted = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function parseIsoDate(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

export default function ImaneProgramPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [itemsState, setItemsState] = useState<ImaneProgramItems | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedDateIso, setSelectedDateIso] = useState<string>(getTodayIso());
  const [monthSummary, setMonthSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const fetchProgram = async () => {
      if (!user) return;
      setError(null);
      try {
        const data = await imaneProgramApi.getProgram(selectedDateIso);
        setItemsState(data.items as ImaneProgramItems);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de charger le programme.";
        setError(message);
      }
    };

    if (!loading && user) {
      void fetchProgram();
    }
  }, [loading, user, selectedDateIso]);

  useEffect(() => {
    const fetchMonth = async () => {
      if (!user) return;
      setError(null);
      const d = parseIsoDate(selectedDateIso);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1;
      try {
        const data = await imaneProgramApi.getMonth(year, month);
        const summary: Record<string, number> = {};
        for (const day of data.days) {
          summary[day.date] = day.completedCount;
        }
        setMonthSummary(summary);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de charger le résumé du mois.";
        setError(message);
      }
    };

    if (!loading && user) {
      void fetchMonth();
    }
  }, [loading, user, selectedDateIso]);

  const toggleItem = async (key: keyof ImaneProgramItems) => {
    if (!itemsState) return;
    const next: ImaneProgramItems = { ...itemsState, [key]: !itemsState[key] };
    setItemsState(next);
    setSaving(true);
    setError(null);
    try {
      await imaneProgramApi.updateProgram({ date: selectedDateIso, items: next });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d’enregistrer le programme.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || (!user && !loading) || !itemsState) {
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
        <p>Chargement…</p>
      </div>
    );
  }

  const completedCount =
    itemsState == null
      ? 0
      : Number(itemsState.coranTilawa) +
        Number(itemsState.dhikrMatinSoir) +
        Number(itemsState.duasPersonnelles) +
        Number(itemsState.sadaqa) +
        Number(itemsState.autreBienfait);

  const historyDates = [
    { label: "J-2", value: getDateIsoWithOffset(-2) },
    { label: "J-1", value: getDateIsoWithOffset(-1) },
    { label: "Aujourd’hui", value: getTodayIso() },
  ];

  const selectedDate = parseIsoDate(selectedDateIso);
  const currentMonth = selectedDate.getUTCMonth();
  const currentYear = selectedDate.getUTCFullYear();

  const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
  const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0));
  const daysInMonth = lastDayOfMonth.getUTCDate();
  const startWeekday = firstDayOfMonth.getUTCDay() || 7; // 1 (Mon) ... 7 (Sun)

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
      const dateIso = new Date(Date.UTC(currentYear, currentMonth, currentDay)).toISOString().slice(0, 10);
      weeks[weekIndex][dayIndexInWeek] = dateIso;
      currentDay += 1;
    }
  }

  const summaryValues = Object.values(monthSummary);
  const totalTrackedDays = summaryValues.length;
  const zeroDays = summaryValues.filter((c) => c === 0).length;
  const midDays = summaryValues.filter((c) => c >= 1 && c <= 3).length;
  const strongDays = summaryValues.filter((c) => c >= 4).length;
  const strongRatio = totalTrackedDays === 0 ? 0 : Math.round((strongDays / totalTrackedDays) * 100);

  const from = searchParams.get("from");
  const fromSurah = searchParams.get("surah");
  const fromAyah = searchParams.get("ayah");
  const fromDhikrEntryTitle = searchParams.get("entryTitle");

  return (
    <div
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        display: "grid",
        gap: spacing.lg,
      }}
    >
      <section
        style={{
          backgroundColor: "rgba(255,252,248,0.94)",
          borderRadius: spacing.lg,
          padding: `${spacing.lg * 1.5}px`,
          boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
          border: "1px solid rgba(0,0,0,0.04)",
          color: colors.neutral900,
          display: "grid",
          gap: spacing.md,
        }}
      >
        <span
          style={{
            fontSize: 13,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#2F5F3A",
            fontWeight: 600,
          }}
        >
          Programme spirituel
        </span>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            margin: 0,
            color: colors.primaryDark,
          }}
        >
          Ton planning Imane du jour
        </h1>
        {from === "quran" && (
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: "#1F4D3B",
              margin: 0,
            }}
          >
            Tu es arrivée ici depuis le Coran (sourate {fromSurah ?? "?"}
            {fromAyah ? `, verset ${fromAyah}` : ""}). Tu peux utiliser la case &quot;Lecture de Coran&quot; pour suivre ce passage dans ton
            planning.
          </p>
        )}
        {from === "dhikr" && fromDhikrEntryTitle && (
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: "#1F4D3B",
              margin: 0,
            }}
          >
            Tu es arrivée ici depuis une dua/dhikr ({fromDhikrEntryTitle}). Tu peux utiliser la case &quot;Duas personnelles&quot; pour te
            rappeler de la réciter aujourd’hui.
          </p>
        )}
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: "#1F4D3B",
            margin: 0,
          }}
        >
          Ce planning t’aide à structurer quelques actions simples (Coran, dhikr, duas, sadaqa) pour nourrir ton cœur, que tu
          sois en période de jeûne, de règles ou en dehors de Ramadan.
        </p>
      </section>

      <section
        style={{
          backgroundColor: "rgba(255,252,248,0.94)",
          borderRadius: spacing.lg,
          padding: `${spacing.lg * 1.5}px`,
          boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
          border: "1px solid rgba(0,0,0,0.04)",
          color: colors.neutral900,
          display: "grid",
          gap: spacing.md,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing.sm,
            gap: spacing.sm,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => {
              const d = parseIsoDate(selectedDateIso);
              const prevMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
              setSelectedDateIso(prevMonth.toISOString().slice(0, 10));
            }}
            style={historyChipStyle(false)}
          >
            ← Mois précédent
          </button>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: colors.primaryDark,
            }}
          >
            {firstDayOfMonth.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
            })}
          </span>
          <div style={{ display: "flex", gap: spacing.xs, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setSelectedDateIso(getTodayIso())}
              style={historyChipStyle(selectedDateIso === getTodayIso())}
            >
              Aujourd’hui
            </button>
            <button
              type="button"
              onClick={() => {
                const d = parseIsoDate(selectedDateIso);
                const nextMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
                setSelectedDateIso(nextMonth.toISOString().slice(0, 10));
              }}
              style={historyChipStyle(false)}
            >
              Mois suivant →
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            gap: 4,
            fontSize: 11,
            color: "rgba(0,0,0,0.7)",
          }}
        >
          {[
            "Lun",
            "Mar",
            "Mer",
            "Jeu",
            "Ven",
            "Sam",
            "Dim",
          ].map((day) => (
            <div key={day} style={{ textAlign: "center", fontWeight: 600 }}>
              {day}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            gap: 4,
          }}
        >
          {weeks.map((week, wIdx) =>
            week.map((dateIso, dIdx) => {
              if (!dateIso) {
                return <div key={`${wIdx}-${dIdx}`} />;
              }
              const dateNum = Number(dateIso.slice(-2));
              const isSelected = dateIso === selectedDateIso;
              const isToday = dateIso === getTodayIso();
              const completedForDay = monthSummary[dateIso] ?? 0;

              return (
                <button
                  key={dateIso}
                  type="button"
                  onClick={() => setSelectedDateIso(dateIso)}
                  style={calendarDayStyle(isSelected, isToday, completedForDay)}
                >
                  <span>{dateNum}</span>
                </button>
              );
            }),
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: spacing.sm,
            marginTop: spacing.sm,
            fontSize: 11,
            flexWrap: "wrap",
            color: "rgba(0,0,0,0.7)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.12)",
                backgroundColor: "rgba(255,252,248,0.94)",
              }}
            />
            <span>0 / 5 objectifs</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 6,
                border: "1px solid rgba(212,175,55,0.5)",
                backgroundColor: "rgba(212, 175, 55, 0.16)",
              }}
            />
            <span>1 à 3 / 5</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 6,
                border: "1px solid rgba(46,125,50,0.6)",
                backgroundColor: "rgba(46, 125, 50, 0.18)",
              }}
            />
            <span>4 à 5 / 5</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: spacing.sm,
            marginTop: spacing.sm,
            fontSize: 12,
          }}
        >
          <div
            style={{
              padding: `${spacing.xs}px ${spacing.sm}px`,
              borderRadius: spacing.md,
              border: "1px solid rgba(0,0,0,0.06)",
              backgroundColor: "rgba(255,252,248,0.94)",
              display: "grid",
              gap: 2,
            }}
          >
            <span style={{ fontWeight: 600, color: colors.primaryDark }}>Stats Imane du mois</span>
            <span style={{ color: "rgba(0,0,0,0.75)" }}>Jours suivis : {totalTrackedDays}</span>
            <span style={{ color: "rgba(0,0,0,0.75)" }}>0/5 : {zeroDays}</span>
            <span style={{ color: "rgba(0,0,0,0.75)" }}>1–3/5 : {midDays}</span>
            <span style={{ color: "rgba(0,0,0,0.75)" }}>4–5/5 : {strongDays}</span>
          </div>
          <div
            style={{
              padding: `${spacing.xs}px ${spacing.sm}px`,
              borderRadius: spacing.md,
              border: "1px solid rgba(0,0,0,0.06)",
              backgroundColor: "rgba(212, 175, 55, 0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, color: colors.primaryDark }}>Jours forts (4–5/5)</span>
              <span style={{ color: "rgba(0,0,0,0.85)" }}>{strongRatio}% du mois suivi</span>
            </div>
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 6,
                borderRadius: 999,
                overflow: "hidden",
                backgroundColor: "rgba(255,255,255,0.7)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${strongRatio}%`,
                  maxWidth: "100%",
                  background: "linear-gradient(90deg, #2E7D32, #66BB6A)",
                }}
              />
            </div>
          </div>
        </div>

        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            margin: 0,
            color: colors.primaryDark,
          }}
        >
          Checklist du jour
        </h2>
        {error && (
          <p
            style={{
              fontSize: 13,
              color: "#8B1A1A",
              fontWeight: 600,
            }}
          >
            {error}
          </p>
        )}
        <p
          style={{
            fontSize: 13,
            color: "rgba(0,0,0,0.75)",
            margin: 0,
          }}
        >
          Ces éléments sont sauvegardés pour toi pour la journée du {selectedDateIso}. {saving && "Enregistrement en cours…"}
        </p>
        <p
          style={{
            fontSize: 13,
            color: "rgba(0,0,0,0.8)",
            margin: 0,
          }}
        >
          Résumé pour ce jour : {completedCount} / 5 objectifs complétés.
        </p>
        <div
          style={{
            display: "flex",
            gap: spacing.sm,
            marginTop: spacing.sm,
            marginBottom: spacing.sm,
            flexWrap: "wrap",
          }}
        >
          {historyDates.map((d) => {
            const isActive = d.value === selectedDateIso;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => setSelectedDateIso(d.value)}
                style={historyChipStyle(isActive)}
              >
                <span>{d.label}</span>
                <span style={{ fontSize: 11, opacity: 0.8 }}>({d.value})</span>
              </button>
            );
          })}
        </div>
        <div
          style={{
            display: "grid",
            gap: spacing.sm,
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          }}
        >
          {DAILY_ITEMS.map((item) => (
            <div
              key={item.id}
              style={{
                borderRadius: spacing.md,
                border: "1px solid rgba(0,0,0,0.06)",
                backgroundColor: "rgba(255,252,248,0.94)",
                padding: `${spacing.sm * 1.2}px ${spacing.sm * 1.4}px`,
                display: "grid",
                gap: spacing.xs,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: spacing.sm,
                }}
              >
                <button
                  type="button"
                  onClick={() => void toggleItem(itemKeyMap[item.id])}
                  style={checkboxStyle(itemsState[itemKeyMap[item.id]])}
                  aria-pressed={itemsState[itemKeyMap[item.id]]}
                />
                <div style={{ display: "grid", gap: 4 }}>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      margin: 0,
                      color: "#2F5F3A",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "rgba(0,0,0,0.75)",
                      margin: 0,
                    }}
                  >
                    {item.description}
                  </p>
                  {item.id === "duas-personnelles" && from === "dhikr" && fromDhikrEntryTitle && (
                    <p
                      style={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: "rgba(0,0,0,0.8)",
                        margin: 0,
                      }}
                    >
                      Aujourd’hui, tu peux te concentrer sur la dua/dhikr : {fromDhikrEntryTitle}.
                    </p>
                  )}
                  {item.id === "coran-tilawa" && from === "quran" && (
                    <p
                      style={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: "rgba(0,0,0,0.8)",
                        margin: 0,
                      }}
                    >
                      Aujourd’hui, tu peux viser particulièrement la sourate {fromSurah ?? "?"}
                      {fromAyah ? `, verset ${fromAyah}` : ""}.
                    </p>
                  )}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  color: "rgba(0,0,0,0.5)",
                }}
              >
                {item.category === "coran" && "Coran"}
                {item.category === "dhikr" && "Dhikr"}
                {item.category === "duas" && "Duas"}
                {item.category === "sadaqa" && "Sadaqa"}
                {item.category === "autre" && "Imane"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const checkboxStyle = (checked: boolean): CSSProperties => ({
  width: 18,
  height: 18,
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,0.28)",
  backgroundColor: checked ? colors.primary : "rgba(255,252,248,0.94)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
});

const historyChipStyle = (active: boolean): CSSProperties => ({
  borderRadius: 999,
  border: `1px solid ${active ? "#D4AF37" : "rgba(0,0,0,0.12)"}`,
  backgroundColor: active ? "rgba(212,175,55,0.1)" : "rgba(255,252,248,0.94)",
  padding: `${spacing.xs * 0.8}px ${spacing.sm}px`,
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  gap: 6,
});

const calendarDayStyle = (selected: boolean, today: boolean, completedCount: number): CSSProperties => {
  let baseBg = "rgba(255,252,248,0.94)";
  if (completedCount >= 4) {
    baseBg = "rgba(46, 125, 50, 0.18)"; // vert doux
  } else if (completedCount >= 1) {
    baseBg = "rgba(212,175,55,0.16)"; // doré doux
  }

  const bg = selected ? "rgba(212,175,55,0.24)" : baseBg;

  return {
    borderRadius: 10,
    border: `1px solid ${selected ? "#D4AF37" : "rgba(0,0,0,0.08)"}`,
    backgroundColor: bg,
    padding: 6,
    minHeight: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    color: today ? colors.primaryDark : "rgba(0,0,0,0.8)",
  };
};
