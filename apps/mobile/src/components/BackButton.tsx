import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/theme-context';

interface Props {
  onPress: () => void;
  accessibilityLabel?: string;
}

export function BackButton({ onPress, accessibilityLabel = 'Retour' }: Props) {
  const { palette } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.btn, { backgroundColor: palette.primaryDark }]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="arrow-back" size={20} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
