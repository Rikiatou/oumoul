import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "oumoul_smart_iman_program";

export interface SmartImanTask {
  id: string;
  title: string;
  category: "prayer" | "quran" | "dhikr" | "charity" | "learning" | "health";
  points: number;
  difficulty: "easy" | "medium" | "hard";
  timeEstimate: number; // minutes
  prerequisites?: string[];
  adaptive: boolean; // Can be adjusted based on user performance
}

export interface UserPerformance {
  taskId: string;
  completedAt: string;
  timeSpent: number; // minutes
  difficulty: "too_easy" | "just_right" | "too_hard";
  quality: "poor" | "good" | "excellent";
}

export interface SmartImanProfile {
  level: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  preferredTimes: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
  weakAreas: string[];
  strongAreas: string[];
  lastActiveDate: string;
  performance: UserPerformance[];
}

const SMART_TASKS: SmartImanTask[] = [
  // 🕌 PRIÈRES
  { id: "fajr_on_time", title: "Fajr à l'heure", category: "prayer", points: 15, difficulty: "medium", timeEstimate: 5, adaptive: true },
  { id: "all_prayers", title: "Toutes les 5 prières", category: "prayer", points: 50, difficulty: "hard", timeEstimate: 30, prerequisites: ["fajr_on_time"], adaptive: true },
  { id: "sunnah_prayers", title: "Prière Sunnah (2+4)", category: "prayer", points: 20, difficulty: "medium", timeEstimate: 10, adaptive: true },
  
  // 📖 CORAN
  { id: "quran_verse", title: "1 verset avec tafsir", category: "quran", points: 5, difficulty: "easy", timeEstimate: 5, adaptive: true },
  { id: "quran_page", title: "1 page du Coran", category: "quran", points: 10, difficulty: "medium", timeEstimate: 15, adaptive: true },
  { id: "quran_memorize", title: "Mémoriser 1 verset", category: "quran", points: 15, difficulty: "medium", timeEstimate: 10, adaptive: true },
  
  // 📿 DHIKR
  { id: "morning_dhikr", title: "Dhikr du matin", category: "dhikr", points: 10, difficulty: "easy", timeEstimate: 5, adaptive: true },
  { id: "evening_dhikr", title: "Dhikr du soir", category: "dhikr", points: 10, difficulty: "easy", timeEstimate: 5, adaptive: true },
  { id: "tasbih_100", title: "100 SubhanAllah", category: "dhikr", points: 8, difficulty: "easy", timeEstimate: 5, adaptive: true },
  
  // 🤲 BIENFAISANCE
  { id: "smile", title: "Sourire à quelqu'un", category: "charity", points: 3, difficulty: "easy", timeEstimate: 1, adaptive: true },
  { id: "help_someone", title: "Aider quelqu'un", category: "charity", points: 8, difficulty: "medium", timeEstimate: 10, adaptive: true },
  { id: "charity_small", title: "Petite aumône", category: "charity", points: 12, difficulty: "medium", timeEstimate: 5, adaptive: true },
  
  // 📚 APPRENTISSAGE
  { id: "hadith_learn", title: "Apprendre 1 hadith", category: "learning", points: 8, difficulty: "medium", timeEstimate: 10, adaptive: true },
  { id: "dua_memorize", title: "Mémoriser 1 doua", category: "learning", points: 6, difficulty: "easy", timeEstimate: 5, adaptive: true },
  { id: "islamic_video", title: "Vidéo éducative (10min)", category: "learning", points: 5, difficulty: "easy", timeEstimate: 10, adaptive: true },
  
  // 💪 SANTÉ
  { id: "healthy_breakfast", title: "Petit-déjeuner sain", category: "health", points: 4, difficulty: "easy", timeEstimate: 15, adaptive: true },
  { id: "sleep_early", title: "Dormir avant 23h", category: "health", points: 6, difficulty: "medium", timeEstimate: 480, adaptive: true },
];

export async function loadSmartImanProfile(): Promise<SmartImanProfile> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {
      level: 1,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      preferredTimes: {
        morning: true,
        afternoon: false,
        evening: true,
      },
      weakAreas: [],
      strongAreas: [],
      lastActiveDate: "",
      performance: [],
    };
  } catch {
    return {
      level: 1,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      preferredTimes: {
        morning: true,
        afternoon: false,
        evening: true,
      },
      weakAreas: [],
      strongAreas: [],
      lastActiveDate: "",
      performance: [],
    };
  }
}

export async function saveSmartImanProfile(profile: SmartImanProfile): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Failed to save smart Iman profile:", error);
  }
}

