"use client";

import { useRouter } from "next/navigation";
import { colors, spacing } from "@oumoul/ui";
import { useAuth } from "@/context/auth-context";

export default function ImaneDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
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

  if (!user) {
    router.replace("/");
    return null;
  }

  const cards = [
    {
      title: "Coran & tafsir",
      description: "Accède à des lectures du Coran, tafsir et méditations pour nourrir ton cœur.",
      actionLabel: "Accéder au Coran",
      href: "/dashboard/imane/quran",
    },
    {
      title: "Duas & adhkar",
      description: "Invocations du quotidien, duas de Ramadan et adhkar du matin/soir.",
      actionLabel: "Voir les duas",
      href: "/dashboard/dhikr?category=Périodes sensibles&theme=anxiete_sante",
    },
    {
      title: "Rappels doux",
      description: "Petits rappels d’imane, hadiths et conseils pratiques pour ta foi.",
      actionLabel: "Voir les rappels",
      href: "/dashboard/imane/reminders",
    },
    {
      title: "Programme spirituel",
      description: "Organise un planning de lecture, dhikr et sadaqa adapté à ton rythme.",
      actionLabel: "Planifier",
      href: "/dashboard/imane/program",
    },
    {
      title: "Cycle & Ramadan",
      description: "Suis ton cycle (règles, spotting, postpartum) et prépare ton Ramadan en douceur.",
      actionLabel: "Voir le calendrier",
      href: "/dashboard/imane/ramadan",
    },
  ];

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
          backgroundColor: "rgba(255,252,248,0.94)",
          borderRadius: spacing.lg,
          padding: `${spacing.lg * 1.5}px`,
          boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
          border: "1px solid rgba(0,0,0,0.04)",
          color: colors.neutral900,
          display: "grid",
          gap: spacing.sm,
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
          Espace imane
        </span>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            margin: 0,
            color: colors.primaryDark,
          }}
        >
          Nourrir ton imane au quotidien
        </h1>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: "#1F4D3B",
            margin: 0,
          }}
        >
          Cet espace rassemble Coran, duas, dhikr et rappels doux pour t’accompagner dans ta relation avec Allah, pendant
          Ramadan et le reste de l’année.
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
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            margin: 0,
            color: colors.primaryDark,
          }}
        >
          Tes espaces spirituels
        </h2>
        <div
          style={{
            display: "grid",
            gap: spacing.md,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {cards.map((card) => (
            <button
              key={card.title}
              type="button"
              onClick={() => card.href.startsWith("#") || router.push(card.href)}
              style={{
                textAlign: "left",
                padding: `${spacing.md}px`,
                borderRadius: spacing.md,
                border: "1px solid rgba(0,0,0,0.06)",
                backgroundColor: colors.neutral200,
                display: "grid",
                gap: spacing.xs,
                cursor: card.href.startsWith("#") ? "default" : "pointer",
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  margin: 0,
                  color: "#2F5F3A",
                }}
              >
                {card.title}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "rgba(0,0,0,0.7)",
                  margin: 0,
                }}
              >
                {card.description}
              </p>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#D4AF37",
                  marginTop: spacing.xs,
                }}
              >
                {card.actionLabel}
                {!card.href.startsWith("#") && " →"}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
