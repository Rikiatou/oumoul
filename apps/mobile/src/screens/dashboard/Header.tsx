import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthUser } from "@oumoul/api";
import { palette } from "../../theme";

interface HeaderProps {
  user: AuthUser;
  todayLabel: string;
  hijriLabel: string | null;
  locationLabel: string;
  isLocationLoading: boolean;
  onSearch?: () => void;
}

export function Header({ user, todayLabel, hijriLabel, locationLabel, isLocationLoading, onSearch }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Assalamou Alaikoum Wa Rahmatoullahi Wa Barakouthou</Text>
          <Text style={styles.title}>
            {user.firstName} 🤲
          </Text>
        </View>
        {onSearch && (
          <TouchableOpacity
            onPress={onSearch}
            style={styles.searchBtn}
            accessibilityLabel="Recherche globale"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="search" size={20} color={palette.primaryDark} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.date}>{todayLabel}</Text>
      {hijriLabel ? <Text style={styles.hijri}>{hijriLabel}</Text> : null}
      <View style={styles.locationRow}>
        <Ionicons name="location" size={12} color={palette.primaryDark} />
        <Text style={styles.locationText}>
          {isLocationLoading ? "Détection GPS…" : locationLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  greeting: {
    fontSize: 14,
    color: palette.textSoft,
    fontWeight: "500",
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: palette.text,
    fontWeight: "500",
  },
  hijri: {
    fontSize: 14,
    color: palette.arabic,
    marginTop: 4,
    fontFamily: "Amiri-Regular",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: palette.textSoft,
    fontWeight: "500",
  },
});
