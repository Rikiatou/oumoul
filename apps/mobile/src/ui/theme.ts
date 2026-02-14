import { StyleSheet } from "react-native";
import { colors } from "@oumoul/ui";

export const theme = {
  colors: {
    ...colors,
    card: "rgba(255,255,255,0.08)",
    cardBorder: "rgba(255,255,255,0.12)",
    surface: colors.background,
    textPrimary: colors.neutral900,
    textSecondary: "rgba(26,26,26,0.6)",
    textOnPrimary: colors.neutral100,
    error: "#ff8a80",
    success: "#81c784",
    overlay: "rgba(0,0,0,0.25)",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    elevated: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
    },
  },
} as const;

/** Shared light-theme color tokens for all screens */
export const sc = {
  bg: '#FAF5EF',
  card: '#FFFFFF',
  border: 'rgba(0,0,0,0.06)',
  text: '#1A1A1A',
  textSoft: 'rgba(26,26,26,0.55)',
  muted: 'rgba(26,26,26,0.35)',
  accent: colors.primaryDark,
  error: '#D32F2F',
  success: '#2E7D32',
} as const;

/** Shared reusable styles for the light-theme screens */
export const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: sc.bg },

  title: { fontSize: 26, fontWeight: '700', color: sc.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: sc.textSoft, marginTop: 2 },
  label: { fontSize: 11, fontWeight: '600', color: sc.muted, textTransform: 'uppercase', letterSpacing: 1 },
  body: { fontSize: 14, color: sc.text },
  muted: { color: sc.textSoft, fontSize: 13 },
  errorText: { color: sc.error, fontSize: 13 },
  bigNum: { fontSize: 28, fontWeight: '700', color: sc.text },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: sc.text },

  card: {
    backgroundColor: sc.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: sc.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
  },

  input: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: sc.text,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },

  chip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.primaryDark },
  chipText: { fontWeight: '600' as const, fontSize: 12, color: sc.text },
  chipTextActive: { color: '#fff' },

  primaryBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: 'center' as const,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  outlineBtn: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  outlineBtnText: { color: sc.text, fontWeight: '600', fontSize: 13 },

  smallBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  smallBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  row: { flexDirection: 'row' as const, alignItems: 'center' as const },
  gap4: { gap: 4 },
  gap6: { gap: 6 },
  gap8: { gap: 8 },
  gap10: { gap: 10 },
  gap12: { gap: 12 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },

  infoRow: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
});
