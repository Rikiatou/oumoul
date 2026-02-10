"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiRoutes } from "@oumoul/config";
import type { PrayerTimesRequest, PrayerTimesResponse } from "@oumoul/api";
import { httpClient, prayerApi } from "@/lib/api";
import { colors, spacing } from "@oumoul/ui";
import { useAuth } from "@/context/auth-context";

const DEFAULT_FORM = {
  latitude: "4.0511",
  longitude: "9.7679",
  date: "",
  timeZone: "Africa/Douala",
};

export default function PrayerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PrayerTimesResponse | null>(null);
  const [qiblaDirection, setQiblaDirection] = useState<number | null>(null);
  const [qiblaError, setQiblaError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  const handleFieldChange = useCallback((key: keyof typeof DEFAULT_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      setQiblaError(null);
      try {
        const latitude = Number.parseFloat(form.latitude);
        const longitude = Number.parseFloat(form.longitude);
        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
          throw new Error("Veuillez fournir des coordonnées valides.");
        }

        const params: PrayerTimesRequest = { latitude, longitude };
        if (form.date) params.date = form.date;
        if (form.timeZone.trim()) params.timeZone = form.timeZone.trim();

        const response = await prayerApi.getPrayerTimes(params);
        setResult(response);

        // Récupérer également la direction de la Qibla depuis le backend
        try {
          const qiblaQuery = new URLSearchParams();
          qiblaQuery.set("latitude", String(latitude));
          qiblaQuery.set("longitude", String(longitude));

          const qiblaJson = await httpClient.request<{ direction: number }>(
            `${apiRoutes.backend.prayer}/qibla?${qiblaQuery.toString()}`,
            { method: "GET" },
          );
          setQiblaDirection(qiblaJson.direction);
        } catch (qErr) {
          const message = qErr instanceof Error ? qErr.message : "Impossible de récupérer la Qibla.";
          setQiblaError(message);
          setQiblaDirection(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de calculer les horaires.";
        setError(message);
        setResult(null);
        setQiblaDirection(null);
      } finally {
        setLoading(false);
      }
    },
    [form],
  );

  const entries = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.times) as Array<[string, string]>;
  }, [result]);

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
      <div style={summaryRowStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Position</span>
          <strong style={summaryValueStyle}>
            {form.latitude}, {form.longitude}
          </strong>
        </div>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Fuseau horaire</span>
          <strong style={summaryValueStyle}>{form.timeZone || "Auto"}</strong>
        </div>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Dernier calcul</span>
          <strong style={summaryValueStyle}>
            {result ? new Date(result.date).toLocaleDateString(user.locale ?? "fr") : "—"}
          </strong>
        </div>
      </div>
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Horaires de prière & Qibla</h2>
          <p style={sectionSubtitleStyle}>
            Renseigne ta position pour obtenir des horaires précis et l’orientation de la Qibla.
          </p>
        </div>
        <form onSubmit={handleSubmit} style={formGridStyle}>
          <label style={fieldLabelStyle}>
            Latitude
            <input
              value={form.latitude}
              onChange={(event) => handleFieldChange("latitude", event.target.value)}
              style={inputStyle}
              placeholder="4.0511"
            />
          </label>
          <label style={fieldLabelStyle}>
            Longitude
            <input
              value={form.longitude}
              onChange={(event) => handleFieldChange("longitude", event.target.value)}
              style={inputStyle}
              placeholder="9.7679"
            />
          </label>
          <label style={fieldLabelStyle}>
            Date (facultatif)
            <input
              type="date"
              value={form.date}
              onChange={(event) => handleFieldChange("date", event.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={fieldLabelStyle}>
            Fuseau horaire
            <input
              value={form.timeZone}
              onChange={(event) => handleFieldChange("timeZone", event.target.value)}
              style={inputStyle}
              placeholder="Africa/Douala"
            />
          </label>
          <button type="submit" disabled={loading} style={submitButtonStyle}>
            {loading ? "Calcul…" : "Afficher"}
          </button>
        </form>
        {error && <p style={{ color: "#D32F2F", fontSize: 13 }}>{error}</p>}
        <div style={{ display: "grid", gap: spacing.lg, gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.2fr)" }}>
          <div style={{ display: "grid", gap: spacing.sm }}>
            {result && (
              <div>
                <p style={{ opacity: 0.8, fontSize: 13 }}>
                  Fuseau: {result.location.timeZone} · Date: {new Date(result.date).toLocaleDateString(user.locale ?? "fr")}
                </p>
                <p style={{ opacity: 0.8, fontSize: 13 }}>Méthode: {result.method} · Madhhab: {result.madhab}</p>
              </div>
            )}
            {result && (
              <div style={timesGridStyle}>
                {entries.map(([name, time]) => (
                  <div key={name} style={cardStyle}>
                    <span style={cardLabelStyle}>{name}</span>
                    <strong style={cardValueStyle}>
                      {new Date(time).toLocaleTimeString(user.locale ?? "fr", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={qiblaCardStyle}>
            <h3 style={qiblaTitleStyle}>Qibla</h3>
            <p style={qiblaSubtitleStyle}>
              Direction approximative de la Qibla depuis ta position actuelle.
            </p>
            {qiblaError && <p style={{ color: "#D32F2F", fontSize: 13 }}>{qiblaError}</p>}
            {qiblaDirection !== null ? (
              <div style={qiblaDirectionWrapperStyle}>
                <div style={qiblaCircleStyle}>
                  <div style={qiblaNeedleStyle(qiblaDirection)} />
                </div>
                <p style={qiblaAngleTextStyle}>{`${qiblaDirection.toFixed(1)}°`}</p>
              </div>
            ) : (
              <p style={{ opacity: 0.8, fontSize: 13 }}>Renseigne tes coordonnées puis clique sur &quot;Afficher&quot;.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

const containerStyle: CSSProperties = {
  maxWidth: 1080,
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

const formGridStyle: CSSProperties = {
  display: "grid",
  gap: spacing.sm,
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  alignItems: "flex-end",
};

const fieldLabelStyle: CSSProperties = {
  display: "grid",
  gap: spacing.xs,
  fontSize: 14,
  opacity: 0.9,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: spacing.md,
  border: "1px solid rgba(0,0,0,0.08)",
  backgroundColor: colors.neutral200,
  color: colors.neutral900,
  fontSize: 15,
  outline: "none",
};

const submitButtonStyle: CSSProperties = {
  padding: `${spacing.sm}px ${spacing.lg}px`,
  borderRadius: spacing.md,
  backgroundColor: colors.primary,
  color: colors.neutral100,
  fontWeight: 700,
  border: "none",
  opacity: 1,
};

const timesGridStyle: CSSProperties = {
  display: "grid",
  gap: spacing.sm,
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
};

const cardStyle: CSSProperties = {
  backgroundColor: colors.neutral200,
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
  fontSize: 22,
  fontWeight: 700,
};

const qiblaCardStyle: CSSProperties = {
  backgroundColor: colors.neutral200,
  borderRadius: spacing.lg,
  padding: `${spacing.lg}px`,
  display: "grid",
  gap: spacing.sm,
  alignContent: "start",
};

const qiblaTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
};

const qiblaSubtitleStyle: CSSProperties = {
  margin: 0,
  opacity: 0.75,
  fontSize: 13,
  lineHeight: 1.5,
};

const qiblaDirectionWrapperStyle: CSSProperties = {
  display: "grid",
  justifyItems: "center",
  gap: spacing.sm,
  paddingTop: spacing.sm,
};

const qiblaCircleStyle: CSSProperties = {
  width: 140,
  height: 140,
  borderRadius: 999,
  backgroundColor: "rgba(255,252,248,0.94)",
  border: "1px solid rgba(0,0,0,0.08)",
  position: "relative",
  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
};

const qiblaNeedleStyle = (degrees: number): CSSProperties => ({
  position: "absolute",
  left: "50%",
  top: "50%",
  width: 3,
  height: 56,
  backgroundColor: colors.primary,
  borderRadius: 999,
  transform: `translate(-50%, -100%) rotate(${degrees}deg)`,
  transformOrigin: "50% 100%",
});

const qiblaAngleTextStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  opacity: 0.85,
};

const fullPageFallbackStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.primary,
  color: colors.neutral100,
};

const summaryRowStyle: CSSProperties = {
  display: "grid",
  gap: spacing.sm,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  marginBottom: spacing.lg,
};

const summaryCardStyle: CSSProperties = {
  backgroundColor: "rgba(255,252,248,0.94)",
  borderRadius: spacing.md,
  padding: `${spacing.md}px`,
  display: "grid",
  gap: spacing.xs,
};

const summaryLabelStyle: CSSProperties = {
  textTransform: "uppercase",
  fontSize: 12,
  letterSpacing: 2,
  opacity: 0.7,
};

const summaryValueStyle: CSSProperties = {
  fontWeight: 600,
  fontSize: 18,
};
