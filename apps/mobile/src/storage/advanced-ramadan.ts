import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "oumoul_advanced_ramadan";

export interface RamadanDay {
  date: string; // YYYY-MM-DD
  hijriDay: number;
  fasted: boolean;
  prayersCompleted: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
    tarawih: boolean;
  };
  quranPages: number;
  dhikrCompleted: boolean;
  charity: boolean;
  notes?: string;
  quality: "excellent" | "good" | "fair" | "poor";
}

export interface RamadanPlan {
  year: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  goals: {
    quranPages: number; // Total pages to complete
    charityAmount: number; // Target amount
    weight: number; // Target weight (optional)
    habits: string[]; // Good habits to build
  };
  dailyProgress: RamadanDay[];
  makeupDays: {
    missed: number;
    completed: number;
    plan: string[]; // Dates planned for makeup
  };
}

export interface PostRamadanPlan {
  consistencyGoals: {
    quran: "daily" | "weekly" | "none";
    prayers: "all" | "main" | "none";
    dhikr: "daily" | "weekly" | "none";
    charity: "monthly" | "weekly" | "none";
  };
  maintenanceSchedule: {
    monday: string[];
    wednesday: string[];
    friday: string[];
    sunday: string[];
  };
  followUpDates: string[]; // Dates to check in
  achievements: string[];
}

export async function loadRamadanPlan(): Promise<RamadanPlan | null> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export async function saveRamadanPlan(plan: RamadanPlan): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(plan));
  } catch (error) {
    console.error("Failed to save Ramadan plan:", error);
  }
}

export async function createRamadanPlan(year: number): Promise<RamadanPlan> {
  const plan: RamadanPlan = {
    year,
    startDate: new Date(year, 2, 22).toISOString().split('T')[0], // Approximate Ramadan start
    endDate: new Date(year, 3, 20).toISOString().split('T')[0], // Approximate Ramadan end
    totalDays: 30,
    goals: {
      quranPages: 600, // Complete Quran once
      charityAmount: 10000, // FCFA
      weight: 0, // Optional
      habits: ["Early morning prayers", "Daily Quran", "Evening dhikr", "Healthy eating"],
    },
    dailyProgress: [],
    makeupDays: {
      missed: 0,
      completed: 0,
      plan: [],
    },
  };
  
  await saveRamadanPlan(plan);
  return plan;
}

export async function updateRamadanDay(
  date: string, 
  updates: Partial<Omit<RamadanDay, 'date' | 'hijriDay'>>
): Promise<RamadanPlan> {
  const plan = await loadRamadanPlan();
  if (!plan) throw new Error("No Ramadan plan found");
  
  const existingDayIndex = plan.dailyProgress.findIndex(day => day.date === date);
  const hijriDay = plan.dailyProgress.length + 1;
  
  const updatedDay: RamadanDay = {
    date,
    hijriDay,
    fasted: false,
    prayersCompleted: {
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false,
      tarawih: false,
    },
    quranPages: 0,
    dhikrCompleted: false,
    charity: false,
    quality: "fair",
    ...updates,
  };
  
  if (existingDayIndex >= 0) {
    plan.dailyProgress[existingDayIndex] = updatedDay;
  } else {
    plan.dailyProgress.push(updatedDay);
  }
  
  // Calculate quality score
  const scores = [
    updatedDay.fasted ? 25 : 0,
    Object.values(updatedDay.prayersCompleted).filter(Boolean).length * 10,
    Math.min(updatedDay.quranPages * 2, 20),
    updatedDay.dhikrCompleted ? 10 : 0,
    updatedDay.charity ? 5 : 0,
  ];
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  
  if (totalScore >= 90) updatedDay.quality = "excellent";
  else if (totalScore >= 70) updatedDay.quality = "good";
  else if (totalScore >= 50) updatedDay.quality = "fair";
  else updatedDay.quality = "poor";
  
  await saveRamadanPlan(plan);
  return plan;
}

export async function addMakeupDay(date: string): Promise<RamadanPlan> {
  const plan = await loadRamadanPlan();
  if (!plan) throw new Error("No Ramadan plan found");
  
  plan.makeupDays.missed++;
  plan.makeupDays.plan.push(date);
  
  await saveRamadanPlan(plan);
  return plan;
}

export async function completeMakeupDay(date: string): Promise<RamadanPlan> {
  const plan = await loadRamadanPlan();
  if (!plan) throw new Error("No Ramadan plan found");
  
  plan.makeupDays.completed++;
  plan.makeupDays.plan = plan.makeupDays.plan.filter(d => d !== date);
  
  await saveRamadanPlan(plan);
  return plan;
}

