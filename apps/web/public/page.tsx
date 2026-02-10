"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { appMetadata } from "@oumoul/config";
import { colors, spacing } from "@oumoul/ui";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [ctaHover, setCtaHover] = React.useState(false);

  const features = [
    {
      title: "Cycle & jeûne",
      icon: "🩺",
      description: "Suis ton cycle et tes jours de jeûne à rattraper en toute discrétion.",
    },
    {
      title: "Planner rattrapage",
      icon: "📅",
      description: "Planifie et organise tes jours de rattrapage avec douceur.",
    },
    {
      title: "Dhikr & duas",
      icon: "🕊️",
      description: "Rappels, adhkar et invocations pour nourrir ton imane.",
    },
    {
      title: "Tafsir & Coran",
      icon: "📚",
      description: "Versets, tafsir et méditations pour accompagner tes lectures.",
    },
    {
      title: "Prières & Qibla",
      icon: "🕌",
      description: "Horaires de prière et direction de la Qibla, où que tu sois.",
    },
    {
      title: "Famille & foyer",
      icon: "❤️",
      description: "Outils pour aligner ton foyer autour d’objectifs spirituels.",
    },
  ];

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `${spacing.lg * 1.5}px ${spacing.lg}px`,
        backgroundImage:
          "linear-gradient(to bottom, #F7EEDD 0%, #F4C2C2 35%, #E4D2F4 70%, #F7EEDD 100%)",
      }}
    >
      <main
        style={{
          maxWidth: 480,
          width: "100%",
          backgroundColor: colors.neutral100,
          borderRadius: spacing.lg,
          padding: `${spacing.lg * 2.2}px ${spacing.lg * 2}px ${spacing.lg * 2.6}px`,
          boxShadow: "0 24px 48px rgba(0,0,0,0.16)",
          border: "1px solid rgba(0,0,0,0.04)",
          display: "grid",
          gap: spacing.lg,
          textAlign: "center",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 500ms ease-out, transform 500ms ease-out",
        }}
      >
        <div
          style={{
            margin: "0 auto",
            marginBottom: spacing.md,
            display: "grid",
            placeItems: "center",
            gap: spacing.sm * 0.6,
          }}
        >
          <Image
            src="/Hidjabi.png"
            alt="Profil femme musulmane voilée"
            width={112}
            height={112}
            style={{ objectFit: "contain" }}
            priority
          />
          <div
            style={{
              width: 190,
              height: 110,
              borderRadius: spacing.lg,
              backgroundImage: "url('/Arrangement Floral D.png')",
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>

        <header
          style={{
            display: "grid",
            gap: spacing.sm * 0.4,
          }}
        >
          <span
            style={{
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#2F5F3A",
              fontWeight: 600,
            }}
          >
            Bienvenue dans
          </span>
          <h1
            style={{
              fontSize: 44,
              lineHeight: 1.2,
              fontWeight: 800,
              color: colors.primaryDark,
              fontFamily:
                'Cairo, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            {appMetadata.name}
          </h1>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.5,
              color: "#1F4D3B",
              marginTop: spacing.md,
            }}
          >
            Ton espace bien-être & spiritualité.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gap: spacing.md,
            marginTop: spacing.lg,
            padding: `${spacing.md * 1.4}px`,
            borderRadius: spacing.md,
            backgroundImage: "url('/cadre-fleurs.png')",
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundColor: "transparent",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: spacing.md,
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            }}
          >
            {features.map((feature, index) => (
              <div
                key={feature.title}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: `${spacing.sm * 1.1}px ${spacing.sm * 1.2}px`,
                  borderRadius: spacing.md,
                  backgroundColor: colors.neutral200,
                  border: "1px solid rgba(0,0,0,0.04)",
                  borderTop: "2px solid #D4AF37",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 22, lineHeight: 1 }}>{feature.icon}</div>
                <div style={{ display: "grid", gap: 2 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: index < 3 ? "#2F5F3A" : "#D4AF37",
                    }}
                  >
                    {feature.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      lineHeight: 1.4,
                      color: "rgba(0,0,0,0.7)",
                    }}
                  >
                    {feature.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.8,
            color: "#4B2E83",
            marginTop: spacing.sm * 0.75,
          }}
        >
          Ramadan Nissa Tracker & Imane t’aide à vivre un Ramadan serein : suivi discret du cycle, calcul des jours de jeûne à
          rattraper et programme personnalisé pour les rembourser facilement après le Ramadan. Toute l’année, l’application
          t’accompagne avec prières, Coran, dhikr et rappels doux pour nourrir ta foi au quotidien.
        </p>

        <footer
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: spacing.sm,
            marginTop: spacing.lg,
          }}
        >
          <div style={{ display: "grid", gap: 6, alignItems: "center" }}>
            <select
              defaultValue="en"
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "1px solid #D4AF37",
                backgroundColor: colors.secondary,
                color: "#2F5F3A",
                fontSize: 14,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              <option value="fr">🇫🇷 Français</option>
              <option value="en">🇬🇧 English</option>
              <option value="ar">🇸🇦 العربية</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => router.push("/auth")}
            style={{
              padding: `${spacing.sm * 1.2}px ${spacing.lg * 1.8}px`,
              borderRadius: 999,
              background: ctaHover
                ? `linear-gradient(135deg, ${colors.primaryDark}, ${colors.accent})`
                : `linear-gradient(135deg, ${colors.accent}, ${colors.primaryDark})`,
              color: colors.neutral100,
              fontWeight: 700,
              fontSize: 15,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: ctaHover
                ? "0 12px 24px rgba(0,0,0,0.25)"
                : "0 8px 18px rgba(0,0,0,0.18)",
              transform: ctaHover ? "translateY(-1px)" : "translateY(0)",
              transition:
                "background 220ms ease-out, box-shadow 220ms ease-out, transform 220ms ease-out",
            }}
            onMouseEnter={() => setCtaHover(true)}
            onMouseLeave={() => setCtaHover(false)}
          >
            <span>Commencer</span>
            <span style={{ fontSize: 18 }}>→</span>
          </button>
        </footer>
      </main>
    </div>
  );
}
