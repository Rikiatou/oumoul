import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../../theme';
import { getTodayAllahName, getNamesProgress } from '../../utils/allah-name-of-day';

interface Props {
  onPress?: () => void;
}

export function AllahNameOfDayCard({ onPress }: Props) {
  const name = getTodayAllahName();
  const progress = getNamesProgress();

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.header}>
        <View style={s.iconWrap}>
          <Ionicons name="heart" size={18} color="#7B1FA2" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Nom d'Allah du jour</Text>
          <Text style={s.subtitle}>{progress.covered}/{progress.total} noms couverts cette année</Text>
        </View>
        <View style={s.badge}>
          <Text style={s.badgeText}>#{name.id}</Text>
        </View>
      </View>

      {/* Nom arabe */}
      <Text style={s.arabic}>{name.name}</Text>
      <Text style={s.translit}>{name.transliteration}</Text>
      <Text style={s.meaning}>{name.meaning}</Text>

      {/* Bénéfice */}
      <View style={s.benefitBox}>
        <Ionicons name="sparkles" size={13} color="#7B1FA2" />
        <Text style={s.benefitText}>{name.benefit}</Text>
      </View>

      {/* Barre de progression annuelle */}
      <View style={s.progressWrap}>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${progress.percent}%` as any }]} />
        </View>
        <Text style={s.progressLabel}>{progress.percent}%</Text>
      </View>

      {onPress && (
        <View style={s.cta}>
          <Text style={s.ctaText}>Mémoriser les 99 noms →</Text>
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
    borderColor: '#E1BEE7',
    shadowColor: '#7B1FA2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.text,
  },
  subtitle: {
    fontSize: 11,
    color: palette.textSoft,
    marginTop: 1,
  },
  badge: {
    backgroundColor: '#7B1FA2',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  arabic: {
    fontSize: 34,
    fontFamily: 'Amiri-Regular',
    color: '#4A148C',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 50,
  },
  translit: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#7B1FA2',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 4,
  },
  meaning: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  benefitBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3E5F5',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 12,
    color: '#4A148C',
    lineHeight: 17,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  progressBar: {
    flex: 1,
    height: 5,
    backgroundColor: '#E1BEE7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7B1FA2',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7B1FA2',
    width: 30,
    textAlign: 'right',
  },
  cta: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E1BEE7',
    paddingTop: 10,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7B1FA2',
  },
});
