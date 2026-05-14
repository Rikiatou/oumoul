import * as SecureStore from "expo-secure-store";
import { scheduleDateReminder } from "../push-notifications";
import { triggerHaptic } from "../utils/haptics";

const GAMIFICATION_KEY = "oumoul_ultimate_gamification";

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  level: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
  titles: string[];
  powerUps: string[];
  completedChallenges: string[];
  socialStats: {
    shares: number;
    helpsGiven: number;
    helpsReceived: number;
    communityRank: number;
  };
  preferences: {
    notifications: boolean;
    sounds: boolean;
    haptics: boolean;
    theme: "light" | "dark" | "auto";
  };
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: "daily" | "weekly" | "monthly" | "special" | "community";
  difficulty: "easy" | "medium" | "hard" | "legendary";
  requirements: {
    type: "count" | "streak" | "completion" | "time" | "social";
    value: number;
    metric: string;
  };
  rewards: {
    points: number;
    experience: number;
    badge?: string;
    title?: string;
    powerUp?: string;
  };
  timeLimit?: number; // heures
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: "prayer" | "quran" | "dhikr" | "charity" | "streak" | "social" | "special";
  rarity: "common" | "rare" | "epic" | "legendary";
  points: number;
  icon: string;
  requirements: {
    type: string;
    value: number;
    metric: string;
  };
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface PowerUp {
  id: string;
  name: string;
  description: string;
  type: "boost" | "shield" | "magnet" | "time" | "social";
  duration: number; // minutes
  effect: {
    type: string;
    value: number;
    metric: string;
  };
  cost: number;
  icon: string;
  uses: number;
  maxUses: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatar: string;
  level: number;
  points: number;
  badges: number;
  streak: number;
  specialTitle?: string;
}

export interface GamificationState {
  profile: UserProfile;
  activeQuests: Quest[];
  availableQuests: Quest[];
  achievements: Achievement[];
  powerUps: PowerUp[];
  activePowerUps: Array<{
    id: string;
    endTime: string;
    remainingUses: number;
  }>;
  leaderboard: LeaderboardEntry[];
  events: {
    daily: string;
    weekly: string;
    monthly: string;
    special: string[];
  };
}