export function generateDailyTasks(profile: SmartImanProfile): SmartImanTask[] {
  const now = new Date();
  const hour = now.getHours();
  const isMorning = hour >= 5 && hour < 12;
  const isEvening = hour >= 17 && hour < 21;
  
  // Filter tasks based on time preferences
  let availableTasks = SMART_TASKS.filter(task => {
    if (isMorning && !profile.preferredTimes.morning) return false;
    if (hour >= 12 && hour < 17 && !profile.preferredTimes.afternoon) return false;
    if (isEvening && !profile.preferredTimes.evening) return false;
    return true;
  });
  
  // Prioritize weak areas
  if (profile.weakAreas.length > 0) {
    const weakAreaTasks = availableTasks.filter(task => 
      profile.weakAreas.includes(task.category)
    );
    if (weakAreaTasks.length > 0) {
      availableTasks = [...weakAreaTasks, ...availableTasks.filter(task => 
        !profile.weakAreas.includes(task.category)
      )];
    }
  }
  
  // Adjust difficulty based on level
  const maxDifficulty = profile.level <= 3 ? "easy" : profile.level <= 7 ? "medium" : "hard";
  availableTasks = availableTasks.filter(task => {
    if (maxDifficulty === "easy") return task.difficulty === "easy";
    if (maxDifficulty === "medium") return task.difficulty !== "hard";
    return true;
  });
  
  // Select 3-5 tasks for the day
  const dailyTasks = availableTasks.slice(0, Math.min(5, Math.max(3, Math.floor(profile.level / 2))));
  
  return dailyTasks;
}

export async function completeSmartTask(taskId: string, timeSpent: number, quality: "poor" | "good" | "excellent"): Promise<SmartImanProfile> {
  const profile = await loadSmartImanProfile();
  const task = SMART_TASKS.find(t => t.id === taskId);
  if (!task) return profile;
  
  const today = new Date().toISOString().split('T')[0];
  
  // Update streak
  if (profile.lastActiveDate !== today) {
    profile.currentStreak = 0;
  }
  profile.currentStreak++;
  profile.lastActiveDate = today;
  if (profile.currentStreak > profile.longestStreak) {
    profile.longestStreak = profile.currentStreak;
  }
  
  // Add performance record
  const performance: UserPerformance = {
    taskId,
    completedAt: new Date().toISOString(),
    timeSpent,
    difficulty: timeSpent > task.timeEstimate * 1.5 ? "too_easy" : 
                 timeSpent < task.timeEstimate * 0.5 ? "too_hard" : "just_right",
    quality,
  };
  profile.performance.push(performance);
  
  // Update points and level
  profile.totalPoints += task.points;
  profile.level = Math.floor(profile.totalPoints / 100) + 1;
  
  // Update weak/strong areas
  const recentPerformance = profile.performance.slice(-10);
  const categoryPerformance = recentPerformance.filter(p => 
    SMART_TASKS.find(t => t.id === p.taskId)?.category === task.category
  );
  
  if (categoryPerformance.length >= 3) {
    const avgQuality = categoryPerformance.reduce((sum, p) => 
      sum + (p.quality === "excellent" ? 3 : p.quality === "good" ? 2 : 1), 0
    ) / categoryPerformance.length;
    
    if (avgQuality >= 2.5) {
      profile.strongAreas = [...new Set([...profile.strongAreas, task.category])];
      profile.weakAreas = profile.weakAreas.filter(area => area !== task.category);
    } else if (avgQuality <= 1.5) {
      profile.weakAreas = [...new Set([...profile.weakAreas, task.category])];
      profile.strongAreas = profile.strongAreas.filter(area => area !== task.category);
    }
  }
  
  await saveSmartImanProfile(profile);
  return profile;
}

export function getSmartImanTasks(): SmartImanTask[] {
  return SMART_TASKS;
}

export function calculateSmartImanScore(profile: SmartImanProfile): {
  totalScore: number;
  levelProgress: number;
  streakBonus: number;
  categoryMastery: Record<string, number>;
} {
  const levelProgress = profile.totalPoints % 100;
  const streakBonus = profile.currentStreak * 5;
  
  const categoryMastery: Record<string, number> = {};
  const categories = ["prayer", "quran", "dhikr", "charity", "learning", "health"];
  
  categories.forEach(category => {
    const categoryTasks = profile.performance.filter(p => 
      SMART_TASKS.find(t => t.id === p.taskId)?.category === category
    );
    if (categoryTasks.length > 0) {
      const avgQuality = categoryTasks.reduce((sum, p) => 
        sum + (p.quality === "excellent" ? 3 : p.quality === "good" ? 2 : 1), 0
      ) / categoryTasks.length;
      categoryMastery[category] = Math.round((avgQuality / 3) * 100);
    }
  });
  
  return {
    totalScore: profile.totalPoints + streakBonus,
    levelProgress,
    streakBonus,
    categoryMastery,
  };
}
