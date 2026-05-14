import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "oumoul_iman_program";

export interface ImanProgramProgress {
  completedTasks: string[];
  currentStreak: number;
  lastActiveDate: string;
  totalCompleted: number;
}

export interface ImanProgramTask {
  id: string;
  title: string;
  category: string;
  points: number;
}

const DEFAULT_TASKS: ImanProgramTask[] = [
  { id: "fajr", title: "Prière du Fajr à l'heure", category: "prayer", points: 10 },
  { id: "quran", title: "Lire au moins 1 verset du Coran", category: "quran", points: 5 },
  { id: "dhikr", title: "Faire 33 SubhanAllah", category: "dhikr", points: 3 },
  { id: "charity", title: "Une bonne action (sourire, aide)", category: "charity", points: 2 },
  { id: "gratitude", title: "Remercier Allah avant de dormir", category: "gratitude", points: 5 },
];

export async function loadImanProgramProgress(): Promise<ImanProgramProgress> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {
      completedTasks: [],
      currentStreak: 0,
      lastActiveDate: "",
      totalCompleted: 0,
    };
  } catch {
    return {
      completedTasks: [],
      currentStreak: 0,
      lastActiveDate: "",
      totalCompleted: 0,
    };
  }
}

export async function saveImanProgramProgress(progress: ImanProgramProgress): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error("Failed to save Iman program progress:", error);
  }
}

export async function completeImanTask(taskId: string): Promise<ImanProgramProgress> {
  const progress = await loadImanProgramProgress();
  const today = new Date().toISOString().split('T')[0];
  
  // Reset streak if not active today
  if (progress.lastActiveDate !== today) {
    progress.currentStreak = 0;
  }
  
  // Add task if not already completed today
  if (!progress.completedTasks.includes(taskId)) {
    progress.completedTasks.push(taskId);
    progress.totalCompleted++;
    progress.currentStreak++;
    progress.lastActiveDate = today;
  }
  
  await saveImanProgramProgress(progress);
  return progress;
}

export function getImanProgramTasks(): ImanProgramTask[] {
  return DEFAULT_TASKS;
}

export function calculateImanScore(progress: ImanProgramProgress): number {
  return progress.completedTasks.length * 10; // 10 points per task
}
