import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../../theme';
import { getTodayWords } from '../../utils/word-of-day';
import type { QuranWord } from '../../data/quran-words';

interface Props {
  onPress?: () => void;
}

export function WordOfDayCard({ onPress }: Props) {
  const [wordIndex, setWordIndex] = useState(0);
  const words = getTodayWords();
  const word: QuranWord = words[wordIndex];

  const labels = ['Matin', 'Midi', 'Soir'];

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.header}>
        <View style={s.iconWrap}>
          <Ionicons name="language" size={18} color={palette.primaryDark} />
        </View>
        <Text style={s.title}>Mot du Coran</Text>
        <View style={s.tabs}>
          {labels.map((label, i) => (
            <TouchableOpacity
              key={label}
              style={[s.tab, wordIndex === i && s.tabActive]}
              onPress={() => setWordIndex(i)}
            >
              <Text style={[s.tabText, wordIndex === i && s.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={s.arabic}>{word.arabic}</Text>
      <Text style={s.translit}>{word.transliteration}</Text>
      <Text style={s.french}>{word.french}</Text>

      <View style={s.footer}>
        <View style={s.categoryBadge}>
          <Text style={s.categoryText}>{word.category}</Text>
        </View>
        <View style={s.freqBadge}>
          <Ionicons name="repeat" size={11} color={palette.textSoft} />
          <Text style={s.freqText}>{word.frequency}× dans le Coran</Text>
        </View>
      </View>

      {onPress && (
        <View style={s.cta}>
          <Text style={s.ctaText}>Voir les 400 mots →</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: palette.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.text,
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: palette.bg,
  },
  tabActive: {
    backgroundColor: palette.primaryDark,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: palette.textSoft,
  },
  tabTextActive: {
    color: '#fff',
  },
  arabic: {
    fontSize: 32,
    fontFamily: 'Amiri-Regular',
    color: palette.arabic,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 48,
  },
  translit: {
    fontSize: 15,
    fontStyle: 'italic',
    color: palette.transliteration,
    textAlign: 'center',
    marginBottom: 4,
  },
  french: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: palette.accentLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: palette.primaryDark,
  },
  freqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  freqText: {
    fontSize: 11,
    color: palette.textSoft,
  },
  cta: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 10,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.primaryDark,
  },
});
