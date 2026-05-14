import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "../../theme";

interface RamadanDayInfo {
  status: "before" | "during" | "after";
  daysUntil?: number;
  dayNumber?: number;
  totalDays?: number;
}

interface RamadanBannerProps {
  ramadanDayInfo: RamadanDayInfo;
  ramadanTodayText: string;
  ramadanProgressText?: string;
}

function RamadanBannerBase({ ramadanDayInfo, ramadanTodayText, ramadanProgressText }: RamadanBannerProps) {
  return (
    <View style={styles.banner}>
      <Ionicons name="moon" size={20} color="#FFC107" />
      <View style={styles.content}>
        {ramadanDayInfo.status === "before" && (
          <>
            <Text style={styles.title}>Ramadan dans {ramadanDayInfo.daysUntil} jour{ramadanDayInfo.daysUntil! > 1 ? "s" : ""}</Text>
            <Text style={styles.subtitle}>Prépare-toi pour le mois béni</Text>
          </>
        )}
        {ramadanDayInfo.status === "during" && (
          <>
            <Text style={styles.title}>Ramadan — Jour {ramadanDayInfo.dayNumber}/{ramadanDayInfo.totalDays}</Text>
            <Text style={styles.subtitle}>{ramadanTodayText}</Text>
          </>
        )}
        {ramadanDayInfo.status === "after" && (
          <>
            <Text style={styles.title}>Ramadan terminé</Text>
            <Text style={styles.subtitle}>{ramadanProgressText || "Eid Moubarak !"}</Text>
          </>
        )}
      </View>
      {ramadanDayInfo.status === "during" && (
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>{ramadanDayInfo.dayNumber}</Text>
        </View>
      )}
    </View>
  );
}

export const RamadanBanner = memo(RamadanBannerBase);

const styles = StyleSheet.create({
  banner: {
    backgroundColor: palette.dark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  content: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFC107",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFC107",
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadgeText: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.dark,
  },
});
