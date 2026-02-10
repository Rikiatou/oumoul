"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { colors, spacing } from "@oumoul/ui";

export default function CycleTrackingPage() {
  const router = useRouter();

  const cards = [
    {
      title: "Suivi du cycle",
      description: "Enregistre tes périodes, jours de propreté et spotting en toute discrétion.",
    },
    {
      title: "Historique",
      description: "Garde en mémoire tes derniers cycles pour mieux te connaître.",
    },
    {
      title: "Lien avec le jeûne",
      description: "Visualise rapidement l’impact de ton cycle sur tes jours de jeûne.",
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
          display: "grid",
          gap: spacing.md,
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          alignItems: "center",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(255,252,248,0.94)",
            borderRadius: spacing.lg,
            padding: `${spacing.lg * 1.3}px`,
            boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
            border: "1px solid rgba(0,0,0,0.04)",
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
            Suivi du cycle
          </p>
          <h2
            style={{
              fontSize: 26,
              lineHeight: 1.4,
              fontWeight: 800,
              color: colors.primaryDark,
            }}
          >
            Ton espace intime pour comprendre ton corps
          </h2>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: "#1F4D3B",
            }}
          >
            Ici, tu pourras consigner tes règles, spotting et jours de propreté afin de mieux organiser ton jeûne, tes ibadates
            et ton bien-être au quotidien.
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
              backgroundImage: "url('/Arrangement Floral D.png')",
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>
      </section>

      <section
        style={{
          backgroundColor: "rgba(255,252,248,0.94)",
          borderRadius: spacing.lg,
          padding: `${spacing.lg * 1.3}px`,
          boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
          border: "1px solid rgba(0,0,0,0.04)",
          color: colors.neutral900,
          display: "grid",
          gap: spacing.md,
        }}
      >
        <h3
          style={{
            fontSize: 20,
            fontWeight: 700,
            margin: 0,
            color: colors.primaryDark,
          }}
        >
          Ce que tu pourras suivre ici
        </h3>
        <div
          style={{
            display: "grid",
            gap: spacing.md,
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          }}
        >
          {cards.map((card) => (
            <div
              key={card.title}
              style={{
                textAlign: "left",
                padding: `${spacing.md}px`,
                borderRadius: spacing.md,
                border: "1px solid rgba(0,0,0,0.06)",
                backgroundColor: colors.neutral200,
                display: "grid",
                gap: spacing.xs,
              }}
            >
              <h4
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  margin: 0,
                  color: "#2F5F3A",
                }}
              >
                {card.title}
              </h4>
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
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          backgroundColor: "rgba(255,252,248,0.94)",
          borderRadius: spacing.lg,
          padding: `${spacing.lg * 1.3}px`,
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
            gap: spacing.md,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: spacing.xs,
            }}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
                color: colors.primaryDark,
              }}
            >
              Bientôt : calendrier & journal détaillé
            </h3>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: "rgba(0,0,0,0.7)",
                margin: 0,
              }}
            >
              Nous ajouterons ici un calendrier et un journal jour par jour pour t’aider à suivre précisément ton cycle et mieux
              organiser tes ibadates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/fasting")}
            style={{
              padding: `${spacing.sm * 1.1}px ${spacing.lg * 1.6}px`,
              borderRadius: 999,
              border: "none",
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.primaryDark})`,
              color: colors.neutral100,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Aller vers mon suivi du jeûne
          </button>
        </div>
      </section>
    </div>
  );
}
