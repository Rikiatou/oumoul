import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { palette } from '../theme';
import { HelpTip } from '../components/HelpTip';
import { awardEvent } from '../gamification/gamification-events';
import { FlatList } from 'react-native';

const TASBIH_SESSIONS_KEY = 'oumoul_tasbih_sessions';
const TASBIH_CUSTOM_KEY = 'oumoul_tasbih_custom';
const TASBIH_LIVE_KEY = 'oumoul_tasbih_live';

interface DhikrPreset {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  target: number;
}

const PRESETS: DhikrPreset[] = [
  { id: 'subhanallah', arabic: 'سُبْحَانَ اللَّهِ', transliteration: 'SubhanAllah', translation: 'Gloire à Allah', target: 33 },
  { id: 'alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', transliteration: 'Alhamdulillah', translation: 'Louange à Allah', target: 33 },
  { id: 'allahuakbar', arabic: 'اللَّهُ أَكْبَرُ', transliteration: 'Allahu Akbar', translation: 'Allah est le Plus Grand', target: 33 },
  { id: 'lailaha', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', transliteration: 'La ilaha illAllah', translation: 'Il n\'y a de dieu qu\'Allah', target: 100 },
  { id: 'astaghfirullah', arabic: 'أَسْتَغْفِرُ اللَّهَ', transliteration: 'Astaghfirullah', translation: 'Je demande pardon à Allah', target: 100 },
  { id: 'salawat', arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', transliteration: 'Allahumma salli ala Muhammad', translation: 'Ô Allah, prie sur Muhammad', target: 100 },
  { id: 'hawqala', arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', transliteration: 'La hawla wa la quwwata illa billah', translation: 'Il n\'y a de force ni de puissance qu\'en Allah', target: 33 },
  { id: 'tahlil', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', transliteration: 'SubhanAllahi wa bihamdihi', translation: 'Gloire et louange à Allah', target: 100 },
];

interface CustomDhikrLocal {
  id: string;
  text: string;
  translation: string;
  target: number;
}

interface SessionLog {
  id: string;
  dhikrId: string;
  label: string;
  count: number;
  target: number;
  completedAt: string;
}

export function TasbihScreen({ user: _user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [selectedPreset, setSelectedPreset] = useState<DhikrPreset | null>(null);
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(33);
  const [vibrate, setVibrate] = useState(true);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [customDhikrs, setCustomDhikrs] = useState<CustomDhikrLocal[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load persisted data on mount
  useEffect(() => {
    Promise.all([
      SecureStore.getItemAsync(TASBIH_SESSIONS_KEY),
      SecureStore.getItemAsync(TASBIH_CUSTOM_KEY),
      SecureStore.getItemAsync(TASBIH_LIVE_KEY),
    ]).then(([sessRaw, custRaw, liveRaw]: [string | null, string | null, string | null]) => {
      if (sessRaw) try { setSessions(JSON.parse(sessRaw)); } catch { /* ignore */ }
      if (custRaw) try { setCustomDhikrs(JSON.parse(custRaw)); } catch { /* ignore */ }
      if (liveRaw) {
        try {
          const live = JSON.parse(liveRaw);
          if (live?.preset && live?.count != null && live?.target != null) {
            setSelectedPreset(live.preset);
            setCount(live.count);
            setTarget(live.target);
          }
        } catch { /* ignore */ }
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  // Persist sessions on change
  useEffect(() => {
    if (!loaded) return;
    SecureStore.setItemAsync(TASBIH_SESSIONS_KEY, JSON.stringify(sessions.slice(0, 500))).catch(() => {});
  }, [sessions, loaded]);

  // Persist custom dhikrs on change
  useEffect(() => {
    if (!loaded) return;
    SecureStore.setItemAsync(TASBIH_CUSTOM_KEY, JSON.stringify(customDhikrs)).catch(() => {});
  }, [customDhikrs, loaded]);
  const [customText, setCustomText] = useState('');
  const [customTranslation, setCustomTranslation] = useState('');
  const [customTarget, setCustomTarget] = useState('33');

  // Streak calculation
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const streak = useMemo(() => {
    const dates = new Set(sessions.map((s) => s.completedAt.slice(0, 10)));
    let s = 0;
    const d = new Date();
    while (true) {
      const iso = d.toISOString().slice(0, 10);
      if (dates.has(iso)) {
        s++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return s;
  }, [sessions]);

  const todaySessions = useMemo(
    () => sessions.filter((s) => s.completedAt.startsWith(todayIso)),
    [sessions, todayIso]
  );

  const todayTotal = useMemo(
    () => todaySessions.reduce((sum, s) => sum + s.count, 0),
    [todaySessions]
  );

  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return PRESETS;
    const q = searchQuery.toLowerCase();
    return PRESETS.filter(
      (p) =>
        p.transliteration.toLowerCase().includes(q) ||
        p.translation.toLowerCase().includes(q) ||
        p.arabic.includes(q)
    );
  }, [searchQuery]);

  const filteredCustomDhikrs = useMemo(() => {
    if (!searchQuery.trim()) return customDhikrs;
    const q = searchQuery.toLowerCase();
    return customDhikrs.filter(
      (c) => c.text.toLowerCase().includes(q) || c.translation.toLowerCase().includes(q)
    );
  }, [searchQuery, customDhikrs]);

  const handleTap = useCallback(() => {
    const next = count + 1;
    setCount(next);
    if (vibrate) Vibration.vibrate(10);

    // Pulse animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    if (next >= target && selectedPreset) {
      // Session complete — award gamification points
      const evt = next >= 200 ? 'dhikr_200' : next >= 99 ? 'dhikr_99' : 'dhikr_33';
      void awardEvent(evt);
      void awardEvent('tasbih_complete');
      setSessions((prev) => [
        {
          id: Date.now().toString(),
          dhikrId: selectedPreset.id,
          label: selectedPreset.transliteration,
          count: next,
          target,
          completedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      if (vibrate) Vibration.vibrate([0, 100, 50, 100]);
    }

    // Persist live state
    if (selectedPreset) {
      SecureStore.setItemAsync(TASBIH_LIVE_KEY, JSON.stringify({ preset: selectedPreset, count: next, target })).catch(() => {});
    }
  }, [count, target, vibrate, selectedPreset, scaleAnim]);

  const resetCounter = useCallback(() => {
    setCount(0);
    if (selectedPreset) {
      SecureStore.setItemAsync(TASBIH_LIVE_KEY, JSON.stringify({ preset: selectedPreset, count: 0, target })).catch(() => {});
    }
  }, [selectedPreset, target]);

  const selectPreset = useCallback((preset: DhikrPreset) => {
    setSelectedPreset(preset);
    setTarget(preset.target);
    setCount(0);
    SecureStore.setItemAsync(TASBIH_LIVE_KEY, JSON.stringify({ preset, count: 0, target: preset.target })).catch(() => {});
  }, []);

  const addCustomDhikr = useCallback(() => {
    if (!customText.trim()) return;
    const newDhikr: CustomDhikrLocal = {
      id: Date.now().toString(),
      text: customText.trim(),
      translation: customTranslation.trim(),
      target: parseInt(customTarget, 10) || 33,
    };
    setCustomDhikrs((prev) => [...prev, newDhikr]);
    setCustomText('');
    setCustomTranslation('');
    setCustomTarget('33');
    setShowAddCustom(false);
  }, [customText, customTranslation, customTarget]);

  const progressPct = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0;
  const isComplete = count >= target;

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={st.header}>
        <BackButton onPress={onBack} />
        <Text style={st.headerTitle} accessibilityRole="header">Tasbih</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <HelpTip screenName="Tasbih" tips={[
            { icon: 'radio-button-on', title: 'Compteur', description: 'Appuie sur le cercle central pour compter. Le compteur se réinitialise quand tu atteins l\'objectif.' },
            { icon: 'list', title: 'Dhikrs prédéfinis', description: 'Choisis parmi SubhanAllah, Alhamdulillah, Allahu Akbar et d\'autres.' },
            { icon: 'create', title: 'Dhikr personnalisé', description: 'Crée tes propres dhikrs avec un texte et un objectif personnalisés.' },
            { icon: 'notifications', title: 'Vibration', description: 'Active/désactive la vibration à chaque tap avec le bouton en haut à droite.' },
            { icon: 'flame', title: 'Séries', description: 'Chaque session complète est enregistrée dans ton historique.' },
          ]} />
          <TouchableOpacity onPress={() => setVibrate(!vibrate)} style={st.backBtn} accessibilityLabel={vibrate ? 'Désactiver la vibration' : 'Activer la vibration'} accessibilityRole="button">
            <Ionicons name={vibrate ? 'notifications' : 'notifications-off'} size={20} color={palette.primaryDark} />
          </TouchableOpacity>
        </View>
      </View>

      {selectedPreset ? (
        /* Counter View */
        <View style={st.counterContainer}>
          {/* Streak & Today */}
          <View style={st.miniStatsRow}>
            <View style={st.miniStat}>
              <Ionicons name="flame" size={14} color="#F57C00" />
              <Text style={st.miniStatText}>{streak}j série</Text>
            </View>
            <View style={st.miniStat}>
              <Ionicons name="today" size={14} color={palette.primaryDark} />
              <Text style={st.miniStatText}>{todayTotal} aujourd'hui</Text>
            </View>
          </View>

          {/* Dhikr text */}
          <Text style={st.counterArabic}>{selectedPreset.arabic}</Text>
          <Text style={st.counterTranslit}>{selectedPreset.transliteration}</Text>
          <Text style={st.counterTranslation}>{selectedPreset.translation}</Text>

          {/* Counter circle */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[st.counterCircle, isComplete && st.counterCircleComplete]}
              onPress={handleTap}
              activeOpacity={0.8}
              accessibilityLabel={`Compteur: ${count} sur ${target}. ${isComplete ? 'Terminé.' : 'Appuie pour compter.'}`}
              accessibilityRole="button"
              accessibilityHint="Appuie pour incrémenter le compteur"
            >
              <Text style={st.counterNumber}>{count}</Text>
              <Text style={st.counterTarget}>/ {target}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Progress bar */}
          <View style={st.counterBarBg}>
            <View style={[st.counterBarFill, { width: `${progressPct}%` }, isComplete && { backgroundColor: '#388E3C' }]} />
          </View>
          <Text style={st.counterPct}>{progressPct}%</Text>

          {isComplete && (
            <Text style={st.completeText}>Masha'Allah ! Terminé ✨</Text>
          )}

          {/* Controls */}
          <View style={st.controlsRow}>
            <TouchableOpacity style={st.controlBtn} onPress={resetCounter} accessibilityLabel="Réinitialiser le compteur" accessibilityRole="button">
              <Ionicons name="refresh" size={20} color={palette.textSoft} />
              <Text style={st.controlLabel}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.controlBtn} onPress={() => setSelectedPreset(null)} accessibilityLabel="Changer de dhikr" accessibilityRole="button">
              <Ionicons name="list" size={20} color={palette.textSoft} />
              <Text style={st.controlLabel}>Changer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Preset Selection */
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Stats Banner */}
          <View style={st.statsBanner}>
            <View style={st.statItem}>
              <Ionicons name="flame" size={20} color="#F57C00" />
              <Text style={st.statValue}>{streak}</Text>
              <Text style={st.statLabel}>Série</Text>
            </View>
            <View style={st.statDivider} />
            <View style={st.statItem}>
              <Ionicons name="today" size={20} color={palette.primaryDark} />
              <Text style={st.statValue}>{todayTotal}</Text>
              <Text style={st.statLabel}>Aujourd'hui</Text>
            </View>
            <View style={st.statDivider} />
            <View style={st.statItem}>
              <Ionicons name="checkmark-done" size={20} color="#388E3C" />
              <Text style={st.statValue}>{todaySessions.length}</Text>
              <Text style={st.statLabel}>Sessions</Text>
            </View>
          </View>

          {/* Search */}
          <View style={st.searchBox}>
            <Ionicons name="search" size={16} color={palette.textSoft} />
            <TextInput
              style={st.searchInput}
              placeholder="Rechercher un dhikr..."
              placeholderTextColor={palette.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={palette.muted} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={st.sectionTitle}>Adhkar prédéfinis</Text>
          {PRESETS.map((p) => (
            <TouchableOpacity key={p.id} style={st.presetRow} onPress={() => selectPreset(p)} activeOpacity={0.7} accessibilityLabel={`Sélectionner ${p.transliteration}, ${p.translation}`} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={st.presetArabic}>{p.arabic}</Text>
                <Text style={st.presetTranslit}>{p.transliteration}</Text>
                <Text style={st.presetTranslation}>{p.translation}</Text>
              </View>
              <View style={st.presetTarget}>
                <Text style={st.presetTargetText}>×{p.target}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Custom Dhikrs */}
          <View style={st.customHeader}>
            <Text style={st.sectionTitle}>Dhikr personnalisés</Text>
            <TouchableOpacity onPress={() => setShowAddCustom(!showAddCustom)} accessibilityLabel={showAddCustom ? 'Fermer le formulaire d\'ajout' : 'Ajouter un dhikr personnalisé'} accessibilityRole="button">
              <Ionicons name={showAddCustom ? 'close' : 'add-circle'} size={24} color={palette.primaryDark} />
            </TouchableOpacity>
          </View>

          {showAddCustom && (
            <View style={st.addCustomForm}>
              <TextInput style={st.input} placeholder="Texte du dhikr" placeholderTextColor={palette.muted} value={customText} onChangeText={setCustomText} />
              <TextInput style={st.input} placeholder="Traduction (optionnel)" placeholderTextColor={palette.muted} value={customTranslation} onChangeText={setCustomTranslation} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[st.input, { flex: 1 }]} placeholder="Objectif" placeholderTextColor={palette.muted} value={customTarget} onChangeText={setCustomTarget} keyboardType="numeric" />
                <TouchableOpacity style={st.addBtn} onPress={addCustomDhikr} accessibilityLabel="Ajouter ce dhikr personnalisé" accessibilityRole="button">
                  <Text style={st.addBtnText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {filteredCustomDhikrs.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={st.presetRow}
              onPress={() => selectPreset({ id: c.id, arabic: c.text, transliteration: '', translation: c.translation, target: c.target })}
              accessibilityLabel={`Sélectionner ${c.text}`} accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Text style={st.presetArabic}>{c.text}</Text>
                {c.translation ? <Text style={st.presetTranslation}>{c.translation}</Text> : null}
              </View>
              <View style={st.presetTarget}>
                <Text style={st.presetTargetText}>×{c.target}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {customDhikrs.length === 0 && !showAddCustom && (
            <Text style={st.emptyText}>Aucun dhikr personnalisé. Appuie sur + pour en ajouter.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: palette.border, marginBottom: 16, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: palette.text },
  counterContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  miniStatsRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatText: { fontSize: 12, color: palette.textSoft, fontWeight: '600' },
  counterArabic: { fontSize: 28, color: palette.arabic, fontFamily: 'Amiri-Bold', textAlign: 'center' },
  counterTranslit: { fontSize: 14, color: palette.transliteration, fontStyle: 'italic', marginTop: 4 },
  counterTranslation: { fontSize: 13, color: palette.textSoft, marginTop: 4, marginBottom: 24 },
  counterCircle: { width: 160, height: 160, borderRadius: 80, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  counterCircleComplete: { backgroundColor: '#388E3C' },
  counterNumber: { fontSize: 48, fontWeight: '800', color: '#fff' },
  counterTarget: { fontSize: 16, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  counterBarBg: { width: '80%', height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, marginTop: 20 },
  counterBarFill: { height: 6, backgroundColor: palette.primaryDark, borderRadius: 3 },
  counterPct: { fontSize: 13, color: palette.textSoft, fontWeight: '600', marginTop: 6 },
  completeText: { fontSize: 16, fontWeight: '700', color: '#388E3C', marginTop: 16 },
  controlsRow: { flexDirection: 'row', gap: 32, marginTop: 32 },
  controlBtn: { alignItems: 'center', gap: 4 },
  controlLabel: { fontSize: 12, color: palette.textSoft, fontWeight: '500' },
  statsBanner: { flexDirection: 'row', backgroundColor: palette.card, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: palette.border },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: palette.border },
  statValue: { fontSize: 20, fontWeight: '800', color: palette.text },
  statLabel: { fontSize: 11, color: palette.textSoft },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: palette.text, marginBottom: 12 },
  presetRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: palette.border },
  presetArabic: { fontSize: 18, color: palette.arabic, fontFamily: 'Amiri-Regular' },
  presetTranslit: { fontSize: 12, color: palette.transliteration, fontStyle: 'italic', marginTop: 2 },
  presetTranslation: { fontSize: 12, color: palette.textSoft, marginTop: 2 },
  presetTarget: { backgroundColor: palette.accentLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 12 },
  presetTargetText: { fontSize: 13, fontWeight: '700', color: palette.primaryDark },
  customHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 },
  addCustomForm: { backgroundColor: palette.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: palette.border, gap: 10 },
  input: { backgroundColor: palette.inputBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: palette.text, borderWidth: 1, borderColor: palette.inputBorder },
  addBtn: { backgroundColor: palette.primaryDark, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyText: { fontSize: 13, color: palette.muted, textAlign: 'center', marginTop: 8 },
});