export function generateMakeupPlan(plan: RamadanPlan): string[] {
  const missedDays = plan.makeupDays.missed - plan.makeupDays.completed;
  if (missedDays <= 0) return [];
  
  const today = new Date();
  const plannedDates: string[] = [];
  
  // Schedule makeup days: Mondays and Thursdays (Sunnah)
  let currentDate = new Date(today);
  let daysAdded = 0;
  
  while (daysAdded < missedDays) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    
    // Monday (1) or Thursday (4)
    if (dayOfWeek === 1 || dayOfWeek === 4) {
      plannedDates.push(currentDate.toISOString().split('T')[0]);
      daysAdded++;
    }
  }
  
  return plannedDates;
}

export function createPostRamadanPlan(plan: RamadanPlan): PostRamadanPlan {
  const avgQuality = plan.dailyProgress.reduce((sum, day) => {
    const qualityScore = day.quality === "excellent" ? 4 : 
                         day.quality === "good" ? 3 : 
                         day.quality === "fair" ? 2 : 1;
    return sum + qualityScore;
  }, 0) / plan.dailyProgress.length;
  
  // Set consistency goals based on Ramadan performance
  const consistencyGoals = {
    quran: avgQuality >= 3 ? "daily" as const : avgQuality >= 2 ? "weekly" as const : "none" as const,
    prayers: avgQuality >= 2.5 ? "all" as const : avgQuality >= 1.5 ? "main" as const : "none" as const,
    dhikr: avgQuality >= 2 ? "daily" as const : "weekly" as const,
    charity: avgQuality >= 2 ? "monthly" as const : "weekly" as const,
  };
  
  // Create maintenance schedule
  const maintenanceSchedule = {
    monday: ["Quran reading", "Morning dhikr"],
    wednesday: ["Charity act", "Evening prayers"],
    friday: ["Jumuah preparation", "Quran study"],
    sunday: ["Weekly review", "Family time"],
  };
  
  // Set follow-up dates (1 week, 1 month, 3 months after Ramadan)
  const ramadanEnd = new Date(plan.endDate);
  const followUpDates = [
    new Date(ramadanEnd.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date(ramadanEnd.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date(ramadanEnd.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  ];
  
  // Calculate achievements
  const achievements: string[] = [];
  const totalFasts = plan.dailyProgress.filter(day => day.fasted).length;
  const totalQuranPages = plan.dailyProgress.reduce((sum, day) => sum + day.quranPages, 0);
  const perfectDays = plan.dailyProgress.filter(day => day.quality === "excellent").length;
  
  if (totalFasts >= 29) achievements.push("🌙 Ramadan complet");
  if (totalQuranPages >= 600) achievements.push("📖 Coran terminé");
  if (perfectDays >= 20) achievements.push("⭐ Jours d'excellence");
  if (plan.makeupDays.missed <= 2) achievements.push("💪 Constellation");
  
  return {
    consistencyGoals,
    maintenanceSchedule,
    followUpDates,
    achievements,
  };
}

export function getRamadanStats(plan: RamadanPlan): {
  totalDays: number;
  completedDays: number;
  completionRate: number;
  avgQuality: number;
  totalQuranPages: number;
  quranProgress: number;
  makeupProgress: {
    missed: number;
    completed: number;
    remaining: number;
  };
} {
  const totalDays = plan.totalDays;
  const completedDays = plan.dailyProgress.length;
  const completionRate = Math.round((completedDays / totalDays) * 100);
  
  const avgQuality = plan.dailyProgress.reduce((sum, day) => {
    const qualityScore = day.quality === "excellent" ? 4 : 
                         day.quality === "good" ? 3 : 
                         day.quality === "fair" ? 2 : 1;
    return sum + qualityScore;
  }, 0) / completedDays;
  
  const totalQuranPages = plan.dailyProgress.reduce((sum, day) => sum + day.quranPages, 0);
  const quranProgress = Math.round((totalQuranPages / plan.goals.quranPages) * 100);
  
  const makeupProgress = {
    missed: plan.makeupDays.missed,
    completed: plan.makeupDays.completed,
    remaining: plan.makeupDays.missed - plan.makeupDays.completed,
  };
  
  return {
    totalDays,
    completedDays,
    completionRate,
    avgQuality,
    totalQuranPages,
    quranProgress,
    makeupProgress,
  };
}
