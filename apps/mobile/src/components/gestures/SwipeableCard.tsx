import { useState } from "react";
import { PanResponder, Animated, View, StyleSheet } from "react-native";
import { palette } from "../../theme";

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  threshold?: number;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  threshold = 100,
}: SwipeableCardProps) {
  const [translateX] = useState(new Animated.Value(0));
  const [showLeftAction, setShowLeftAction] = useState(false);
  const [showRightAction, setShowRightAction] = useState(false);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (_, gestureState) => {
      translateX.setValue(gestureState.dx);
      
      // Show actions based on swipe direction
      setShowLeftAction(gestureState.dx > 50);
      setShowRightAction(gestureState.dx < -50);
    },
    onPanResponderRelease: (_, gestureState) => {
      const shouldSwipeLeft = gestureState.dx < -threshold;
      const shouldSwipeRight = gestureState.dx > threshold;

      if (shouldSwipeLeft && onSwipeLeft) {
        Animated.spring(translateX, {
          toValue: -300,
          useNativeDriver: true,
        }).start(() => {
          onSwipeLeft();
          resetPosition();
        });
      } else if (shouldSwipeRight && onSwipeRight) {
        Animated.spring(translateX, {
          toValue: 300,
          useNativeDriver: true,
        }).start(() => {
          onSwipeRight();
          resetPosition();
        });
      } else {
        resetPosition();
      }
    },
  });

  const resetPosition = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    setShowLeftAction(false);
    setShowRightAction(false);
  };

  return (
    <View style={s.container}>
      {leftAction && (
        <View style={[s.actionLeft, { opacity: showLeftAction ? 1 : 0 }]}>
          {leftAction}
        </View>
      )}
      
      {rightAction && (
        <View style={[s.actionRight, { opacity: showRightAction ? 1 : 0 }]}>
          {rightAction}
        </View>
      )}

      <Animated.View
        style={[s.card, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  actionLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: palette.success,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  actionRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: palette.error,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
});
