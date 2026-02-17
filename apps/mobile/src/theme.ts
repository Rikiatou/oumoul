/**
 * Centralized color tokens for the Oumoul mobile app.
 * Import from here instead of duplicating color constants per screen.
 */
import { colors } from "@oumoul/ui";

export const lightPalette = {
  // ── Base backgrounds ──
  bg: "#FAF5EF",
  bgAlt: "#FAFAF5",
  card: "#FFFFFF",
  border: "rgba(0,0,0,0.06)",

  // ── Brand ──
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  accent: colors.accent,
  secondary: colors.secondary,

  // ── Text ──
  text: colors.neutral900,
  textSoft: "rgba(26,26,26,0.7)",
  muted: "rgba(26,26,26,0.5)",
  textOnPrimary: "#FFFFFF",

  // ── Arabic / Islamic content ──
  arabic: "#1B3A2D",
  transliteration: "#6B4C3B",

  // ── Input ──
  inputBg: "rgba(0,0,0,0.04)",
  inputBorder: "rgba(0,0,0,0.10)",

  // ── Tab bar ──
  tabBar: "#FFFFFF",
  tabInactive: "rgba(26,26,26,0.35)",

  // ── Feedback ──
  error: "#D32F2F",
  errorBg: "#FFEBEE",
  success: "#2E7D32",
  successBg: "#E8F5E9",

  // ── Accent light (for icon backgrounds) ──
  accentLight: "rgba(26,127,100,0.08)",
  accentLightAlt: "rgba(26,127,100,0.1)",

  // ── Dark overlay (Ramadan banner, toasts) ──
  dark: "#1A2332",
} as const;

export const darkPalette = {
  // ── Base backgrounds ──
  bg: "#0F0F0F",
  bgAlt: "#1A1A1A",
  card: "#2A2A2A",
  border: "rgba(255,255,255,0.1)",

  // ── Brand ──
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  accent: colors.accent,
  secondary: colors.secondary,

  // ── Text ──
  text: "#FFFFFF",
  textSoft: "rgba(255,255,255,0.7)",
  muted: "rgba(255,255,255,0.5)",
  textOnPrimary: "#FFFFFF",

  // ── Arabic / Islamic content ──
  arabic: "#E8F5E9",
  transliteration: "#C8E6C9",

  // ── Input ──
  inputBg: "rgba(255,255,255,0.1)",
  inputBorder: "rgba(255,255,255,0.2)",

  // ── Tab bar ──
  tabBar: "#2A2A2A",
  tabInactive: "rgba(255,255,255,0.35)",

  // ── Feedback ──
  error: "#EF5350",
  errorBg: "rgba(239,83,80,0.1)",
  success: "#66BB6A",
  successBg: "rgba(102,187,106,0.1)",

  // ── Accent light (for icon backgrounds) ──
  accentLight: "rgba(26,127,100,0.15)",
  accentLightAlt: "rgba(26,127,100,0.2)",

  // ── Dark overlay (Ramadan banner, toasts) ──
  dark: "#1A2332",
} as const;

export type Palette = {
  -readonly [K in keyof typeof lightPalette]: string;
};

/**
 * Mutable palette object — ThemeProvider swaps values between light/dark.
 * All screens import this and their StyleSheets automatically reflect the
 * current theme on re-render without needing hooks in every file.
 */
export const palette: Palette = { ...lightPalette };

export function applyPalette(source: Palette) {
  for (const key of Object.keys(source) as (keyof Palette)[]) {
    palette[key] = source[key];
  }
}
