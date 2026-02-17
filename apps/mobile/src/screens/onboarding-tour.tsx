import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'prayer',
    icon: 'time',
    iconColor: '#1A7F64',
    iconBg: 'rgba(26,127,100,0.12)',
    title: 'Horaires de prière',
    description: 'Reçois les horaires de prière précis basés sur ta position GPS. Active les notifications pour ne jamais manquer une prière.',
  },
  {
    id: 'quran',
    icon: 'book',
    iconColor: '#1B3A2D',
    iconBg: 'rgba(27,58,45,0.1)',
    title: 'Coran & Tafsir',
    description: 'Lis le Coran avec traduction et écoute les récitations de grands Qaris. Explore le Tafsir pour approfondir ta compréhension.',
  },
  {
    id: 'dhikr',
    icon: 'heart',
    iconColor: '#D32F2F',
    iconBg: 'rgba(211,47,47,0.08)',
    title: 'Dhikr & Tasbih',
    description: 'Pratique tes adhkar du matin et du soir. Utilise le compteur Tasbih avec vibration et suis ta série quotidienne.',
  },
  {
    id: 'ramadan',
    icon: 'moon',
    iconColor: '#FFC107',
    iconBg: 'rgba(255,193,7,0.12)',
    title: 'Suivi Ramadan',
    description: 'Suis ton jeûne jour par jour, planifie tes jours de rattrapage et reçois les rappels Suhoor et Iftar.',
  },
  {
    id: 'names',
    icon: 'star',
    iconColor: '#7B1FA2',
    iconBg: 'rgba(123,31,162,0.08)',
    title: '99 Noms d\'Allah',
    description: 'Apprends et mémorise les 99 noms d\'Allah avec leur signification. Teste-toi avec le quiz intégré.',
  },
  {
    id: 'mosque',
    icon: 'business',
    iconColor: '#0288D1',
    iconBg: 'rgba(2,136,209,0.08)',
    title: 'Mosquées à proximité',
    description: 'Trouve les mosquées autour de toi avec leurs horaires de prière, équipements et itinéraire.',
  },
  {
    id: 'qibla',
    icon: 'compass',
    iconColor: '#F57C00',
    iconBg: 'rgba(245,124,0,0.1)',
    title: 'Qibla & Calendrier',
    description: 'Trouve la direction de la Qibla avec la boussole en temps réel et consulte le calendrier Hijri.',
  },
  {
    id: 'ready',
    icon: 'sparkles',
    iconColor: '#1A7F64',
    iconBg: 'rgba(26,127,100,0.12)',
    title: 'Tu es prête !',
    description: 'Bismillah ! Ton parcours spirituel commence maintenant. Qu\'Allah accepte tes adorations et te guide sur le droit chemin.',
  },
];

export function OnboardingTourScreen({ onFinish }: { onFinish: () => void }) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goNext = useCallback(() => {
    if (currentIndex < STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      onFinish();
    }
  }, [currentIndex, onFinish]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
    }
  }, [currentIndex]);

  const isLast = currentIndex === STEPS.length - 1;

  return (
    <View style={[st.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip */}
      <View style={st.topRow}>
        {currentIndex > 0 ? (
          <TouchableOpacity onPress={goBack} style={st.skipBtn}>
            <Ionicons name="arrow-back" size={18} color={palette.textSoft} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
        <TouchableOpacity onPress={onFinish} style={st.skipBtn}>
          <Text style={st.skipText}>Passer</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={STEPS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={[st.slide, { width: SCREEN_WIDTH }]}>
            <View style={[st.iconCircle, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon} size={48} color={item.iconColor} />
            </View>
            <Text style={st.slideTitle}>{item.title}</Text>
            <Text style={st.slideDesc}>{item.description}</Text>
          </View>
        )}
      />

      {/* Dots + Button */}
      <View style={st.bottomSection}>
        <View style={st.dotsRow}>
          {STEPS.map((_, i) => (
            <View key={i} style={[st.dot, i === currentIndex && st.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={st.nextBtn} onPress={goNext} activeOpacity={0.8}>
          <Text style={st.nextBtnText}>
            {isLast ? 'Commencer' : 'Suivant'}
          </Text>
          <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  skipBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  skipText: { fontSize: 14, color: palette.textSoft, fontWeight: '600' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  slideTitle: { fontSize: 24, fontWeight: '800', color: palette.text, textAlign: 'center', marginBottom: 16 },
  slideDesc: { fontSize: 15, color: palette.textSoft, textAlign: 'center', lineHeight: 24 },
  bottomSection: { paddingHorizontal: 20, paddingBottom: 20 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.border },
  dotActive: { width: 24, backgroundColor: palette.primaryDark },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: palette.primaryDark, borderRadius: 14, paddingVertical: 16 },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
