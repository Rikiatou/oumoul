import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "../../theme";
import { getTodayInspiration } from "../../data/daily-inspiration";
import { Locale } from "../../i18n";
import { t } from "../../i18n";

interface DailyInspirationCardProps {
  locale: Locale;
}

export function DailyInspirationCard({ locale }: DailyInspirationCardProps) {
  const daily = getTodayInspiration();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.icon}>
          <Ionicons name={daily.type === "ayah" ? "book" : "hand-left"} size={18} color={palette.primaryDark} />
        </View>
        <Text style={styles.label}>
          {daily.type === "ayah" ? t(locale, "dash.ayah_of_day", "Verset du jour") : t(locale, "dash.dua_of_day", "Dua du jour")}
        </Text>
      </View>
      <Text style={styles.arabic}>{daily.arabic}</Text>
      <Text style={styles.transliteration}>{daily.transliteration}</Text>
      <Text style={styles.translation}>{daily.translation}</Text>
      <Text style={styles.source}>{daily.source}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: palette.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.text,
  },
  arabic: {
    fontSize: 18,
    color: palette.arabic,
    textAlign: "right",
    marginBottom: 8,
    fontFamily: "Amiri-Regular",
    lineHeight: 28,
  },
  transliteration: {
    fontSize: 13,
    color: palette.transliteration,
    fontStyle: "italic",
    marginBottom: 6,
  },
  translation: {
    fontSize: 14,
    color: palette.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  source: {
    fontSize: 11,
    color: palette.muted,
    textAlign: "right",
  },
});