const ACHIEVEMENTS: Achievement[] = [
  // 🕌 Prière Achievements
  {
    id: "prayer_warrior",
    title: "Guerrier des Prières",
    description: "Complétez toutes les prières pendant 30 jours consécutifs",
    category: "prayer",
    rarity: "epic",
    points: 500,
    icon: "sunny",
    requirements: { type: "streak", value: 30, metric: "all_prayers_30_days" },
  },
  {
    id: "fajr_champion",
    title: "Champion du Fajr",
    description: "Priez Fajr à l'heure pendant 100 jours",
    category: "prayer",
    rarity: "legendary",
    points: 1000,
    icon: "sunny-outline",
    requirements: { type: "streak", value: 100, metric: "fajr_on_time" },
  },
  {
    id: "mosque_regular",
    title: "Habitué de la Mosquée",
    description: "Assistez à la prière à la mosquée 50 fois",
    category: "prayer",
    rarity: "rare",
    points: 250,
    icon: "business",
    requirements: { type: "count", value: 50, metric: "mosque_visits" },
  },

  // 📖 Coran Achievements
  {
    id: "quran_hafiz",
    title: "Hafiz du Coran",
    description: "Mémorisez le Coran entier",
    category: "quran",
    rarity: "legendary",
    points: 5000,
    icon: "book",
    requirements: { type: "completion", value: 6236, metric: "quran_memorized" },
  },
  {
    id: "quran_reader",
    title: "Lecteur Assidu",
    description: "Lisez 1000 pages du Coran",
    category: "quran",
    rarity: "epic",
    points: 750,
    icon: "book-outline",
    requirements: { type: "count", value: 1000, metric: "quran_pages_read" },
  },
  {
    id: "quran_explorer",
    title: "Explorateur du Coran",
    description: "Lisez au moins 1 verset de chaque sourate",
    category: "quran",
    rarity: "rare",
    points: 300,
    icon: "compass",
    requirements: { type: "completion", value: 114, metric: "surahs_explored" },
  },

  // 📿 Dhikr Achievements
  {
    id: "dhikr_master",
    title: "Maître du Dhikr",
    description: "Complétez le dhikr du matin et du soir pendant 1 an",
    category: "dhikr",
    rarity: "legendary",
    points: 2000,
    icon: "radio",
    requirements: { type: "streak", value: 365, metric: "daily_dhikr_year" },
  },
  {
    id: "tasbih_champion",
    title: "Champion du Tasbih",
    description: "Répétez 33 SubhanAllah 1000 fois en une semaine",
    category: "dhikr",
    rarity: "epic",
    points: 400,
    icon: "radio-button-on",
    requirements: { type: "count", value: 1000, metric: "subhanallah_1000" },
  },

  // 🤲 Charité Achievements
  {
    id: "charity_angel",
    title: "Ange de la Charité",
    description: "Faites 100 actes de charité",
    category: "charity",
    rarity: "epic",
    points: 600,
    icon: "heart",
    requirements: { type: "count", value: 100, metric: "charity_acts" },
  },
  {
    id: "generosity_spirit",
    title: "Esprit de Générosité",
    description: "Donnez 10% de vos revenus pendant 3 mois",
    category: "charity",
    rarity: "legendary",
    points: 1500,
    icon: "gift",
    requirements: { type: "streak", value: 90, metric: "donation_10_percent_90_days" },
  },

  // 🔥 Streak Achievements
  {
    id: "consistency_king",
    title: "Roi de la Constance",
    description: "Utilisez l'app pendant 365 jours consécutifs",
    category: "streak",
    rarity: "legendary",
    points: 3000,
    icon: "crown",
    requirements: { type: "streak", value: 365, metric: "daily_app_usage_365" },
  },
  {
    id: "ramadan_hero",
    title: "Héros de Ramadan",
    description: "Jeûnez tous les jours de Ramadan pendant 5 ans",
    category: "streak",
    rarity: "legendary",
    points: 2500,
    icon: "moon",
    requirements: { type: "completion", value: 150, metric: "ramadan_5_years" },
  },

  // 👥 Social Achievements
  {
    id: "community_leader",
    title: "Leader Communautaire",
    description: "Aidez 100 personnes dans leur progression spirituelle",
    category: "social",
    rarity: "epic",
    points: 800,
    icon: "people",
    requirements: { type: "count", value: 100, metric: "people_helped" },
  },
  {
    id: "inspiration_source",
    title: "Source d'Inspiration",
    description: "Votre progression est partagée 1000 fois",
    category: "social",
    rarity: "rare",
    points: 400,
    icon: "share-social",
    requirements: { type: "count", value: 1000, metric: "progress_shares" },
  },
];

const POWER_UPS: PowerUp[] = [
  {
    id: "double_points",
    name: "Double Points",
    description: "Gagnez 2x plus de points pendant 30 minutes",
    type: "boost",
    duration: 30,
    effect: { type: "multiplier", value: 2, metric: "points" },
    cost: 100,
    icon: "star",
    uses: 3,
    maxUses: 3,
  },
  {
    id: "streak_protector",
    name: "Protecteur de Streak",
    description: "Protège votre streak contre une journée manquée",
    type: "shield",
    duration: 1440, // 24 heures
    effect: { type: "protection", value: 1, metric: "streak" },
    cost: 200,
    icon: "shield",
    uses: 1,
    maxUses: 1,
  },
  {
    id: "knowledge_magnet",
    name: "Aimant à Connaissance",
    description: "Attirez des hadiths et versets rares",
    type: "magnet",
    duration: 60,
    effect: { type: "attraction", value: 3, metric: "rare_content" },
    cost: 150,
    icon: "magnet",
    uses: 2,
    maxUses: 2,
  },
  {
    id: "time_master",
    name: "Maître du Temps",
    description: "Les quêtes durent 50% moins longtemps",
    type: "time",
    duration: 120,
    effect: { type: "reduction", value: 0.5, metric: "quest_time" },
    cost: 250,
    icon: "time",
    uses: 1,
    maxUses: 1,
  },
  {
    id: "social_boost",
    name: "Boost Social",
    description: "Doublez les récompenses sociales pendant 1 heure",
    type: "social",
    duration: 60,
    effect: { type: "multiplier", value: 2, metric: "social_rewards" },
    cost: 120,
    icon: "people",
    uses: 2,
    maxUses: 2,
  },
];

