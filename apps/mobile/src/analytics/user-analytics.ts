import * as SecureStore from "expo-secure-store";

const ANALYTICS_KEY = "oumoul_user_analytics";

export interface UserAnalytics {
  dailyUsage: {
    date: string;
    appOpens: number;
    timeSpent: number; // minutes
    featuresUsed: string[];
    tasksCompleted: number;
    prayersTracked: number;
    quranPagesRead: number;
  }[];
  weeklyPatterns: {
    week: string; // YYYY-WXX
    mostActiveDay: string;
    mostUsedFeature: string;
    totalTasks: number;
    streakDays: number;
  }[];
  achievements: {
    id: string;
    title: string;
    description: string;
    unlockedAt: string;
    category: "prayer" | "quran" | "dhikr" | "charity" | "streak" | "special";
    points: number;
  }[];
  socialFeatures: {
    sharedProgress: number;
    helpedOthers: number;
    receivedHelp: number;
    communityBadges: string[];
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: "prayer" | "quran" | "dhikr" | "charity" | "streak" | "special";
  points: number;
  requirement: {
    type: "count" | "streak" | "completion" | "special";
    value: number;
    metric: string;
  };
  icon: string;
}

const ACHIEVEMENTS: Achievement[] = [
  // 🕌 Prayer Achievements
  {
    id: "prayer_warrior",
    title: "Guerrier des Prières",
    description: "Complétez toutes les prières pendant 7 jours consécutifs",
    category: "prayer",
    points: 50,
    requirement: { type: "streak", value: 7, metric: "all_prayers_7_days" },
    icon: "sunny",
  },
  {
    id: "fajr_champion",
    title: "Champion du Fajr",
    description: "Priez Fajr à l'heure pendant 30 jours",
    category: "prayer",
    points: 100,
    requirement: { type: "streak", value: 30, metric: "fajr_on_time" },
    icon: "sunny-outline",
  },

  // 📖 Quran Achievements
  {
    id: "quran_reader",
    title: "Lecteur du Coran",
    description: "Lisez 100 pages du Coran",
    category: "quran",
    points: 75,
    requirement: { type: "count", value: 100, metric: "quran_pages" },
    icon: "book",
  },
  {
    id: "hafiz_beginner",
    title: "Débutant Hafiz",
    description: "Mémorisez 10 versets",
    category: "quran",
    points: 60,
    requirement: { type: "count", value: 10, metric: "memorized_verses" },
    icon: "brain",
  },

  // 📿 Dhikr Achievements
  {
    id: "dhikr_master",
    title: "Maître du Dhikr",
    description: "Complétez le dhikr du matin et du soir pendant 30 jours",
    category: "dhikr",
    points: 80,
    requirement: { type: "streak", value: 30, metric: "daily_dhikr" },
    icon: "radio",
  },

  // 🤲 Charity Achievements
  {
    id: "charitable_soul",
    title: "Âme Charitable",
    description: "Faites 50 actes de charité",
    category: "charity",
    points: 65,
    requirement: { type: "count", value: 50, metric: "charity_acts" },
    icon: "heart",
  },

  // 🔥 Streak Achievements
  {
    id: "consistency_king",
    title: "Roi de la Constance",
    description: "Utilisez l'app pendant 100 jours consécutifs",
    category: "streak",
    points: 200,
    requirement: { type: "streak", value: 100, metric: "daily_app_usage" },
    icon: "crown",
  },
  {
    id: "ramadan_hero",
    title: "Héros de Ramadan",
    description: "Jeûnez tous les jours de Ramadan",
    category: "special",
    points: 150,
    requirement: { type: "completion", value: 30, metric: "ramadan_complete" },
    icon: "moon",
  },
];

export async function loadUserAnalytics(): Promise<UserAnalytics> {
  try {
    const stored = await SecureStore.getItemAsync(ANALYTICS_KEY);
    return stored ? JSON.parse(stored) : {
      dailyUsage: [],
      weeklyPatterns: [],
      achievements: [],
      socialFeatures: {
        sharedProgress: 0,
        helpedOthers: 0,
        receivedHelp: 0,
        communityBadges: [],
      },
    };
  } catch {
    return {
      dailyUsage: [],
      weeklyPatterns: [],
      achievements: [],
      socialFeatures: {
        sharedProgress: 0,
        helpedOthers: 0,
        receivedHelp: 0,
        communityBadges: [],
      },
    };
  }
}

export async function saveUserAnalytics(analytics: UserAnalytics): Promise<void> {
  try {
    await SecureStore.setItemAsync(ANALYTICS_KEY, JSON.stringify(analytics));
  } catch (error) {
    console.error("Failed to save user analytics:", error);
  }
}

export async function trackDailyUsage(activity: {
  appOpens?: number;
  timeSpent?: number;
  featuresUsed?: string[];
  tasksCompleted?: number;
  prayersTracked?: number;
  quranPagesRead?: number;
}): Promise<void> {
  const analytics = await loadUserAnalytics();
  const today = new Date().toISOString().split('T')[0];
  
  const existingDayIndex = analytics.dailyUsage.findIndex(day => day.date === today);
  const existingDay = existingDayIndex >= 0 ? analytics.dailyUsage[existingDayIndex] : {
    date: today,
    appOpens: 0,
    timeSpent: 0,
    featuresUsed: [],
    tasksCompleted: 0,
    prayersTracked: 0,
    quranPagesRead: 0,
  };

  // Update today's data
  const updatedDay = {
    ...existingDay,
    appOpens: (existingDay.appOpens || 0) + (activity.appOpens || 0),
    timeSpent: (existingDay.timeSpent || 0) + (activity.timeSpent || 0),
    featuresUsed: [...new Set([...existingDay.featuresUsed, ...(activity.featuresUsed || [])])],
    tasksCompleted: (existingDay.tasksCompleted || 0) + (activity.tasksCompleted || 0),
    prayersTracked: (existingDay.prayersTracked || 0) + (activity.prayersTracked || 0),
    quranPagesRead: (existingDay.quranPagesRead || 0) + (activity.quranPagesRead || 0),
  };

  if (existingDayIndex >= 0) {
    analytics.dailyUsage[existingDayIndex] = updatedDay;
  } else {
    analytics.dailyUsage.push(updatedDay);
  }

  // Update weekly patterns
  await updateWeeklyPatterns(analytics);
  
  // Check for new achievements
  await checkAchievements(analytics);

  await saveUserAnalytics(analytics);
}

async function updateWeeklyPatterns(analytics: UserAnalytics): Promise<void> {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekString = `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;

  const last7Days = analytics.dailyUsage.filter(day => {
    const dayDate = new Date(day.date);
    const daysDiff = Math.floor((today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff < 7;
  });

  if (last7Days.length > 0) {
    const mostActiveDay = last7Days.reduce((max, day) => 
      day.timeSpent > max.timeSpent ? day : max
    );

    const featureCounts: Record<string, number> = {};
    last7Days.forEach(day => {
      day.featuresUsed.forEach(feature => {
        featureCounts[feature] = (featureCounts[feature] || 0) + 1;
      });
    });

    const mostUsedFeature = Object.entries(featureCounts).reduce((max, [feature, count]) => 
      count > max.count ? { feature, count } : max, { feature: "", count: 0 });

    const totalTasks = last7Days.reduce((sum, day) => sum + day.tasksCompleted, 0);
    const streakDays = last7Days.filter(day => day.appOpens > 0).length;

    const existingWeekIndex = analytics.weeklyPatterns.findIndex(week => week.week === weekString);
    const weekPattern = {
      week: weekString,
      mostActiveDay: mostActiveDay.date,
      mostUsedFeature: mostUsedFeature.feature,
      totalTasks,
      streakDays,
    };

    if (existingWeekIndex >= 0) {
      analytics.weeklyPatterns[existingWeekIndex] = weekPattern;
    } else {
      analytics.weeklyPatterns.push(weekPattern);
    }
  }
}

async function checkAchievements(analytics: UserAnalytics): Promise<void> {
  const unlockedIds = analytics.achievements.map(a => a.id);
  
  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.includes(achievement.id)) continue;

    const isUnlocked = await checkAchievementRequirement(achievement, analytics);
    
    if (isUnlocked) {
      analytics.achievements.push({
        ...achievement,
        unlockedAt: new Date().toISOString(),
      });
      
      // Trigger notification for new achievement
      await triggerAchievementNotification(achievement);
    }
  }
}

async function checkAchievementRequirement(achievement: Achievement, analytics: UserAnalytics): Promise<boolean> {
  const { requirement } = achievement;
  
  switch (requirement.type) {
    case "count":
      return await checkCountRequirement(requirement.metric, requirement.value, analytics);
    case "streak":
      return await checkStreakRequirement(requirement.metric, requirement.value, analytics);
    case "completion":
      return await checkCompletionRequirement(requirement.metric, requirement.value, analytics);
    case "special":
      return await checkSpecialRequirement(requirement.metric, requirement.value, analytics);
    default:
      return false;
  }
}

async function checkCountRequirement(metric: string, targetValue: number, analytics: UserAnalytics): Promise<boolean> {
  switch (metric) {
    case "quran_pages":
      const totalPages = analytics.dailyUsage.reduce((sum, day) => sum + day.quranPagesRead, 0);
      return totalPages >= targetValue;
    case "memorized_verses":
      // This would need to be tracked separately
      return false;
    case "charity_acts":
      // This would need to be tracked separately
      return false;
    default:
      return false;
  }
}

async function checkStreakRequirement(metric: string, targetValue: number, analytics: UserAnalytics): Promise<boolean> {
  switch (metric) {
    case "all_prayers_7_days":
    case "fajr_on_time":
    case "daily_dhikr":
    case "daily_app_usage":
      // Calculate current streak
      let currentStreak = 0;
      const today = new Date();
      
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateString = checkDate.toISOString().split('T')[0];
        
        const dayData = analytics.dailyUsage.find(day => day.date === dateString);
        if (!dayData || dayData.appOpens === 0) break;
        
        currentStreak++;
      }
      
      return currentStreak >= targetValue;
    default:
      return false;
  }
}

async function checkCompletionRequirement(metric: string, targetValue: number, analytics: UserAnalytics): Promise<boolean> {
  switch (metric) {
    case "ramadan_complete":
      // Check if all Ramadan days are completed
      return false; // Would need Ramadan-specific data
    default:
      return false;
  }
}

async function checkSpecialRequirement(metric: string, targetValue: number, analytics: UserAnalytics): Promise<boolean> {
  // Special achievements with custom logic
  return false;
}

async function triggerAchievementNotification(achievement: Achievement): Promise<void> {
  try {
    const { scheduleDateReminder } = await import("../push-notifications");
    
    await scheduleDateReminder({
      id: `achievement-${achievement.id}`,
      title: `🏆 Nouveau Succès !`,
      body: achievement.title,
      date: new Date(Date.now() + 1000),
    });
  } catch (error) {
    console.warn("Failed to trigger achievement notification:", error);
  }
}

export function generateSmartSuggestions(analytics: UserAnalytics): string[] {
  const suggestions: string[] = [];
  
  // Analyze usage patterns
  const last7Days = analytics.dailyUsage.slice(-7);
  if (last7Days.length === 0) return suggestions;
  
  const avgDailyUsage = last7Days.reduce((sum, day) => sum + day.timeSpent, 0) / last7Days.length;
  
  if (avgDailyUsage < 5) {
    suggestions.push("Essayez d'utiliser l'app 5 minutes par jour pour une meilleure progression");
  }
  
  const mostUsedFeature = analytics.weeklyPatterns[analytics.weeklyPatterns.length - 1]?.mostUsedFeature;
  if (mostUsedFeature === "prayer") {
    suggestions.push("Excellent suivi des prières ! Essayez d'ajouter le dhikr quotidien");
  } else if (mostUsedFeature === "quran") {
    suggestions.push("Bonne lecture du Coran ! N'oubliez pas de tracker vos prières");
  }
  
  const currentStreak = last7Days.filter(day => day.appOpens > 0).length;
  if (currentStreak >= 7) {
    suggestions.push("🔥 Incroyable streak ! Continuez comme ça");
  } else if (currentStreak < 3) {
    suggestions.push("Essayez de maintenir une routine quotidienne pour de meilleurs résultats");
  }
  
  return suggestions;
}

export function getLeaderboardData(analytics: UserAnalytics): {
  rank: number;
  totalUsers: number;
  topUsers: Array<{
    name: string;
    points: number;
    achievements: number;
    streak: number;
  }>;
} {
  // This would connect to a backend service
  // For now, return mock data
  return {
    rank: 15,
    totalUsers: 1000,
    topUsers: [
      { name: "Ahmed", points: 2500, achievements: 25, streak: 120 },
      { name: "Fatima", points: 2300, achievements: 22, streak: 90 },
      { name: "Yusuf", points: 2100, achievements: 20, streak: 60 },
    ],
  };
}
