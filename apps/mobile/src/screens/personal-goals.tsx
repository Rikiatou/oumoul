import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { palette } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReminderTime {
  hour: number;
  minute: number;
}

interface PersonalGoal {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: GoalCategory;
  reminderEnabled: boolean;
  reminderTimes: ReminderTime[];
  notificationIds: string[];
  createdAt: string;
  completedToday: boolean;
  lastCompletedDate: string | null;
  streak: number;
}

type GoalCategory = 'coran' | 'salat' | 'dhikr' | 'dua' | 'jeune' | 'sadaqa' | 'connaissance' | 'autre';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { id: GoalCategory; label: string; icon: string; color: string }[] = [
  { id: 'coran',       label: 'Coran',        icon: '📖', color: '#1E8449' },
  { id: 'salat',       label: 'Prière',       icon: '🕌', color: '#2874A6' },
  { id: 'dhikr',       label: 'Dhikr',        icon: '📿', color: '#7D3C98' },
  { id: 'dua',         label: 'Dou\'a',       icon: '🤲', color: '#BA4A00' },
  { id: 'jeune',       label: 'Jeûne',        icon: '🌙', color: '#1A5276' },
  { id: 'sadaqa',      label: 'Sadaqa',       icon: '💚', color: '#117A65' },
  { id: 'connaissance',label: 'Connaissance', icon: '📚', color: '#6E2F8B' },
  { id: 'autre',       label: 'Autre',        icon: '⭐', color: '#B7950B' },
];

const EMOJIS = ['📖', '🕌', '📿', '🤲', '🌙', '💚', '📚', '⭐', '🌟', '💫', '🕋', '☪️', '🌿', '🌹', '💎', '🙏'];

const SUGGESTED_GOALS = [
  { title: 'Lire le Coran', description: 'Lire une page ou une sourate chaque jour', emoji: '📖', category: 'coran' as GoalCategory },
  { title: 'Faire mes 5 prières', description: 'Ne jamais manquer une prière', emoji: '🕌', category: 'salat' as GoalCategory },
  { title: 'Dhikr du matin', description: 'Faire les adhkâr du matin après Fajr', emoji: '📿', category: 'dhikr' as GoalCategory },
  { title: 'Dhikr du soir', description: 'Faire les adhkâr du soir après Asr', emoji: '🌙', category: 'dhikr' as GoalCategory },
  { title: 'Apprendre un hadith', description: 'Mémoriser ou lire un hadith par jour', emoji: '📚', category: 'connaissance' as GoalCategory },
  { title: 'Donner en sadaqa', description: 'Donner même un peu chaque jour', emoji: '💚', category: 'sadaqa' as GoalCategory },
  { title: 'Jeûne du lundi/jeudi', description: 'Pratiquer le jeûne sunnah', emoji: '🌙', category: 'jeune' as GoalCategory },
  { title: 'Réciter Ayat al-Kursi', description: 'Après chaque prière obligatoire', emoji: '⭐', category: 'dua' as GoalCategory },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}