export async function loadGamificationState(): Promise<GamificationState> {
  try {
    const stored = await SecureStore.getItemAsync(GAMIFICATION_KEY);
    return stored ? JSON.parse(stored) : {
      profile: {
        id: "user_" + Math.random().toString(36).substr(2, 9),
        name: "Utilisateur Oumoul",
        avatar: "default",
        level: 1,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        badges: [],
        titles: [],
        powerUps: [],
        completedChallenges: [],
        socialStats: {
          shares: 0,
          helpsGiven: 0,
          helpsReceived: 0,
          communityRank: 0,
        },
        preferences: {
          notifications: true,
          sounds: true,
          haptics: true,
          theme: "auto",
        },
      },
      activeQuests: [],
      availableQuests: [],
      achievements: ACHIEVEMENTS,
      powerUps: POWER_UPS,
      activePowerUps: [],
      leaderboard: [],
      events: {
        daily: "",
        weekly: "",
        monthly: "",
        special: [],
      },
    };
  } catch {
    return {
      profile: {
        id: "user_" + Math.random().toString(36).substr(2, 9),
        name: "Utilisateur Oumoul",
        avatar: "default",
        level: 1,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        badges: [],
        titles: [],
        powerUps: [],
        completedChallenges: [],
        socialStats: {
          shares: 0,
          helpsGiven: 0,
          helpsReceived: 0,
          communityRank: 0,
        },
        preferences: {
          notifications: true,
          sounds: true,
          haptics: true,
          theme: "auto",
        },
      },
      activeQuests: [],
      availableQuests: [],
      achievements: ACHIEVEMENTS,
      powerUps: POWER_UPS,
      activePowerUps: [],
      leaderboard: [],
      events: {
        daily: "",
        weekly: "",
        monthly: "",
        special: [],
      },
    };
  }
}

