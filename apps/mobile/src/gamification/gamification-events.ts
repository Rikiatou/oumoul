import * as SecureStore from 'expo-secure-store';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GamificationEvent =
  | 'prayer_on_time'
  | 'prayer_late'
  | 'all_prayers_day'
  | 'quran_read'          // per session (any)
  | 'quran_read_20min'    // 20+ minutes
  | 'dhikr_33'
  | 'dhikr_99'
  | 'dhikr_200'
  | 'tasbih_complete'     // completed a full cycle
  | 'sadaqa'
  | 'fasting_day'
  | 'fasting_makeup'
  | 'imane_program_day'   // full daily checklist done
  | 'hadith_read'
  | 'dua_used'
  | 'ihsan_50'            // ihsan score ≥ 50
  | 'ihsan_90'            // ihsan score ≥ 90
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'recitation_practiced'
  | 'community_post'
  | 'community_review';

interface PointRule {
  points: number;
  xp: number;
  label: string;
}

const POINT_RULES: Record<GamificationEvent, PointRule> = {
  prayer_on_time:       { points: 10, xp: 15, label: 'Prière à l\'heure' },
  prayer_late:          { points: 5,  xp: 5,  label: 'Prière en retard' },
  all_prayers_day:      { points: 30, xp: 40, label: '5 prières dans la journée' },
  quran_read:           { points: 10, xp: 10, label: 'Lecture du Coran' },
  quran_read_20min:     { points: 25, xp: 30, label: 'Coran 20+ minutes' },
  dhikr_33:             { points: 5,  xp: 5,  label: 'Dhikr 33x' },
  dhikr_99:             { points: 10, xp: 12, label: 'Dhikr 99x' },
  dhikr_200:            { points: 20, xp: 25, label: 'Dhikr 200x' },
  tasbih_complete:      { points: 15, xp: 18, label: 'Tasbih complété' },
  sadaqa:               { points: 20, xp: 25, label: 'Sadaqa' },
  fasting_day:          { points: 40, xp: 50, label: 'Jour de jeûne' },
  fasting_makeup:       { points: 30, xp: 35, label: 'Jour de rattrapage' },
  imane_program_day:    { points: 35, xp: 45, label: 'Programme Imane complet' },
  hadith_read:          { points: 5,  xp: 5,  label: 'Hadith du jour lu' },
  dua_used:             { points: 3,  xp: 3,  label: 'Du\'a consulté' },
  ihsan_50:             { points: 20, xp: 25, label: 'Score Ihsan ≥ 50' },
  ihsan_90:             { points: 50, xp: 60, label: 'Score Ihsan ≥ 90 — Ihsan !' },
  streak_3:             { points: 15, xp: 20, label: 'Série de 3 jours' },
  streak_7:             { points: 40, xp: 50, label: 'Série de 7 jours' },
  streak_30:            { points: 150,xp: 200,label: 'Série de 30 jours' },
  recitation_practiced: { points: 10, xp: 12, label: 'Récitation pratiquée' },
  community_post:       { points: 8,  xp: 8,  label: 'Post communautaire' },
  community_review:     { points: 5,  xp: 5,  label: 'Avis communautaire' },
};

// ─── Level thresholds ─────────────────────────────────────────────────────────

const LEVEL_XP = [0, 100, 250, 500, 900, 1500, 2300, 3300, 4500, 6000, 8000];

function xpToLevel(xp: number): number {
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) return i + 1;
  }
  return 1;
}

