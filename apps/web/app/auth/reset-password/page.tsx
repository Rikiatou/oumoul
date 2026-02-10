"use client";

import type React from "react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { colors, spacing } from "@oumoul/ui";

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 8,
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.08)",
  backgroundColor: colors.neutral200,
  color: colors.neutral900,
  fontSize: 16,
  outline: "none",
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") ?? "");
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const response = await fetch("/api/session/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.message ?? "Impossible de réinitialiser le mot de passe");
        }

        setDone(true);
        setTimeout(() => router.replace("/auth"), 800);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Une erreur est survenue";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [password, router, token],
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        color: colors.neutral900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `${spacing.xl}px ${spacing.lg}px`,
        backgroundImage:
          "linear-gradient(to bottom, #F7EEDD 0%, #F4C2C2 35%, #E4D2F4 70%, #F7EEDD 100%)",
      }}
    >
      <main
        style={{
          maxWidth: 520,
          width: "100%",
          backgroundColor: colors.neutral100,
          borderRadius: spacing.lg,
          padding: `${spacing.lg * 2.2}px ${spacing.lg * 2}px ${spacing.lg * 2.4}px`,
          boxShadow: "0 24px 48px rgba(0,0,0,0.16)",
          border: "1px solid rgba(0,0,0,0.04)",
          display: "grid",
          gap: spacing.lg,
        }}
      >
        <div style={{ display: "grid", gap: spacing.sm }}>
          <button
            type="button"
            onClick={() => router.push("/auth")}
            style={{
              justifySelf: "flex-start",
              padding: "6px 12px",
              borderRadius: 999,
              border: "none",
              backgroundColor: colors.neutral200,
              color: "rgba(0,0,0,0.7)",
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              marginBottom: spacing.sm,
            }}
          >
            <span style={{ fontSize: 14 }}>←</span>
            <span>Retour</span>
          </button>

          <h1
            style={{
              fontSize: 30,
              lineHeight: 1.2,
              fontWeight: 800,
              textAlign: "center",
              color: colors.neutral900,
            }}
          >
            Nouveau mot de passe
          </h1>

          {!token && (
            <p style={{ fontSize: 13, color: "#D32F2F", textAlign: "center" }}>
              Token manquant. Ouvre le lien de réinitialisation reçu.
            </p>
          )}
        </div>

        {done ? (
          <p style={{ fontSize: 14, color: "rgba(0,0,0,0.8)", textAlign: "center" }}>
            Mot de passe mis à jour. Redirection...
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: spacing.md }}>
            <label style={{ fontSize: 14, opacity: 0.9 }}>
              Mot de passe
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                style={inputStyle}
                placeholder="••••••••"
                disabled={!token}
              />
            </label>

            {error && <p style={{ color: "#D32F2F", fontSize: 13 }}>{error}</p>}

            <button
              type="submit"
              disabled={loading || !token}
              style={{
                padding: `${spacing.sm * 1.15}px ${spacing.lg * 1.6}px`,
                borderRadius: 999,
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.primaryDark})`,
                color: colors.neutral100,
                fontWeight: 700,
                fontSize: 15,
                border: "none",
                opacity: loading || !token ? 0.7 : 1,
                cursor: loading || !token ? "default" : "pointer",
              }}
            >
              {loading ? "Veuillez patienter..." : "Mettre à jour"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
