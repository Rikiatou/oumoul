import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "../../theme";
import { FastingSummary } from "@oumoul/api";
import { Locale } from "../../i18n";
import { t } from "../../i18n";

interface StatsRowProps {
  prayerStatusText: string;
  ramadanTodayText: string;
  ramadanProgressText?: string;
  fastingSummary: FastingSummary | null;
  locale: Locale;
}

export function StatsRow({ 
  prayerStatusText, 
  ramadanTodayText, 
  ramadanProgressText, 
  fastingSummary, 
  locale 
}: StatsRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.statCard}>
        <View style={[styles.icon, { backgroundColor: "#E8F5E9" }]}>
          <Ionicons name="time" size={18} color="#388E3C" />
        </View>
        <Text style={styles.label}>{t(locale, "dash.prayer.status.title", "Prière")}</Text>
        <Text style={styles.value} numberOfLines={2}>{prayerStatusText}</Text>
      </View>
      <View style={styles.statCard}>
        <View style={[styles.icon, { backgroundColor: "#E3F2FD" }]}>
          <Ionicons name="moon" size={18} color="#1565C0" />
        </View>
        <Text style={styles.label}>{t(locale, "dash.ramadan.title", "Ramadan")}</Text>
        <Text style={styles.value} numberOfLines={2}>{ramadanTodayText}</Text>
        {ramadanProgressText ? <Text style={styles.extra}>{ramadanProgressText}</Text> : null}
      </View>
      {fastingSummary && (
        <View style={styles.statCard}>
          <View style={[styles.icon, { backgroundColor: "#FFF3E0" }]}>
            <Ionicons name="refresh" size={18} color="#E65100" />
          </View>
          <Text style={styles.label}>{t(locale, "dash.makeup.title", "Rattrapages")}</Text>
          <Text style={styles.value}>
            {fastingSummary.outstandingMakeupDays} {t(locale, "dash.makeup.label", "jour(s)")}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.card,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    color: palette.textSoft,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.text,
    textAlign: "center",
  },
  extra: {
    fontSize: 10,
    color: palette.muted,
    textAlign: "center",
    marginTop: 2,
  },
});
