import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "../../theme";
import { Skeleton } from "../../ui/skeleton";

interface NextPrayerInfo {
  name: string;
  time: string;
}

interface NextPrayerCardProps {
  isLoading: boolean;
  nextPrayerInfo: NextPrayerInfo | null;
  countdown: string | null;
}

export function NextPrayerCard({ isLoading, nextPrayerInfo, countdown }: NextPrayerCardProps) {
  if (isLoading && !nextPrayerInfo) {
    return (
      <View style={styles.card}>
        <View style={styles.contentRow}>
          <View style={styles.icon}>
            <Ionicons name="time-outline" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="50%" height={12} />
            <Skeleton width="30%" height={18} />
          </View>
          <Skeleton width={60} height={24} borderRadius={6} />
        </View>
      </View>
    );
  }

  if (!nextPrayerInfo) {
    return null;
  }

  return (
    <View style={styles.card} accessible={true} accessibilityLabel={`Prochaine prière: ${nextPrayerInfo.name} à ${nextPrayerInfo.time}${countdown ? `, dans ${countdown}` : ''}`} accessibilityRole="summary">
      <View style={styles.contentRow}>
        <View style={styles.icon}>
          <Ionicons name="time-outline" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Prochaine prière</Text>
          <Text style={styles.name}>{nextPrayerInfo.name}</Text>
          {countdown ? <Text style={styles.countdown}>{countdown}</Text> : null}
        </View>
        <Text style={styles.time}>{nextPrayerInfo.time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginTop: 2,
  },
  countdown: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    marginTop: 2,
  },
  time: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
