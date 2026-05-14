import React from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/theme-context";
import { triggerHaptic } from "../utils/haptics";

interface ThemeToggleProps {
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  style?: any;
}

export function ThemeToggle({ size = "medium", showLabel = false, style }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();
  
  const handleToggle = async () => {
    await triggerHaptic("light");
    toggleTheme();
  };

  const sizes = {
    small: { width: 32, height: 32, iconSize: 16 },
    medium: { width: 40, height: 40, iconSize: 20 },
    large: { width: 48, height: 48, iconSize: 24 },
  };

  const currentSize = sizes[size];

  return (
    <TouchableOpacity 
      style={[s.container, { width: currentSize.width, height: currentSize.height }, style]}
      onPress={handleToggle}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={[s.toggle, isDark && s.toggleDark]}>
        <View style={[s.thumb, isDark && s.thumbDark]} />
        <Ionicons 
          name={isDark ? "moon" : "sunny"} 
          size={currentSize.iconSize} 
          color={isDark ? "#F472B6" : "#EC4899"} 
          style={[s.icon, isDark && s.iconDark]}
        />
      </View>
      {showLabel && (
        <View style={s.label}>
          <Ionicons 
            name={isDark ? "moon-outline" : "sunny-outline"} 
            size={12} 
            color={isDark ? "#94A3B8" : "#64748B"} 
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  toggle: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E2E8F0",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  toggleDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
  },
  thumb: {
    position: "absolute",
    left: 2,
    width: "60%",
    height: "60%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbDark: {
    backgroundColor: "#374151",
    left: "40%",
  },
  icon: {
    zIndex: 1,
  },
  iconDark: {
    // Keep icon centered in dark mode
  },
  label: {
    marginTop: 4,
  },
});