async function scheduleGoalNotifications(goal: PersonalGoal): Promise<string[]> {
  const ids: string[] = [];
  if (!goal.reminderEnabled || goal.reminderTimes.length === 0) return ids;

  for (const time of goal.reminderTimes) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${goal.emoji} ${goal.title}`,
          body: goal.description || 'N\'oublie pas ton objectif islamique d\'aujourd\'hui 🤲',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
        },
      });
      ids.push(id);
    } catch { /* ignore */ }
  }
  return ids;
}

async function cancelGoalNotifications(notificationIds: string[]) {
  for (const id of notificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch { /* ignore */ }
  }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function PersonalGoalsScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const goalsKey = `oumoul.goals.${user.email}`;

  const [goals, setGoals] = useState<PersonalGoal[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PersonalGoal | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Load goals ──
  useEffect(() => {
    SecureStore.getItemAsync(goalsKey).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as PersonalGoal[];
        if (Array.isArray(parsed)) {
          // Reset completedToday if it's a new day
          const today = todayString();
          setGoals(parsed.map(g => ({
            ...g,
            completedToday: g.lastCompletedDate === today ? g.completedToday : false,
          })));
        }
      } catch { /* ignore */ }
    }).catch(() => {});
  }, [goalsKey]);

  const saveGoals = useCallback((updated: PersonalGoal[]) => {
    setGoals(updated);
    SecureStore.setItemAsync(goalsKey, JSON.stringify(updated)).catch(() => {});
  }, [goalsKey]);

  // ── Request permissions on mount ──
  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  // ── Mark complete today ──
  const toggleComplete = useCallback((goalId: string) => {
    const today = todayString();
    setGoals(prev => {
      const updated = prev.map(g => {
        if (g.id !== goalId) return g;
        const wasCompleted = g.completedToday;
        const newStreak = wasCompleted
          ? Math.max(0, g.streak - 1)
          : g.streak + 1;
        return { ...g, completedToday: !wasCompleted, lastCompletedDate: !wasCompleted ? today : g.lastCompletedDate, streak: newStreak };
      });
      SecureStore.setItemAsync(goalsKey, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, [goalsKey]);

  // ── Delete goal ──
  const deleteGoal = useCallback((goalId: string) => {
    Alert.alert('Supprimer', 'Supprimer cet objectif ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: () => {
          setGoals(prev => {
            const goal = prev.find(g => g.id === goalId);
            if (goal) void cancelGoalNotifications(goal.notificationIds);
            const updated = prev.filter(g => g.id !== goalId);
            SecureStore.setItemAsync(goalsKey, JSON.stringify(updated)).catch(() => {});
            return updated;
          });
        },
      },
    ]);
  }, [goalsKey]);

  const completedCount = goals.filter(g => g.completedToday).length;

  return (
    <View style={[s.screen, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.topBar}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[s.title, { color: palette.text }]}>Mes Objectifs</Text>
          <Text style={[s.subtitle, { color: palette.muted }]}>
            {completedCount}/{goals.length} accomplis aujourd\'hui
          </Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => { setEditingGoal(null); setShowAddModal(true); }}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      {goals.length > 0 && (
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${Math.round((completedCount / goals.length) * 100)}%` }]} />
        </View>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🎯</Text>
          <Text style={[s.emptyTitle, { color: palette.text }]}>Aucun objectif pour l\'instant</Text>
          <Text style={[s.emptyText, { color: palette.muted }]}>
            Définis tes objectifs islamiques personnels et reçois des rappels pour ne jamais les oublier.
          </Text>
          <TouchableOpacity style={[s.suggestBtn, { backgroundColor: palette.primary }]} onPress={() => setShowSuggestions(true)}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Voir des suggestions ✨</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.suggestBtn, { backgroundColor: palette.accentLight, marginTop: 8 }]} onPress={() => { setEditingGoal(null); setShowAddModal(true); }}>
            <Text style={{ color: palette.primaryDark, fontWeight: '700', fontSize: 14 }}>Créer mon objectif +</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={[s.suggestionBanner, { backgroundColor: palette.accentLight }]}
            onPress={() => setShowSuggestions(true)}
          >
            <Ionicons name="bulb-outline" size={16} color={palette.primaryDark} />
            <Text style={[s.suggestionBannerText, { color: palette.primaryDark }]}>Voir des suggestions d\'objectifs</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.primaryDark} />
          </TouchableOpacity>
          <FlatList
            data={goals}
            keyExtractor={g => g.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <GoalCard
                goal={item}
                onToggle={() => toggleComplete(item.id)}
                onEdit={() => { setEditingGoal(item); setShowAddModal(true); }}
                onDelete={() => deleteGoal(item.id)}
              />
            )}
          />
        </>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <GoalFormModal
          goal={editingGoal}
          onClose={() => setShowAddModal(false)}
          onSave={async (goal) => {
            // Cancel old notifications
            if (editingGoal) await cancelGoalNotifications(editingGoal.notificationIds);
            // Schedule new ones
            const notificationIds = await scheduleGoalNotifications(goal);
            const finalGoal = { ...goal, notificationIds };
            if (editingGoal) {
              saveGoals(goals.map(g => g.id === editingGoal.id ? finalGoal : g));
            } else {
              saveGoals([...goals, finalGoal]);
            }
            setShowAddModal(false);
          }}
        />
      )}

      {/* Suggestions Modal */}
      {showSuggestions && (
        <SuggestionsModal
          onClose={() => setShowSuggestions(false)}
          onSelect={(suggested) => {
            setShowSuggestions(false);
            setEditingGoal(null);
            const prefilled: PersonalGoal = {
              id: Date.now().toString(),
              title: suggested.title,
              description: suggested.description,
              emoji: suggested.emoji,
              category: suggested.category,
              reminderEnabled: false,
              reminderTimes: [],
              notificationIds: [],
              createdAt: new Date().toISOString(),
              completedToday: false,
              lastCompletedDate: null,
              streak: 0,
            };
            setEditingGoal(prefilled);
            setShowAddModal(true);
          }}
        />
      )}
    </View>
  );
}