export async function saveGamificationState(state: GamificationState): Promise<void> {
  try {
    await SecureStore.setItemAsync(GAMIFICATION_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save gamification state:", error);
  }
}

export async function setupUltimateGamification(): Promise<void> {
  const state = await loadGamificationState();
  
  // 🎯 Génération de Quêtes Dynamiques
  await generateDynamicQuests(state);
  
  // 🎮 Events Spéciaux
  await setupSpecialEvents(state);
  
  // 🏆 Système de Leaderboard
  await updateLeaderboard(state);
  
  // 🎁 Récompenses Automatiques
  await setupAutomaticRewards(state);
}

async function generateDynamicQuests(state: GamificationState): Promise<void> {
  const now = new Date();
  const userLevel = state.profile.level;
  
  // 🌅 Quêtes Quotidiennes
  const dailyQuests = [
    {
      id: `daily_${now.toISOString().split('T')[0]}_1`,
      title: "Prière du Matin",
      description: "Priez Fajr et Dhikr du matin",
      type: "daily" as const,
      difficulty: userLevel < 5 ? "easy" as const : "medium" as const,
      requirements: { type: "completion" as const, value: 2, metric: "fajr_dhikr_morning" },
      rewards: { points: 50, experience: 25 },
      timeLimit: 4,
      isActive: true,
      startDate: now.toISOString(),
      endDate: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `daily_${now.toISOString().split('T')[0]}_2`,
      title: "Lecture Spirituelle",
      description: "Lisez 5 pages du Coran ou 1 hadith",
      type: "daily" as const,
      difficulty: "medium" as const,
      requirements: { type: "count" as const, value: 5, metric: "quran_pages_or_hadith" },
      rewards: { points: 75, experience: 35 },
      timeLimit: 6,
      isActive: true,
      startDate: now.toISOString(),
      endDate: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `daily_${now.toISOString().split('T')[0]}_3`,
      title: "Acte de Bonté",
      description: "Faites un acte de charité ou aidez quelqu'un",
      type: "daily" as const,
      difficulty: "easy" as const,
      requirements: { type: "completion" as const, value: 1, metric: "charity_or_help" },
      rewards: { points: 100, experience: 50 },
      timeLimit: 24,
      isActive: true,
      startDate: now.toISOString(),
      endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
  
  // 🌟 Quêtes Hebdomadaires
  const weeklyQuests = [
    {
      id: `weekly_${Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000))}`,
      title: "Semaine Spirituelle",
      description: "Complétez toutes les prières pendant 7 jours",
      type: "weekly" as const,
      difficulty: "hard" as const,
      requirements: { type: "completion" as const, value: 35, metric: "all_prayers_week" },
      rewards: { points: 500, experience: 200, badge: "weekly_warrior" },
      timeLimit: 168,
      isActive: true,
      startDate: now.toISOString(),
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `weekly_quran_${Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000))}`,
      title: "Marathon Coranique",
      description: "Lisez 50 pages du Coran cette semaine",
      type: "weekly" as const,
      difficulty: "medium" as const,
      requirements: { type: "count" as const, value: 50, metric: "quran_pages_week" },
      rewards: { points: 300, experience: 150 },
      timeLimit: 168,
      isActive: true,
      startDate: now.toISOString(),
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
  
  // 🎮 Quêtes Communautaires
  const communityQuests = [
    {
      id: `community_${Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000))}`,
      title: "Challenge Communautaire",
      description: "Partagez votre progression et aidez 3 personnes",
      type: "community" as const,
      difficulty: "medium" as const,
      requirements: { type: "social" as const, value: 3, metric: "share_and_help" },
      rewards: { points: 200, experience: 100, powerUp: "social_boost" },
      timeLimit: 168,
      isActive: true,
      startDate: now.toISOString(),
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
  
  state.availableQuests = [...dailyQuests, ...weeklyQuests, ...communityQuests];
  await saveGamificationState(state);
}

async function setupSpecialEvents(state: GamificationState): Promise<void> {
  const now = new Date();
  
  // 🌙 Ramadan Special
  const ramadanStart = new Date(2025, 2, 22); // Approximate
  const ramadanEnd = new Date(2025, 3, 20);
  
  if (now >= ramadanStart && now <= ramadanEnd) {
    state.events.special.push("ramadan_2025");
    
    await scheduleDateReminder({
      id: "ramadan_event",
      title: "🌙 Événement Spécial Ramadan",
      body: "Doublez vos points et débloquez des récompenses exclusives !",
      date: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    });
  }
  
  // 🎄 Eid Special
  const eidDates = [new Date(2025, 3, 21), new Date(2025, 6, 20)]; // Approximate
  
  for (const eidDate of eidDates) {
    if (Math.abs(now.getTime() - eidDate.getTime()) < 3 * 24 * 60 * 60 * 1000) {
      state.events.special.push("eid_celebration");
      
      await scheduleDateReminder({
        id: "eid_event",
        title: "🎄 Célébration de l'Aïd",
        body: "Participez aux événements spéciaux et gagnez des bonus !",
        date: eidDate,
      });
    }
  }
  
  // 🏆 Journée Spéciale
  if (now.getDay() === 5) { // Vendredi
    state.events.weekly = "jumuah_special";
    
    await scheduleDateReminder({
      id: "jumuah_event",
      title: "🕌 Jumuah Spécial",
      body: "Bonus double pour les prières et actes de charité",
      date: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });
  }
}

async function updateLeaderboard(state: GamificationState): Promise<void> {
  // Simulation de leaderboard (en réalité, viendrait du backend)
  const mockLeaderboard: LeaderboardEntry[] = [
    {
      rank: 1,
      userId: "leader_1",
      userName: "Abdullah",
      avatar: "avatar_1",
      level: 25,
      points: 8500,
      badges: 15,
      streak: 150,
      specialTitle: "👑 Calife Spirituel",
    },
    {
      rank: 2,
      userId: "leader_2",
      userName: "Fatima",
      avatar: "avatar_2",
      level: 22,
      points: 7200,
      badges: 12,
      streak: 120,
      specialTitle: "🌟 Étoile Montante",
    },
    {
      rank: 3,
      userId: "leader_3",
      userName: "Yusuf",
      avatar: "avatar_3",
      level: 20,
      points: 6500,
      badges: 10,
      streak: 90,
      specialTitle: "🔥 Feu Sacré",
    },
  ];
  
  // Ajouter l'utilisateur au leaderboard
  const userEntry: LeaderboardEntry = {
    rank: 0, // Sera calculé
    userId: state.profile.id,
    userName: state.profile.name,
    avatar: state.profile.avatar,
    level: state.profile.level,
    points: state.profile.totalPoints,
    badges: state.profile.badges.length,
    streak: state.profile.currentStreak,
  };
  
  const allEntries = [...mockLeaderboard, userEntry]
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  
  state.leaderboard = allEntries.slice(0, 100); // Top 100
  await saveGamificationState(state);
}

async function setupAutomaticRewards(state: GamificationState): Promise<void> {
  const now = new Date();
  
  // 🎯 Récompenses de Streak
  if (state.profile.currentStreak > 0 && state.profile.currentStreak % 7 === 0) {
    await scheduleDateReminder({
      id: "streak_reward",
      title: "🔥 Streak Impressionnant !",
      body: `🎉 ${state.profile.currentStreak} jours consécutifs ! Bonus de ${state.profile.currentStreak * 10} points`,
      date: new Date(now.getTime() + 5 * 60 * 1000),
    });
  }
  
  // 🏆 Récompenses de Niveau
  const nextLevelPoints = state.profile.level * 100;
  if (state.profile.totalPoints >= nextLevelPoints && state.profile.totalPoints < (state.profile.level + 1) * 100) {
    await scheduleDateReminder({
      id: "level_up_reward",
      title: "🎉 Niveau Supérieur Atteint !",
      body: `Félicitations ! Vous êtes maintenant niveau ${state.profile.level + 1}`,
      date: new Date(now.getTime() + 5 * 60 * 1000),
    });
  }
  
  // 🎁 Récompenses Sociales
  if (state.profile.socialStats.shares > 0 && state.profile.socialStats.shares % 50 === 0) {
    await scheduleDateReminder({
      id: "social_reward",
      title: "🌟 Influenceur Spirituel !",
      body: `🎉 ${state.profile.socialStats.shares} partages ! Continuez d'inspirer les autres`,
      date: new Date(now.getTime() + 5 * 60 * 1000),
    });
  }
}

export async function completeQuest(questId: string): Promise<GamificationState> {
  const state = await loadGamificationState();
  const quest = state.availableQuests.find(q => q.id === questId);
  
  if (!quest) return state;
  
  // Marquer comme complété
  quest.isActive = false;
  state.profile.completedChallenges.push(questId);
  
  // Donner les récompenses
  state.profile.totalPoints += quest.rewards.points;
  state.profile.level = Math.floor(state.profile.totalPoints / 100) + 1;
  
  if (quest.rewards.badge) {
    state.profile.badges.push(quest.rewards.badge);
  }
  
  if (quest.rewards.title) {
    state.profile.titles.push(quest.rewards.title);
  }
  
  if (quest.rewards.powerUp) {
    state.profile.powerUps.push(quest.rewards.powerUp);
  }
  
  // Vérifier les achievements
  await checkAchievements(state);
  
  await saveGamificationState(state);
  return state;
}

export async function usePowerUp(powerUpId: string): Promise<GamificationState> {
  const state = await loadGamificationState();
  const powerUp = state.powerUps.find(p => p.id === powerUpId);
  
  if (!powerUp || state.profile.totalPoints < powerUp.cost) return state;
  
  // Déduire le coût
  state.profile.totalPoints -= powerUp.cost;
  
  // Ajouter le power-up actif
  const endTime = new Date(Date.now() + powerUp.duration * 60 * 1000).toISOString();
  state.activePowerUps.push({
    id: powerUpId,
    endTime,
    remainingUses: powerUp.uses,
  });
  
  await saveGamificationState(state);
  return state;
}

export async function checkAchievements(state: GamificationState): Promise<void> {
  const unlockedIds = state.achievements.map(a => a.id);
  
  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.includes(achievement.id)) continue;
    
    const isUnlocked = await checkAchievementRequirement(achievement, state);
    
    if (isUnlocked) {
      const unlockedAchievement = {
        ...achievement,
        unlockedAt: new Date().toISOString(),
      };
      
      const existingIndex = state.achievements.findIndex(a => a.id === achievement.id);
      if (existingIndex >= 0) {
        state.achievements[existingIndex] = unlockedAchievement;
      } else {
        state.achievements.push(unlockedAchievement);
      }
      
      // Notification de l'achievement
      await scheduleDateReminder({
        id: `achievement-${achievement.id}`,
        title: `🏆 Nouveau Succès !`,
        body: `${achievement.title} - ${achievement.description}`,
        date: new Date(Date.now() + 2 * 60 * 1000),
      });
    }
  }
}

async function checkAchievementRequirement(achievement: Achievement, state: GamificationState): Promise<boolean> {
  // Logique de vérification des achievements
  switch (achievement.requirements.metric) {
    case "all_prayers_30_days":
      return state.profile.currentStreak >= 30;
    case "fajr_on_time":
      return state.profile.currentStreak >= 100;
    case "mosque_visits":
      return state.profile.socialStats.helpsGiven >= 50;
    case "quran_memorized":
      return false; // Nécessite une vérification spécifique
    case "quran_pages_read":
      return false; // Nécessite une vérification spécifique
    case "surahs_explored":
      return false; // Nécessite une vérification spécifique
    case "daily_dhikr_year":
      return state.profile.currentStreak >= 365;
    case "subhanallah_1000":
      return false; // Nécessite une vérification spécifique
    case "charity_acts":
      return state.profile.socialStats.helpsGiven >= 100;
    case "donation_10_percent_90_days":
      return state.profile.currentStreak >= 90;
    case "daily_app_usage_365":
      return state.profile.currentStreak >= 365;
    case "ramadan_5_years":
      return false; // Nécessite une vérification spécifique
    case "people_helped":
      return state.profile.socialStats.helpsGiven >= 100;
    case "progress_shares":
      return state.profile.socialStats.shares >= 1000;
    default:
      return false;
  }
}

export function generatePersonalizedChallenges(state: GamificationState): Quest[] {
  const userLevel = state.profile.level;
  const weakAreas = [];
  
  // Analyser les faiblesses basées sur les achievements
  if (!state.profile.badges.includes("prayer_warrior")) {
    weakAreas.push("prayer");
  }
  if (!state.profile.badges.includes("quran_hafiz")) {
    weakAreas.push("quran");
  }
  if (!state.profile.badges.includes("dhikr_master")) {
    weakAreas.push("dhikr");
  }
  
  const personalizedQuests: Quest[] = [];
  
  // Générer des quêtes personnalisées
  weakAreas.forEach(area => {
    const quest: Quest = {
      id: `personalized_${area}_${Date.now()}`,
      title: `Défi ${area.charAt(0).toUpperCase() + area.slice(1)}`,
      description: `Améliorez votre ${area} avec ce défi personnalisé`,
      type: "special" as const,
      difficulty: userLevel < 10 ? "medium" as const : "hard" as const,
      requirements: { type: "completion" as const, value: 5, metric: `${area}_improvement` },
      rewards: { points: 150, experience: 75, badge: `${area}_master` },
      timeLimit: 168,
      isActive: true,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    
    personalizedQuests.push(quest);
  });
  
  return personalizedQuests;
}

export function calculatePowerUpEffect(state: GamificationState, effectType: string, metric: string): number {
  let baseValue = 1;
  
  // Vérifier les power-ups actifs
  for (const activePowerUp of state.activePowerUps) {
    const powerUp = state.powerUps.find(p => p.id === activePowerUp.id);
    if (!powerUp) continue;
    
    // Vérifier si le power-up est encore actif
    if (new Date(activePowerUp.endTime) > new Date()) {
      if (powerUp.effect.type === effectType && powerUp.effect.metric === metric) {
        baseValue *= powerUp.effect.value;
      }
    }
  }
  
  return baseValue;
}
