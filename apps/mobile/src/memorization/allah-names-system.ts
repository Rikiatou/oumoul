import * as SecureStore from "expo-secure-store";
import { scheduleDateReminder } from "../push-notifications";
import { triggerHaptic } from "../utils/haptics";

const ALLAH_NAMES_KEY = "oumoul_allah_names_progress";

export interface AllahName {
  id: string;
  arabic: string;
  french: string;
  english: string;
  meaning: string;
  benefits: string[];
  category: "mercy" | "power" | "knowledge" | "provision" | "guidance" | "protection";
  difficulty: "easy" | "medium" | "hard";
  mnemonics: string[];
  relatedNames: string[];
}

export interface MemorizationProgress {
  masteredNames: string[];
  currentStreak: number;
  lastReviewDate: string;
  reviewSchedule: Record<string, string>; // nameId -> nextReviewDate
  weakNames: string[];
  strongNames: string[];
  learningMethod: "visual" | "audio" | "kinesthetic" | "mixed";
}

const ALLAH_NAMES: AllahName[] = [
  {
    id: "ar-rahman",
    arabic: "الرَّحْمَٰنُ",
    french: "Le Tout Miséricordieux",
    english: "The Most Merciful",
    meaning: "Celui qui fait miséricorde à toute créature sans exception",
    benefits: ["Développe la compassion", "Rapproche d'Allah", "Purifie le cœur"],
    category: "mercy",
    difficulty: "easy",
    mnemonics: ["RAHMAN = RAHMA (miséricorde)", "Le plus commun dans le Coran"],
    relatedNames: ["ar-rahim", "al-wadud"],
  },
  {
    id: "al-malik",
    arabic: "الْمَالِكُ",
    french: "Le Souverain",
    english: "The King",
    meaning: "Celui qui possède l'absolu pouvoir et autorité sur toute chose",
    benefits: ["Renforce la confiance", "Éloigne la peur", "Développe la soumission"],
    category: "power",
    difficulty: "easy",
    mnemonics: ["MALIK = ROI", "Comme un roi mais parfait"],
    relatedNames: ["al-malik-ul-mulk", "al-qaadir"],
  },
  {
    id: "al-quddus",
    arabic: "الْقُدُّوسُ",
    french: "Le Saint",
    english: "The Holy",
    meaning: "Celui qui est pur de toute imperfection, absolument parfait",
    benefits: ["Purifie les pensées", "Développe la perfection spirituelle", "Éloigne les défauts"],
    category: "power",
    difficulty: "medium",
    mnemonics: ["QUDUS = SAIN/PUR", "Son contraire est impur"],
    relatedNames: ["as-salam", "al-bari"],
  },
  // ... (97 autres noms)
];

const DEFAULT_PROGRESS: MemorizationProgress = {
  masteredNames: [],
  currentStreak: 0,
  lastReviewDate: "",
  reviewSchedule: {},
  weakNames: [],
  strongNames: [],
  learningMethod: "mixed",
};

