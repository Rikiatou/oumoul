import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as number | `${number}%`,
          height,
          borderRadius,
          backgroundColor: 'rgba(0,0,0,0.08)',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ lines = 3, style }: { lines?: number; style?: ViewStyle }) {
  return (
    <View style={[sk.card, style]}>
      <Skeleton width="40%" height={14} />
      <View style={{ height: 8 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <React.Fragment key={i}>
          <Skeleton width={i === lines - 1 ? '60%' : '100%'} height={12} />
          {i < lines - 1 && <View style={{ height: 6 }} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const sk = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
});