// ─── Achievements ────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  condition: (state: GamificationState) => boolean;
  unlockedAt?: string;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_prayer', title: 'Premier pas', description: 'Enregistre ta première prière.', icon: '🕌', points: 10, condition: (s) => (s.totalEvents.prayer_on_time ?? 0) >= 1 || (s.totalEvents.prayer_late ?? 0) >= 1 },
  { id: 'week_fajr', title: 'Gardien de l\'aube', description: '7 Fajr à l\'heure.', icon: '🌅', points: 50, condition: (s) => (s.totalEvents.prayer_on_time ?? 0) >= 7 },
  { id: 'quran_warrior', title: 'Guerrier du Coran', description: '10 sessions de lecture.', icon: '📖', points: 40, condition: (s) => (s.totalEvents.quran_read ?? 0) >= 10 },
  { id: 'dhikr_master', title: 'Maître du dhikr', description: '100 sessions de dhikr.', icon: '📿', points: 60, condition: (s) => ((s.totalEvents.dhikr_33 ?? 0) + (s.totalEvents.dhikr_99 ?? 0) + (s.totalEvents.dhikr_200 ?? 0)) >= 100 },
  { id: 'streak_7', title: 'Semaine de fer', description: '7 jours consécutifs.', icon: '🔥', points: 40, condition: (s) => s.longestStreak >= 7 },
  { id: 'streak_30', title: 'Mois béni', description: '30 jours consécutifs.', icon: '💎', points: 150, condition: (s) => s.longestStreak >= 30 },
  { id: 'ihsan_first', title: 'En quête d\'Ihsan', description: 'Atteins un score Ihsan de 90.', icon: '🌟', points: 50, condition: (s) => (s.totalEvents.ihsan_90 ?? 0) >= 1 },
  { id: 'community_active', title: 'Pilier de la communauté', description: '10 posts communautaires.', icon: '🤝', points: 30, condition: (s) => (s.totalEvents.community_post ?? 0) >= 10 },
  { id: 'fasting_hero', title: 'Héros du jeûne', description: '10 jours de jeûne.', icon: '🌙', points: 100, condition: (s) => (s.totalEvents.fasting_day ?? 0) >= 10 },
  { id: 'level_5', title: 'Niveau 5', description: 'Atteins le niveau 5.', icon: '⭐', points: 50, condition: (s) => xpToLevel(s.totalXp) >= 5 },
  { id: 'level_10', title: 'Niveau 10', description: 'Atteins le niveau 10.', icon: '👑', points: 200, condition: (s) => xpToLevel(s.totalXp) >= 10 },
];

// ─── State ────────────────────────────────────────────────────────────────────

export interface GamificationState {
  totalPoints: number;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  totalEvents: Partial<Record<GamificationEvent, number>>;
  achievements: Array<{ id: string; unlockedAt: string }>;
  recentActivity: Array<{ event: GamificationEvent; points: number; xp: number; date: string; label: string }>;
}

const STORE_KEY = 'oumoul_gamification_v2';

const DEFAULT_STATE: GamificationState = {
  totalPoints: 0,
  totalXp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  totalEvents: {},
  achievements: [],
  recentActivity: [],
};

// ─── Core functions ───────────────────────────────────────────────────────────

export async function loadGamificationState(): Promise<GamificationState> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

async function saveGamificationState(state: GamificationState): Promise<void> {
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(state));
}

function updateStreak(state: GamificationState, today: string): GamificationState {
  const last = state.lastActiveDate;
  if (!last || last === today) return state;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yest = yesterday.toISOString().slice(0, 10);

  const newStreak = last === yest ? state.currentStreak + 1 : 1;
  return {
    ...state,
    currentStreak: newStreak,
    longestStreak: Math.max(state.longestStreak, newStreak),
    lastActiveDate: today,
  };
}

function checkAchievements(state: GamificationState): { state: GamificationState; newAchievements: Achievement[] } {
  const newlyUnlocked: Achievement[] = [];
  let updated = state;

  for (const ach of ACHIEVEMENTS) {
    const alreadyUnlocked = state.achievements.some((a) => a.id === ach.id);
    if (!alreadyUnlocked && ach.condition(state)) {
      newlyUnlocked.push(ach);
      updated = {
        ...updated,
        totalPoints: updated.totalPoints + ach.points,
        achievements: [...updated.achievements, { id: ach.id, unlockedAt: new Date().toISOString() }],
      };
    }
  }

  return { state: updated, newAchievements: newlyUnlocked };
}

/**
 * Award points for a gamification event.
 * Call this from any screen when the user completes an action.
 * Returns the updated state and any newly unlocked achievements.
 */
export async function awardEvent(
  event: GamificationEvent,
  times = 1
): Promise<{ state: GamificationState; newAchievements: Achievement[]; earned: { points: number; xp: number } }> {
  const rule = POINT_RULES[event];
  const today = new Date().toISOString().slice(0, 10);

  let state = await loadGamificationState();

  // Update streak
  if (state.lastActiveDate !== today) {
    state = updateStreak(state, today);
  }
  state.lastActiveDate = today;

  // Award points & xp
  const earned = { points: rule.points * times, xp: rule.xp * times };
  state.totalPoints += earned.points;
  state.totalXp += earned.xp;
  state.level = xpToLevel(state.totalXp);

  // Update event counter
  state.totalEvents = {
    ...state.totalEvents,
    [event]: (state.totalEvents[event] ?? 0) + times,
  };

  // Recent activity (keep last 30)
  state.recentActivity = [
    { event, points: earned.points, xp: earned.xp, date: today, label: rule.label },
    ...state.recentActivity,
  ].slice(0, 30);

  // Check achievements
  const { state: finalState, newAchievements } = checkAchievements(state);

  await saveGamificationState(finalState);
  return { state: finalState, newAchievements, earned };
}

export { ACHIEVEMENTS, POINT_RULES, xpToLevel, LEVEL_XP };
