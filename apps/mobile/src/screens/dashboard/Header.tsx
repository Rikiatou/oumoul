import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthUser } from "@oumoul/api";
import { useTheme } from "../../context/theme-context";
import { ThemeToggle } from "../../components/ThemeToggle";

interface HeaderProps {
  user: AuthUser;
  todayLabel: string;
  hijriLabel: string | null;
  locationLabel: string;
  isLocationLoading: boolean;
  onSearch?: () => void;
}

function HeaderBase({ user, todayLabel, hijriLabel, locationLabel, isLocationLoading, onSearch }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: palette.bg }]}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.greetingBadge}>
            <Text style={[styles.greetingArabic, { color: palette.primaryDark }]}>السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ</Text>
            <Text style={[styles.greeting, { color: palette.primaryDark }]}>Assalamou Alaikoum Wa Rahmatoullahi Wa Barakatuh</Text>
          </View>
          <Text style={[styles.title, { color: palette.text }]}>
            {user.firstName} 🤲
          </Text>
        </View>
        <View style={styles.rightActions}>
          <ThemeToggle size="small" />
          {onSearch && (
            <TouchableOpacity
              onPress={onSearch}
              style={[styles.searchBtn, { backgroundColor: palette.accentLight }]}
              accessibilityLabel="Recherche globale"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="search" size={20} color={palette.primaryDark} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={[styles.date, { color: palette.text }]}>{todayLabel}</Text>
      {hijriLabel ? <Text style={[styles.hijri, { color: palette.arabic }]}>{hijriLabel}</Text> : null}
      <View style={styles.locationRow}>
        <Ionicons name="location" size={12} color={palette.primaryDark} />
        <Text style={[styles.locationText, { color: palette.textSoft }]}>
          {isLocationLoading ? "Détection GPS…" : locationLabel}
        </Text>
      </View>
    </View>
  );
}

export const Header = memo(HeaderBase);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  greetingBadge: {
    backgroundColor: 'rgba(21,128,61,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#15803d',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 2,
  },
  greetingArabic: {
    fontSize: 16,
    fontFamily: 'Amiri-Regular',
    textAlign: 'right',
    lineHeight: 26,
  },
  greeting: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
    opacity: 0.85,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  date: {
    fontSize: 15,
    fontWeight: "500",
  },
  hijri: {
    fontSize: 14,
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
    fontWeight: "500",
  },
});
