/**
 * Centralized color tokens for the Oumoul mobile app.
 * Import from here instead of duplicating color constants per screen.
 */
import { colors } from "@oumoul/ui";

export const lightPalette = {
  // ── Base backgrounds ──
  bg: colors.background,
  bgAlt: colors.neutral200,
  card: colors.neutral100,
  border: "rgba(0,0,0,0.08)",

  // ── Brand ──
  primary: "#EC4899", // Rose principal
  primaryDark: "#BE185D", // Rose foncé
  accent: "#F472B6", // Rose clair
  secondary: "#10B981", // Émeraude secondaire

  // ── Text ──
  text: colors.neutral900,
  textSoft: "rgba(30,41,59,0.7)",
  muted: "rgba(30,41,59,0.5)",
  textOnPrimary: "#FFFFFF",

  // ── Arabic / Islamic content ──
  arabic: colors.primaryDark,
  transliteration: colors.secondary,

  // ── Input ──
  inputBg: "rgba(0,0,0,0.04)",
  inputBorder: "rgba(0,0,0,0.10)",

  // ── Tab bar ──
  tabBar: colors.neutral100,
  tabInactive: "rgba(30,41,59,0.4)",

  // ── Feedback ──
  error: "#EF4444",
  errorBg: "rgba(239,68,68,0.1)",
  success: colors.primary,
  successBg: "rgba(16,185,129,0.1)",

  // ── Accent light (for icon backgrounds) ──
  accentLight: "rgba(16,185,129,0.12)",
  accentLightAlt: "rgba(236,72,153,0.12)",

  // ── Dark overlay (Ramadan banner, toasts) ──
  dark: "#1A2332",
} as const;

export const darkPalette = {
  // ── Base backgrounds ──
  bg: "#0A0A0A",
  bgAlt: "#141414",
  card: "#1F1F1F",
  border: "rgba(255,255,255,0.08)",

  // ── Brand (rose+emerald optimized for dark) ──
  primary: "#EC4899", // Rose principal
  primaryDark: "#BE185D", // Rose foncé
  accent: "#F472B6", // Rose clair
  secondary: "#10B981", // Émeraude secondaire

  // ── Text ──
  text: "#F8FAFC",
  textSoft: "rgba(248,250,252,0.7)",
  muted: "rgba(248,250,252,0.5)",
  textOnPrimary: "#FFFFFF",

  // ── Arabic / Islamic content ──
  arabic: "#10B981", // Emerald for Arabic text
  transliteration: "#EC4899", // Rose for transliteration

  // ── Input ──
  inputBg: "rgba(255,255,255,0.05)",
  inputBorder: "rgba(255,255,255,0.1)",

  // ── Tab bar ──
  tabBar: "#1F1F1F",
  tabInactive: "rgba(248,250,252,0.3)",

  // ── Feedback ──
  error: "#EF4444",
  errorBg: "rgba(239,68,68,0.15)",
  success: colors.primary,
  successBg: "rgba(16,185,129,0.15)",

  // ── Accent light (optimized for dark) ──
  accentLight: "rgba(16,185,129,0.12)",
  accentLightAlt: "rgba(236,72,153,0.12)",

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
