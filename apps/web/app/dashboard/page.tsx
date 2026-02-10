"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { colors, spacing } from "@oumoul/ui";
import { useAuth } from "@/context/auth-context";
import { cycleApi, prayerApi, ramadanApi } from "@/lib/api";

export default function DashboardHomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const displayName = user?.firstName || user?.email || "ma soeur";
  const [prayerStatus, setPrayerStatus] = useState<string>("Chargement…");
  const [cycleStatus, setCycleStatus] = useState<string>("Mets à jour ton cycle");
  const [ramadanStatus, setRamadanStatus] = useState<string>("Consulter le calendrier");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const palette = {
    sand: "#F7F1EA",
    mint: "#E7F3ED",
    blush: "#F9E9EE",
    lavender: "#EBE5F5",
    gold: "#D4AF37",
    deepGreen: "#1F4D3B",
    ink: "#0F1A18",
  };

  type Card = {
    title: string;
    description: string;
    actionLabel: string;
    href: string;
    tone: string;
  };

  const startHereCards: Card[] = [
    {
      title: "1. Prière",
      description: "Tes horaires, Qibla et rappels pour la journée.",
      actionLabel: "Voir la prière",
      href: "/dashboard/prayer",
      tone: palette.mint,
    },
    {
      title: "2. Jeûne & calendrier",
      description: "Calendrier Ramadan, jours manqués et rattrapage.",
      actionLabel: "Ouvrir le calendrier",
      href: "/dashboard/fasting",
      tone: palette.sand,
    },
    {
      title: "3. Cycle",
      description: "Statut du jour (pure / règles / spotting) avec impact sur prière/jeûne.",
      actionLabel: "Suivre mon cycle",
      href: "/dashboard/cycle",
      tone: palette.blush,
    },
  ];

  const knowledgeCards: Card[] = [
    {
      title: "Coran (Imane)",
      description: "Lecture, programme quotidien et suivi Ramadan.",
      actionLabel: "Ouvrir l’espace Imane",
      href: "/dashboard/imane",
      tone: palette.lavender,
    },
    {
      title: "Tafsir",
      description: "Comprendre les versets avec un tafsir accessible.",
      actionLabel: "Lire le tafsir",
      href: "/dashboard/tafsir",
      tone: palette.sand,
    },
    {
      title: "Dhikr",
      description: "Adhkār matin/soir, duas, répétitions.",
      actionLabel: "Faire du dhikr",
      href: "/dashboard/dhikr",
      tone: palette.mint,
    },
  ];

  const utilityCards: Card[] = [
    {
      title: "Rappels",
      description: "Active notifications (programme imane, jeûne, dhikr).",
      actionLabel: "Configurer les rappels",
      href: "/dashboard/reminders",
      tone: palette.blush,
    },
  ];

  const statusCardStyle: React.CSSProperties = {
    textAlign: "left",
    padding: `${spacing.md}px`,
    borderRadius: spacing.md,
    border: "1px solid rgba(0,0,0,0.06)",
    backgroundColor: "rgba(255,255,255,0.9)",
    display: "grid",
    gap: 6,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(0,0,0,0.08)",
  };

  const statusLabelStyle: React.CSSProperties = {
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "rgba(15,26,24,0.7)",
  };

  const statusValueStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 800,
    color: "#1F4D3B",
    lineHeight: 1.2,
  };

  const statusLinkStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "#D4AF37",
  };

  useEffect(() => {
    // Fetch today's prayer status for Douala by default; will be refined later with user geo prefs
    const fetchPrayer = async () => {
      try {
        const latitude = coords?.lat ?? 4.0511;
        const longitude = coords?.lng ?? 9.7679;
        const resp = await prayerApi.getPrayerTimes({
          latitude,
          longitude,
          timeZone: "Africa/Douala",
        });
        const current = resp.currentPrayer ? resp.currentPrayer.toLowerCase() : null;
        const currentTime = resp.currentPrayerTime
          ? new Date(resp.currentPrayerTime).toLocaleTimeString(user?.locale ?? "fr", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null;
        const next = resp.nextPrayer ? resp.nextPrayer.toLowerCase() : null;
        const nextTime = resp.nextPrayerTime
          ? new Date(resp.nextPrayerTime).toLocaleTimeString(user?.locale ?? "fr", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null;
        if (current && currentTime && next && nextTime) {
          setPrayerStatus(`En cours: ${current} (${currentTime}) · Prochaine: ${next} (${nextTime})`);
        } else if (next && nextTime) {
          setPrayerStatus(`Prochaine: ${next} (${nextTime})`);
        } else {
          setPrayerStatus("Horaires disponibles");
        }
        if (!coords) {
          setLocationMessage("Localisation par défaut: Douala (définis ta position pour plus de précision).");
        } else {
          setLocationMessage(null);
        }
      } catch {
        setPrayerStatus("Horaires indisponibles");
        if (!coords) {
          setLocationMessage("Localisation par défaut: Douala.");
        }
      }
    };
    void fetchPrayer();
  }, [user?.locale, coords]);

  useEffect(() => {
    const fetchCycle = async () => {
      try {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth() + 1;
        const todayIso = now.toISOString().slice(0, 10);
        const data = await cycleApi.getMonth(year, month);
        const today = data.days.find((d) => d.date === todayIso);
        if (!today) {
          setCycleStatus("Mettre à jour aujourd’hui");
          return;
        }
        const labels: Record<string, string> = {
          PURE: "Jour pur",
          MENSES: "Règles",
          SPOTTING: "Spotting",
          POSTPARTUM: "Post-partum",
        };
        setCycleStatus(labels[today.status] ?? today.status);
      } catch {
        setCycleStatus("Cycle indisponible");
      }
    };
    void fetchCycle();
  }, []);

  useEffect(() => {
    // Try to get user location once; fallback remains to Douala
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("oumoul.prayerCoords");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { lat: number; lng: number };
          if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
            setCoords(parsed);
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(nextCoords);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("oumoul.prayerCoords", JSON.stringify(nextCoords));
        }
        setLocationMessage(null);
      },
      () => {
        setCoords(null);
        setLocationMessage("Localisation refusée. Utilisation du fallback Douala.");
      },
      { maximumAge: 60_000, timeout: 7_000 },
    );
  }, []);

  useEffect(() => {
    const fetchRamadan = async () => {
      try {
        const year = new Date().getFullYear();
        const summary = await ramadanApi.summary(year);
        const todayIso = new Date().toISOString().slice(0, 10);
        const today = summary.days.find((d) => d.date === todayIso);
        const counts = summary.days.reduce<Record<string, number>>((acc, day) => {
          if (day.fastStatus) {
            acc[day.fastStatus] = (acc[day.fastStatus] ?? 0) + 1;
          }
          return acc;
        }, {});
        const totalDays = summary.days.length;
        const fasted = counts.FASTED ?? 0;
        const missed = counts.MISSED ?? 0;
        const madeUp = counts.MADE_UP ?? 0;
        if (today?.fastStatus) {
          const labelMap: Record<string, string> = {
            FASTED: "Jeûné",
            EXEMPTION: "Exemptée",
            MISSED: "Raté",
            MADE_UP: "Rattrapé",
          };
          setRamadanStatus(`${labelMap[today.fastStatus] ?? today.fastStatus} · ${fasted}/${totalDays} faits`);
        } else {
          setRamadanStatus(`Avancement: ${fasted}/${totalDays} · Ratés: ${missed} · Rattrapés: ${madeUp}`);
        }
      } catch {
        setRamadanStatus("Ramadan indisponible");
      }
    };
    void fetchRamadan();
  }, []);

  return (
    <div
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        width: "100%",
        display: "grid",
        gap: spacing.lg,
      }}
    >
      <section
        style={{
          display: "grid",
          gap: spacing.md,
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          alignItems: "center",
          background: "radial-gradient(circle at 15% 20%, rgba(223,242,234,0.7), transparent 45%), radial-gradient(circle at 85% 20%, rgba(236,227,247,0.7), transparent 45%)",
          borderRadius: spacing.lg,
          padding: spacing.lg,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            backgroundColor: palette.sand,
            borderRadius: spacing.lg,
            padding: `${spacing.lg * 1.2}px`,
            boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.03)",
            color: colors.neutral900,
            display: "grid",
            gap: spacing.sm,
          }}
        >
          <p
            style={{
              fontSize: 13,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#2F5F3A",
              fontWeight: 600,
            }}
          >
            Ton espace bien-être & spiritualité
          </p>
          <h2
            style={{
              fontSize: 32,
              lineHeight: 1.25,
              fontWeight: 800,
              color: palette.deepGreen,
            }}
          >
            Assalam aleyki, {displayName}
          </h2>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: palette.deepGreen,
            }}
          >
            Ici, tu retrouves ton suivi du jeûne, de la prière et de ton imane, dans un espace doux et organisé, pensé pour
            t’accompagner pendant Ramadan et toute l’année.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            placeItems: "center",
            gap: spacing.sm,
          }}
        >
          <Image
            src="/Hidjabiicon.png"
            alt="Profil femme musulmane voilée"
            width={110}
            height={110}
            style={{ objectFit: "contain" }}
            priority
          />
          <div
            style={{
              width: 190,
              height: 110,
              borderRadius: spacing.lg,
              backgroundImage: "url('/Cadre De Couche Ouve.png')",
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: spacing.sm,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/cycle")}
          style={statusCardStyle}
        >
          <span style={statusLabelStyle}>Cycle</span>
          <strong style={statusValueStyle}>Mettre à jour aujourd’hui</strong>
          <span style={statusLinkStyle}>Ouvrir le suivi →</span>
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/fasting")}
          style={statusCardStyle}
        >
          <span style={statusLabelStyle}>Ramadan / jeûne</span>
          <strong style={statusValueStyle}>Consulter le calendrier</strong>
          <span style={statusLinkStyle}>Voir mes jours →</span>
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/prayer")}
          style={statusCardStyle}
        >
          <span style={statusLabelStyle}>Prière du jour</span>
          <strong style={statusValueStyle}>{prayerStatus}</strong>
          <span style={statusLinkStyle}>Accéder →</span>
        </button>
      </section>

      <section
        style={{
          backgroundColor: "rgba(15,26,24,0.75)",
          borderRadius: spacing.lg,
          padding: `${spacing.lg * 1.3}px`,
          boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
          border: "1px solid rgba(255,255,255,0.04)",
          color: colors.neutral100,
          display: "grid",
          gap: spacing.md,
        }}
      >
        <div style={{ display: "grid", gap: spacing.xs }}>
          <h3
            style={{
              fontSize: 20,
              fontWeight: 800,
              margin: 0,
              color: palette.gold,
            }}
          >
            Commencer ici
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>
            Pour une première utilisation, commence par ces 3 étapes. Ensuite explore les modules selon ton besoin du jour.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gap: spacing.md,
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          }}
        >
          {startHereCards.map((card: Card) => (
            <button
              key={card.href}
              type="button"
              onClick={() => router.push(card.href)}
              style={{
                textAlign: "left",
                padding: `${spacing.md}px`,
                borderRadius: spacing.md,
                border: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: `${card.tone}`,
                display: "grid",
                gap: spacing.xs,
                cursor: "pointer",
              }}
            >
              <h4
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  margin: 0,
                  color: palette.deepGreen,
                }}
              >
                {card.title}
              </h4>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "#1a2f2a",
                  margin: 0,
                }}
              >
                {card.description}
              </p>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: palette.gold,
                  marginTop: spacing.xs,
                }}
              >
                {card.actionLabel} →
              </span>
            </button>
          ))}
        </div>

        <div style={{ height: 1, backgroundColor: "rgba(0,0,0,0.06)", marginTop: spacing.sm }} />

        <div style={{ display: "grid", gap: spacing.xs }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: palette.gold }}>Connaissance & spiritualité</h3>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>
            Coran, tafsir et adhkār à portée de main.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gap: spacing.md,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {knowledgeCards.map((card: Card) => (
            <button
              key={card.href}
              type="button"
              onClick={() => router.push(card.href)}
              style={{
                textAlign: "left",
                padding: `${spacing.md}px`,
                borderRadius: spacing.md,
                border: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: card.tone,
                display: "grid",
                gap: spacing.xs,
                cursor: "pointer",
              }}
            >
              <h4
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  margin: 0,
                  color: palette.deepGreen,
                }}
              >
                {card.title}
              </h4>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: "#1a2f2a", margin: 0 }}>{card.description}</p>
              <span style={{ fontSize: 13, fontWeight: 700, color: palette.gold, marginTop: spacing.xs }}>
                {card.actionLabel} →
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: spacing.xs, marginTop: spacing.sm }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: palette.gold }}>Organisation & rappels</h3>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>
            Notifications et rappels pour suivre tes routines.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gap: spacing.md,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {utilityCards.map((card: Card) => (
            <button
              key={card.href}
              type="button"
              onClick={() => router.push(card.href)}
              style={{
                textAlign: "left",
                padding: `${spacing.md}px`,
                borderRadius: spacing.md,
                border: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: card.tone,
                display: "grid",
                gap: spacing.xs,
                cursor: "pointer",
              }}
            >
              <h4
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  margin: 0,
                  color: palette.deepGreen,
                }}
              >
                {card.title}
              </h4>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: "#1a2f2a", margin: 0 }}>{card.description}</p>
              <span style={{ fontSize: 13, fontWeight: 700, color: palette.gold, marginTop: spacing.xs }}>
                {card.actionLabel} →
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
