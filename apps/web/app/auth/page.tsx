"use client";

import type React from "react";
import Image from "next/image";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { appMetadata } from "@oumoul/config";
import { colors, spacing } from "@oumoul/ui";
import { useAuth } from "@/context/auth-context";

type Mode = "login" | "register";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  locale: string;
}

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  locale: "fr",
};

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

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const title = useMemo(
    () => (isRegister ? "Créer un compte" : "Se connecter"),
    [isRegister],
  );

  const subtitle = useMemo(
    () =>
      isRegister
        ? "Rejoins ton espace bien-être & adoration."
        : "Retrouve ton espace bien-être & adoration.",
    [isRegister],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setSuccess(null);
      setLoading(true);
      try {
        const payload = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
          locale: form.locale,
        };

        if (isRegister) {
          await register(payload);
          setSuccess("Compte créé avec succès ! Vérifiez votre email pour le code de confirmation.");
        } else {
          await login(payload.email, payload.password);
          setSuccess("Connexion réussie !");
        }

        const redirect = searchParams.get("redirect");
        setTimeout(() => {
          router.replace(redirect ? decodeURIComponent(redirect) : "/dashboard");
        }, 1500);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Une erreur est survenue";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [form, isRegister, login, register, router, searchParams],
  );

  const handleChange = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

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
            onClick={() => router.push("/")}
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
            <span>Retour à l&apos;accueil</span>
          </button>
          <div
            style={{
              margin: "0 auto",
              marginBottom: spacing.sm,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              src="/Hidjabiicon.png"
              alt="Profil femme musulmane voilée"
              width={80}
              height={80}
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
          <span
            style={{
              fontSize: 13,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#D4AF37",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {appMetadata.name}
          </span>
          <h1
            style={{
              fontSize: 40,
              lineHeight: 1.15,
              fontWeight: 800,
              backgroundImage: `linear-gradient(90deg, ${colors.primaryDark}, ${colors.accent})`,
              WebkitBackgroundClip: "text",
              color: "transparent",
              textAlign: "center",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: "rgba(0,0,0,0.75)",
              textAlign: "center",
            }}
          >
            {subtitle}
          </p>
        </div>
        <div style={{ display: "flex", gap: spacing.sm }}>
          <button
            type="button"
            onClick={() => setMode("login")}
            style={{
              flex: 1,
              padding: `${spacing.sm}px ${spacing.lg}px`,
              borderRadius: spacing.md,
              border: mode === "login" ? "none" : "1px solid rgba(0,0,0,0.1)",
              backgroundColor: mode === "login" ? colors.primary : "transparent",
              color: mode === "login" ? colors.neutral900 : "rgba(0,0,0,0.7)",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            style={{
              flex: 1,
              padding: `${spacing.sm}px ${spacing.lg}px`,
              borderRadius: spacing.md,
              border: mode === "register" ? "none" : "1px solid rgba(0,0,0,0.1)",
              backgroundColor: mode === "register" ? colors.secondary : "transparent",
              color: mode === "register" ? colors.neutral900 : "rgba(0,0,0,0.7)",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Inscription
          </button>
        </div>
        {success && (
          <p style={{ color: "#1a7f64", fontSize: 13, textAlign: "center", backgroundColor: "#e8f5e9", padding: "12px", borderRadius: 8 }}>
            {success}
          </p>
        )}
        {error && (
          <p style={{ color: "#D32F2F", fontSize: 13, textAlign: "center", backgroundColor: "#ffebee", padding: "12px", borderRadius: 8 }}>
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: spacing.md }}>
          {isRegister && (
            <div style={{ display: "grid", gap: spacing.sm }}>
              <label style={{ fontSize: 14, opacity: 0.9 }}>
                Prénom
                <input
                  required
                  value={form.firstName}
                  onChange={(event) => handleChange("firstName", event.target.value)}
                  style={inputStyle}
                  placeholder="Fatou"
                />
              </label>
              <label style={{ fontSize: 14, opacity: 0.9 }}>
                Nom
                <input
                  required
                  value={form.lastName}
                  onChange={(event) => handleChange("lastName", event.target.value)}
                  style={inputStyle}
                  placeholder="Ndiaye"
                />
              </label>
            </div>
          )}
          <label style={{ fontSize: 14, opacity: 0.9 }}>
            E-mail
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => handleChange("email", event.target.value)}
              style={inputStyle}
              placeholder="toi@example.com"
            />
          </label>
          <label style={{ fontSize: 14, opacity: 0.9 }}>
            Mot de passe
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(event) => handleChange("password", event.target.value)}
              style={inputStyle}
              placeholder="••••••••"
            />
          </label>
          {!isRegister && (
            <button
              type="button"
              onClick={() => router.push("/auth/forgot-password")}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                justifySelf: "flex-end",
                color: "rgba(0,0,0,0.7)",
                fontSize: 13,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Mot de passe oublié ?
            </button>
          )}
          {isRegister && (
            <label style={{ fontSize: 14, opacity: 0.9 }}>
              Langue
              <select
                value={form.locale}
                onChange={(event) => handleChange("locale", event.target.value)}
                style={{
                  ...inputStyle,
                  backgroundColor: colors.neutral200,
                  color: colors.neutral900,
                }}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </label>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: `${spacing.sm * 1.15}px ${spacing.lg * 1.6}px`,
              borderRadius: 999,
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.primaryDark})`,
              color: colors.neutral100,
              fontWeight: 700,
              fontSize: 15,
              border: "none",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Veuillez patienter..." : isRegister ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>
      </main>
    </div>
  );
}
