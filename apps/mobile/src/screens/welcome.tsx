import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { colors } from "@oumoul/ui";

const { width } = Dimensions.get("window");

interface Slide {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

const slides: Slide[] = [
  {
    id: "1",
    emoji: "\u{1F54C}",
    title: "Tes prières, simplifiées",
    description:
      "Horaires précis, rappels personnalisés et suivi quotidien de tes 5 salawat. Ne rate plus jamais une prière.",
  },
  {
    id: "2",
    emoji: "\u{1F4D6}",
    title: "Le Coran à portée de main",
    description:
      "Lis, écoute et explore le Tafsir verset par verset. Progresse dans ta compréhension du Livre sacré.",
  },
  {
    id: "3",
    emoji: "\u{1F31F}",
    title: "Dhikr & Invocations",
    description:
      "Adhkar du matin, du soir, après la prière… Garde le lien avec Allah tout au long de ta journée.",
  },
  {
    id: "4",
    emoji: "\u{1F319}",
    title: "Ramadan & Jeûne",
    description:
      "Suis ton jeûne, planifie tes repas et vis un Ramadan organisé et spirituellement riche.",
  },
  {
    id: "5",
    emoji: "\u{1F9ED}",
    title: "Qibla, Calendrier & Plus",
    description:
      "Direction de la Qibla, calendrier hégirien, programme Imane… Tout ce qu'il te faut, en une seule app.",
  },
];

interface WelcomeScreenProps {
  onFinish: () => void;
}

export function WelcomeScreen({ onFinish }: WelcomeScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      onFinish();
    }
  }, [currentIndex, onFinish]);

  const renderSlide = useCallback(
    ({ item }: { item: Slide }) => (
      <View
        style={{
          width,
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <Text style={{ fontSize: 80, marginBottom: 24 }}>{item.emoji}</Text>
        <Text
          style={{
            fontSize: 26,
            fontWeight: "800",
            color: colors.neutral900,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          {item.title}
        </Text>
        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: "rgba(26,26,26,0.7)",
            textAlign: "center",
            paddingHorizontal: 8,
          }}
        >
          {item.description}
        </Text>
      </View>
    ),
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Skip button */}
      <TouchableOpacity
        onPress={onFinish}
        style={{
          position: "absolute",
          top: 56,
          right: 24,
          zIndex: 10,
          paddingVertical: 6,
          paddingHorizontal: 14,
        }}
      >
        <Text
          style={{
            color: colors.primaryDark,
            fontWeight: "700",
            fontSize: 15,
          }}
        >
          Passer
        </Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Bottom section */}
      <View
        style={{
          paddingBottom: 56,
          paddingHorizontal: 32,
          alignItems: "center",
        }}
      >
        {/* Dots */}
        <View
          style={{
            flexDirection: "row",
            marginBottom: 28,
            gap: 10,
          }}
        >
          {slides.map((_, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 28, 8],
              extrapolate: "clamp",
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={index}
                style={{
                  width: dotWidth,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.primaryDark,
                  opacity: dotOpacity,
                }}
              />
            );
          })}
        </View>

        {/* Next / Start button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={{
            width: "100%",
            backgroundColor: colors.primary,
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: "center",
            shadowColor: colors.primaryDark,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text
            style={{
              color: colors.neutral900,
              fontWeight: "800",
              fontSize: 17,
            }}
          >
            {currentIndex === slides.length - 1
              ? "Bismillah, c'est parti !"
              : "Suivant"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
