"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { colors, spacing } from "@oumoul/ui";
import { useAuth } from "@/context/auth-context";
import { hadithApi } from "@/lib/api";

interface HadithItem {
  collection: string;
  hadithNumber: string;
  text: string;
  reference?: string;
}

interface TopicOption {
  id: string;
  label: string;
}

const TOPICS: TopicOption[] = [
  { id: "patience", label: "Patience & épreuves" },
  { id: "tawakkul", label: "Confiance en Allah (tawakkul)" },
  { id: "regles", label: "Règles & purification" },
  { id: "ramadan", label: "Ramadan & nuit de Qadr" },
  { id: "famille", label: "Mariage & famille" },
];

export default function ImaneRemindersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [topic, setTopic] = useState<string>(TOPICS[0]?.id ?? "patience");
  const [hadith, setHadith] = useState<HadithItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingHadith, setLoadingHadith] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  const fetchHadith = async (selectedTopic: string) => {
    setLoadingHadith(true);
    setError(null);
    try {
      const data = await hadithApi.random(selectedTopic);
      setHadith(data.hadith as HadithItem);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger le rappel.";
      setError(message);
      setHadith(null);
    } finally {
      setLoadingHadith(false);
    }
  };

  useEffect(() => {
    if (!loading && user && topic) {
      void fetchHadith(topic);
    }
  }, [loading, user, topic]);

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

  return (
    <div style={containerStyle}>
      <section style={sectionStyle}>
        <header style={sectionHeaderStyle}>
          <div>
            <span style={badgeStyle}>Rappels doux</span>
            <h1 style={titleStyle}>Petits rappels pour ton cœur</h1>
            <p style={subtitleStyle}>
              Choisis un thème et laisse-toi nourrir par un hadith court, pour t’accompagner dans les moments de patience, de
              tawakkul ou d’épreuves.
            </p>
          </div>
        </header>

        <div style={topicsBarStyle}>
          {TOPICS.map((option) => {
            const isActive = option.id === topic;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTopic(option.id)}
                style={topicChipStyle(isActive)}
              >
                {option.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => void fetchHadith(topic)}
            style={refreshButtonStyle}
            disabled={loadingHadith}
          >
            {loadingHadith ? "Rappel en cours…" : "Changer de rappel"}
          </button>
        </div>

        {error && <p style={{ color: "#D32F2F", fontSize: 13 }}>{error}</p>}

        {hadith ? (
          <article style={hadithCardStyle}>
            <p style={hadithTextStyle}>{hadith.text}</p>
            <p style={hadithMetaStyle}>
              {hadith.collection} · Hadith n°{hadith.hadithNumber}
            </p>
            {hadith.reference && <p style={hadithReferenceStyle}>{hadith.reference}</p>}
          </article>
        ) : (
          !loadingHadith && <p style={{ fontSize: 13, opacity: 0.8 }}>Aucun rappel n’est disponible pour l’instant.</p>
        )}
      </section>
    </div>
  );
}

const containerStyle: CSSProperties = {
  maxWidth: 960,
  margin: "0 auto",
  display: "grid",
  gap: spacing.lg,
};

const sectionStyle: CSSProperties = {
  backgroundColor: "rgba(255,252,248,0.94)",
  borderRadius: spacing.lg,
  padding: `${spacing.lg * 1.5}px`,
  boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
  border: "1px solid rgba(0,0,0,0.04)",
  color: colors.neutral900,
  display: "grid",
  gap: spacing.md,
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: spacing.lg,
  flexWrap: "wrap",
};

const badgeStyle: CSSProperties = {
  fontSize: 13,
  letterSpacing: 3,
  textTransform: "uppercase",
  color: "#2F5F3A",
  fontWeight: 600,
};

const titleStyle: CSSProperties = {
  fontSize: 24,
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

const topicsBarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.sm,
  alignItems: "center",
};

const topicChipStyle = (active: boolean): CSSProperties => ({
  borderRadius: 999,
  border: `1px solid ${active ? "#D4AF37" : "rgba(0,0,0,0.12)"}`,
  backgroundColor: active ? "rgba(212,175,55,0.12)" : "rgba(255,252,248,0.94)",
  padding: `${spacing.xs}px ${spacing.sm * 1.2}px`,
  fontSize: 13,
  cursor: "pointer",
});

const refreshButtonStyle: CSSProperties = {
  marginLeft: "auto",
  padding: `${spacing.xs}px ${spacing.sm * 1.4}px`,
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,0.12)",
  backgroundColor: colors.neutral200,
  fontSize: 12,
  cursor: "pointer",
};

const hadithCardStyle: CSSProperties = {
  backgroundColor: colors.neutral200,
  borderRadius: spacing.lg,
  padding: `${spacing.lg}px`,
  border: "1px solid rgba(0,0,0,0.06)",
  display: "grid",
  gap: spacing.sm,
};

const hadithTextStyle: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: "rgba(0,0,0,0.85)",
  margin: 0,
};

const hadithMetaStyle: CSSProperties = {
  fontSize: 13,
  color: "rgba(0,0,0,0.7)",
  margin: 0,
};

const hadithReferenceStyle: CSSProperties = {
  fontSize: 13,
  color: "rgba(0,0,0,0.7)",
  fontStyle: "italic",
  margin: 0,
};

const fullHeightCentered: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.primary,
  color: colors.neutral100,
};