export async function loadMemorizationProgress(): Promise<MemorizationProgress> {
  try {
    const stored = await SecureStore.getItemAsync(ALLAH_NAMES_KEY);
    if (!stored) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(stored) as Partial<MemorizationProgress>;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      masteredNames: Array.isArray(parsed.masteredNames) ? parsed.masteredNames : [],
      weakNames: Array.isArray(parsed.weakNames) ? parsed.weakNames : [],
      strongNames: Array.isArray(parsed.strongNames) ? parsed.strongNames : [],
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export async function saveMemorizationProgress(progress: MemorizationProgress): Promise<void> {
  try {
    await SecureStore.setItemAsync(ALLAH_NAMES_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error("Failed to save memorization progress:", error);
  }
}

export async function setupIntelligentReminders(): Promise<void> {
  const progress = await loadMemorizationProgress();
  const today = new Date();
  
  // 🎯 Espacement Intelligent (Algorithm Ebbinghaus)
  const spacedReminders = generateSpacedReminders(progress);
  
  for (const reminder of spacedReminders) {
    const name = ALLAH_NAMES.find(n => n.id === reminder.nameId);
    if (!name) continue;
    
    await scheduleDateReminder({
      id: `allah-name-${reminder.nameId}`,
      title: `🌟 Nom d'Allah: ${name.french}`,
      body: `Révisez: ${name.arabic}\n${reminder.mnemonic}`,
      date: reminder.date,
    });
  }
  
  // 🧠 Rappels de Révision Intelligents
  await setupSmartReviewReminders(progress);
}

function generateSpacedReminders(progress: MemorizationProgress): Array<{nameId: string, date: Date, mnemonic: string}> {
  const reminders: Array<{nameId: string, date: Date, mnemonic: string}> = [];
  const now = new Date();
  
  // Algorithm Ebbinghaus simplifié
  const intervals = [1, 3, 7, 14, 30, 60, 120]; // jours
  
  ALLAH_NAMES.forEach((name) => {
    if ((progress.masteredNames ?? []).includes(name.id)) {
      // Déjà maîtrisé - rappels espacés
      const masteryLevel = (progress.strongNames ?? []).includes(name.id) ? 3 : 
                          (progress.weakNames ?? []).includes(name.id) ? 1 : 2;
      
      const interval = intervals[Math.min(masteryLevel, intervals.length - 1)];
      const nextReview = new Date(now);
      nextReview.setDate(now.getDate() + interval);
      
      reminders.push({
        nameId: name.id,
        date: nextReview,
        mnemonic: name.mnemonics[0] || "",
      });
    } else {
      // Pas encore maîtrisé - rappels fréquents
      const baseInterval = name.difficulty === "easy" ? 2 : 
                         name.difficulty === "medium" ? 1 : 0.5;
      
      const nextReview = new Date(now);
      nextReview.setHours(now.getHours() + Math.floor(baseInterval * 24));
      
      reminders.push({
        nameId: name.id,
        date: nextReview,
        mnemonic: name.mnemonics[0] || "",
      });
    }
  });
  
  return reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
}

async function setupSmartReviewReminders(progress: MemorizationProgress): Promise<void> {
  const now = new Date();
  
  // 🌅 Rappel du matin (8h) - Meilleure mémorisation
  const morningReview = new Date(now);
  morningReview.setHours(8, 0, 0, 0);
  if (morningReview <= now) morningReview.setDate(morningReview.getDate() + 1);
  
  await scheduleDateReminder({
    id: "morning-allah-names",
    title: "🌅 Noms d'Allah - Révision Matinale",
    body: "5 minutes pour revoir les noms d'Allah. Le matin c'est idéal !",
    date: morningReview,
  });
  
  // 🌙 Rappel du soir (21h) - Consolidation
  const eveningReview = new Date(now);
  eveningReview.setHours(21, 0, 0, 0);
  if (eveningReview <= now) eveningReview.setDate(eveningReview.getDate() + 1);
  
  await scheduleDateReminder({
    id: "evening-allah-names",
    title: "🌙 Noms d'Allah - Révision Soirée",
    body: "Consolidez votre apprentissage avant de dormir",
    date: eveningReview,
  });
  
  // 🎯 Rappels Contextuels
  await setupContextualReminders();
}

async function setupContextualReminders(): Promise<void> {
  const now = new Date();
  
  // 🕌 Avant la prière - moment spirituel optimal
  const prayerTimes = [5, 13, 16, 18, 20]; // Heures approximatives
  
  for (const hour of prayerTimes) {
    const prayerReminder = new Date(now);
    prayerReminder.setHours(hour, 0, 0, 0);
    if (prayerReminder <= now) prayerReminder.setDate(prayerReminder.getDate() + 1);
    
    await scheduleDateReminder({
      id: `prayer-allah-names-${hour}`,
      title: "🕌 Noms d'Allah - Avant la prière",
      body: "Connectez-vous avec Allah avant la prière",
      date: prayerReminder,
    });
  }
  
  // 🚗 Pendant les transports - temps mort productif
  const commuteTimes = [8, 12, 18]; // Matin, midi, soir
  
  for (const hour of commuteTimes) {
    const commuteReminder = new Date(now);
    commuteReminder.setHours(hour, 30, 0, 0); // 30 minutes après l'heure
    if (commuteReminder <= now) commuteReminder.setDate(commuteReminder.getDate() + 1);
    
    await scheduleDateReminder({
      id: `commute-allah-names-${hour}`,
      title: "🚗 Noms d'Allah - En transport",
      body: "Transformez votre temps de transport en dhikr",
      date: commuteReminder,
    });
  }
}

export async function markNameAsReviewed(nameId: string, difficulty: "easy" | "medium" | "hard"): Promise<MemorizationProgress> {
  const progress = await loadMemorizationProgress();
  const today = new Date().toISOString().split('T')[0];
  
  // Update streak
  if (progress.lastReviewDate !== today) {
    progress.currentStreak = 0;
  }
  progress.currentStreak++;
  progress.lastReviewDate = today;
  
  // Update mastery
  if (!progress.masteredNames.includes(nameId)) {
    progress.masteredNames.push(nameId);
  }
  
  // Update strength based on difficulty
  if (difficulty === "easy") {
    progress.strongNames = [...new Set([...progress.strongNames, nameId])];
    progress.weakNames = progress.weakNames.filter(id => id !== nameId);
  } else if (difficulty === "hard") {
    progress.weakNames = [...new Set([...progress.weakNames, nameId])];
    progress.strongNames = progress.strongNames.filter(id => id !== nameId);
  }
  
  // Update review schedule
  const intervals = [1, 3, 7, 14, 30, 60, 120];
  const masteryLevel = progress.strongNames.includes(nameId) ? 3 : 
                      progress.weakNames.includes(nameId) ? 1 : 2;
  const interval = intervals[Math.min(masteryLevel, intervals.length - 1)];
  
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  progress.reviewSchedule[nameId] = nextReview.toISOString().split('T')[0];
  
  await saveMemorizationProgress(progress);
  return progress;
}

export function generateMnemonicTechniques(name: AllahName): string[] {
  const techniques: string[] = [];
  
  // 🎨 Technique Visuelle
  techniques.push(`🎨 Imaginez ${name.meaning.toLowerCase()} comme une lumière`);
  techniques.push(`🎨 Visualisez "${name.arabic}" écrit en or dans le ciel`);
  
  // 🎵 Technique Auditive
  techniques.push(`🎵 Chantez "${name.arabic}" sur une mélodie simple`);
  techniques.push(`🎵 Répétez "${name.french}" avec un rythme`);
  
  // 🤚 Technique Kinesthésique
  techniques.push(`🤚 Écrivez "${name.arabic}" dans l'air avec votre doigt`);
  techniques.push(`🤚 Associez "${name.french}" à un geste`);
  
  // 🔗 Technique Association
  techniques.push(`🔗 Liez "${name.arabic}" à ${name.benefits[0]}`);
  techniques.push(`🔗 Connectez à ${name.relatedNames[0] || "un concept similaire"}`);
  
  // 📱 Technique Numérique
  techniques.push(`📱 Créez un rappel vocal avec "${name.french}"`);
  techniques.push(`📱 Mettez "${name.arabic}" comme fond d'écran`);
  
  return techniques;
}

export function getDailyMemorizationPlan(): {
  morning: { time: string; names: string[]; technique: string }[];
  afternoon: { time: string; names: string[]; technique: string }[];
  evening: { time: string; names: string[]; technique: string }[];
  night: { time: string; names: string[]; technique: string }[];
} {
  return {
    morning: [
      { time: "08:00", names: ["ar-rahman", "ar-rahim", "al-malik"], technique: "🎨 Visualisation" },
      { time: "09:00", names: ["al-quddus", "as-salam", "al-mumin"], technique: "🎵 Répétition musicale" },
    ],
    afternoon: [
      { time: "13:00", names: ["al-aziz", "al-jabbar", "al-mutakabbir"], technique: "🤚 Écriture gestuelle" },
      { time: "15:00", names: ["al-khaliq", "al-bari", "al-musawwir"], technique: "🔗 Association mentale" },
    ],
    evening: [
      { time: "18:00", names: ["al-ghaffar", "al-qahhar", "al-wahhab"], technique: "📱 Rappel vocal" },
      { time: "20:00", names: ["ar-razzaq", "al-fattah", "al-alim"], technique: "🎨 Visualisation créative" },
    ],
    night: [
      { time: "21:30", names: ["al-wadud", "al-majid", "al-badi"], technique: "🤚 Méditation gestuelle" },
      { time: "22:30", names: ["as-sabur", "al-hafiz", "al-jami"], technique: "🎵 Doux chantonnement" },
    ],
  };
}