// ─── GoalCard ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onToggle,
  onEdit,
  onDelete,
}: {
  goal: PersonalGoal;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = CATEGORIES.find(c => c.id === goal.category);
  return (
    <View style={[gc.card, goal.completedToday && gc.cardDone]}>
      <TouchableOpacity style={gc.checkCircle} onPress={onToggle} activeOpacity={0.7}>
        <View style={[gc.check, goal.completedToday && gc.checkDone]}>
          {goal.completedToday && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 18 }}>{goal.emoji}</Text>
          <Text style={[gc.goalTitle, goal.completedToday && gc.goalTitleDone]}>{goal.title}</Text>
        </View>
        {goal.description ? <Text style={gc.goalDesc} numberOfLines={2}>{goal.description}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          {cat && (
            <View style={[gc.badge, { backgroundColor: cat.color + '20' }]}>
              <Text style={[gc.badgeText, { color: cat.color }]}>{cat.label}</Text>
            </View>
          )}
          {goal.reminderEnabled && goal.reminderTimes.length > 0 && (
            <View style={gc.badge}>
              <Ionicons name="notifications" size={11} color="#666" />
              <Text style={gc.badgeText}>{goal.reminderTimes.map(t => formatTime(t.hour, t.minute)).join(', ')}</Text>
            </View>
          )}
          {goal.streak > 0 && (
            <View style={[gc.badge, { backgroundColor: '#FFF3CD' }]}>
              <Text style={[gc.badgeText, { color: '#856404' }]}>🔥 {goal.streak} jours</Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <TouchableOpacity onPress={onEdit}>
          <Ionicons name="pencil-outline" size={18} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── GoalFormModal ────────────────────────────────────────────────────────────

function GoalFormModal({
  goal,
  onClose,
  onSave,
}: {
  goal: PersonalGoal | null;
  onClose: () => void;
  onSave: (g: PersonalGoal) => Promise<void>;
}) {
  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [emoji, setEmoji] = useState(goal?.emoji ?? '🎯');
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? 'autre');
  const [reminderEnabled, setReminderEnabled] = useState(goal?.reminderEnabled ?? false);
  const [reminderTimes, setReminderTimes] = useState<ReminderTime[]>(goal?.reminderTimes ?? [{ hour: 8, minute: 0 }]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const addTime = () => setReminderTimes(prev => [...prev, { hour: 12, minute: 0 }]);
  const removeTime = (i: number) => setReminderTimes(prev => prev.filter((_, idx) => idx !== i));
  const updateTime = (i: number, field: 'hour' | 'minute', value: number) => {
    setReminderTimes(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Erreur', 'Le titre est obligatoire.'); return; }
    setSaving(true);
    const g: PersonalGoal = {
      id: goal?.id ?? Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      emoji,
      category,
      reminderEnabled,
      reminderTimes: reminderEnabled ? reminderTimes : [],
      notificationIds: goal?.notificationIds ?? [],
      createdAt: goal?.createdAt ?? new Date().toISOString(),
      completedToday: goal?.completedToday ?? false,
      lastCompletedDate: goal?.lastCompletedDate ?? null,
      streak: goal?.streak ?? 0,
    };
    await onSave(g);
    setSaving(false);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[fm.container, { backgroundColor: palette.bg }]}>
          {/* Header */}
          <View style={fm.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: palette.primaryDark, fontSize: 16 }}>Annuler</Text>
            </TouchableOpacity>
            <Text style={[fm.headerTitle, { color: palette.text }]}>
              {goal ? 'Modifier' : 'Nouvel objectif'}
            </Text>
            <TouchableOpacity onPress={() => void handleSave()} disabled={saving}>
              <Text style={{ color: palette.primary, fontSize: 16, fontWeight: '700' }}>
                {saving ? '...' : 'Enregistrer'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            {/* Emoji */}
            <Text style={[fm.label, { color: palette.muted }]}>Icône</Text>
            <TouchableOpacity style={fm.emojiBtn} onPress={() => setShowEmojiPicker(v => !v)}>
              <Text style={{ fontSize: 32 }}>{emoji}</Text>
              <Ionicons name="chevron-down" size={16} color={palette.muted} />
            </TouchableOpacity>
            {showEmojiPicker && (
              <View style={fm.emojiGrid}>
                {EMOJIS.map(e => (
                  <TouchableOpacity key={e} style={fm.emojiItem} onPress={() => { setEmoji(e); setShowEmojiPicker(false); }}>
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Title */}
            <Text style={[fm.label, { color: palette.muted }]}>Objectif *</Text>
            <TextInput
              style={[fm.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.card }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Lire le Coran 3 fois par jour"
              placeholderTextColor={palette.muted}
              maxLength={80}
            />

            {/* Description */}
            <Text style={[fm.label, { color: palette.muted }]}>Description (facultatif)</Text>
            <TextInput
              style={[fm.input, fm.inputMulti, { color: palette.text, borderColor: palette.border, backgroundColor: palette.card }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Plus de détails sur ton objectif..."
              placeholderTextColor={palette.muted}
              multiline
              numberOfLines={3}
              maxLength={200}
            />

            {/* Category */}
            <Text style={[fm.label, { color: palette.muted }]}>Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[fm.catChip, { borderColor: cat.color, backgroundColor: category === cat.id ? cat.color : 'transparent' }]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                    <Text style={[fm.catChipText, { color: category === cat.id ? '#fff' : cat.color }]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Reminders toggle */}
            <View style={fm.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[fm.switchLabel, { color: palette.text }]}>🔔 Activer les rappels</Text>
                <Text style={{ fontSize: 12, color: palette.muted }}>Reçois une notification aux heures choisies</Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ true: palette.primary }}
              />
            </View>

            {reminderEnabled && (
              <View style={fm.timesSection}>
                {reminderTimes.map((t, i) => (
                  <View key={i} style={fm.timeRow}>
                    <Text style={{ fontSize: 14, color: palette.text, width: 20 }}>{i + 1}.</Text>
                    {/* Hour picker */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={fm.timePicker}
                      contentContainerStyle={{ alignItems: 'center', gap: 4 }}
                    >
                      {HOURS.map(h => (
                        <TouchableOpacity
                          key={h}
                          style={[fm.timeChip, t.hour === h && fm.timeChipActive]}
                          onPress={() => updateTime(i, 'hour', h)}
                        >
                          <Text style={[fm.timeChipText, t.hour === h && fm.timeChipTextActive]}>
                            {String(h).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <Text style={{ color: palette.text, fontWeight: '700', paddingHorizontal: 4 }}>:</Text>
                    {/* Minute picker */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={[fm.timePicker, { maxWidth: 160 }]}
                      contentContainerStyle={{ alignItems: 'center', gap: 4 }}
                    >
                      {MINUTES.map(m => (
                        <TouchableOpacity
                          key={m}
                          style={[fm.timeChip, t.minute === m && fm.timeChipActive]}
                          onPress={() => updateTime(i, 'minute', m)}
                        >
                          <Text style={[fm.timeChipText, t.minute === m && fm.timeChipTextActive]}>
                            {String(m).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <Text style={[fm.timeLabel, { color: palette.primary }]}>{formatTime(t.hour, t.minute)}</Text>
                    {reminderTimes.length > 1 && (
                      <TouchableOpacity onPress={() => removeTime(i)}>
                        <Ionicons name="close-circle" size={20} color="#e74c3c" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {reminderTimes.length < 3 && (
                  <TouchableOpacity style={fm.addTimeBtn} onPress={addTime}>
                    <Ionicons name="add-circle-outline" size={18} color={palette.primary} />
                    <Text style={{ color: palette.primary, fontWeight: '600', fontSize: 14 }}>Ajouter un horaire</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── SuggestionsModal ─────────────────────────────────────────────────────────

function SuggestionsModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (s: typeof SUGGESTED_GOALS[0]) => void;
}) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[su.container, { backgroundColor: palette.bg }]}>
        <View style={su.header}>
          <Text style={[su.title, { color: palette.text }]}>✨ Suggestions d'objectifs</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={palette.text} />
          </TouchableOpacity>
        </View>
        <Text style={[su.subtitle, { color: palette.muted }]}>
          Choisis un objectif parmi les plus populaires et personnalise-le ensuite.
        </Text>
        <FlatList
          data={SUGGESTED_GOALS}
          keyExtractor={g => g.title}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const cat = CATEGORIES.find(c => c.id === item.category);
            return (
              <TouchableOpacity style={[su.card, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => onSelect(item)} activeOpacity={0.75}>
                <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[su.cardTitle, { color: palette.text }]}>{item.title}</Text>
                  <Text style={[su.cardDesc, { color: palette.muted }]}>{item.description}</Text>
                  {cat && (
                    <View style={[su.catBadge, { backgroundColor: cat.color + '20' }]}>
                      <Text style={[su.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="add-circle" size={24} color={palette.primary} />
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: palette.border,
  },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 1 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center',
  },
  progressBar: {
    height: 4, backgroundColor: palette.border,
    marginHorizontal: 16, marginTop: 8, borderRadius: 2,
  },
  progressFill: { height: 4, backgroundColor: palette.primary, borderRadius: 2 },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  suggestBtn: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
    alignItems: 'center', width: '100%',
  },
  suggestionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginVertical: 10, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  suggestionBannerText: { flex: 1, fontSize: 13, fontWeight: '600' },
});

const gc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: palette.card, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: palette.border,
  },
  cardDone: { opacity: 0.75 },
  checkCircle: { paddingTop: 2 },
  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: palette.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  checkDone: { backgroundColor: palette.primary, borderColor: palette.primary },
  goalTitle: { fontSize: 15, fontWeight: '700', color: palette.text, flex: 1 },
  goalTitleDone: { textDecorationLine: 'line-through', opacity: 0.6 },
  goalDesc: { fontSize: 13, color: palette.muted, marginTop: 2, lineHeight: 18 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0f0f0', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { fontSize: 11, color: '#666', fontWeight: '600' },
});

const fm = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: palette.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 4 },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  emojiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.border,
    backgroundColor: palette.card, alignSelf: 'flex-start', marginBottom: 12,
  },
  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12,
  },
  emojiItem: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border,
  },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  catChipText: { fontSize: 12, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: palette.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: palette.border, marginVertical: 8,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  timesSection: { gap: 12, marginTop: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timePicker: { maxWidth: 200 },
  timeChip: {
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: palette.border,
  },
  timeChipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  timeChipText: { fontSize: 13, color: palette.text, fontWeight: '600' },
  timeChipTextActive: { color: '#fff' },
  timeLabel: { fontSize: 16, fontWeight: '700', minWidth: 42 },
  addTimeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, justifyContent: 'center',
  },
});

const su = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: palette.border,
  },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 13, paddingHorizontal: 20, paddingVertical: 10, lineHeight: 18 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardDesc: { fontSize: 12, lineHeight: 16, marginBottom: 6 },
  catBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  catBadgeText: { fontSize: 11, fontWeight: '700' },
});
