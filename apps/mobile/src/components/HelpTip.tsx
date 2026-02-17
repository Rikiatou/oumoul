import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../theme';

export interface HelpTipItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

interface HelpTipProps {
  screenName: string;
  tips: HelpTipItem[];
}

export function HelpTip({ screenName, tips }: HelpTipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={st.btn}
        accessibilityLabel={`Aide pour ${screenName}`}
        accessibilityRole="button"
      >
        <Ionicons name="help-circle-outline" size={22} color={palette.primaryDark} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={st.overlay} onPress={() => setVisible(false)}>
          <Pressable style={st.sheet} onPress={() => {}}>
            <View style={st.sheetHeader}>
              <Ionicons name="help-circle" size={24} color={palette.primaryDark} />
              <Text style={st.sheetTitle}>{screenName}</Text>
              <TouchableOpacity onPress={() => setVisible(false)} style={st.closeBtn}>
                <Ionicons name="close" size={20} color={palette.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.tipList} showsVerticalScrollIndicator={false}>
              {tips.map((tip, i) => (
                <View key={i} style={st.tipRow}>
                  <View style={st.tipIcon}>
                    <Ionicons name={tip.icon} size={18} color={palette.primaryDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.tipTitle}>{tip.title}</Text>
                    <Text style={st.tipDesc}>{tip.description}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={st.gotItBtn} onPress={() => setVisible(false)}>
              <Text style={st.gotItText}>Compris !</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: palette.card,
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: palette.text,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipList: {
    maxHeight: 400,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  tipIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: palette.primaryDark + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 2,
  },
  tipDesc: {
    fontSize: 12,
    color: palette.muted,
    lineHeight: 17,
  },
  gotItBtn: {
    backgroundColor: palette.primaryDark,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  gotItText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
