import * as SecureStore from "expo-secure-store";
import { scheduleDateReminder } from "../push-notifications";
import { triggerHaptic } from "../utils/haptics";

const QURAN_MASTERY_KEY = "oumoul_quran_mastery";

export interface QuranWord {
  id: string;
  arabic: string;
  root: string;
  french: string;
  english: string;
  meaning: string;
  frequency: number; // Nombre d'occurrences dans le Coran
  surahs: string[]; // Sourates où il apparaît
  category: "divine" | "human" | "nature" | "spiritual" | "action";
  difficulty: "easy" | "medium" | "hard";
  patterns: string[];
  relatedWords: string[];
  memoryHooks: string[];
}

export interface QuranMasteryProgress {
  masteredWords: string[];
  currentLevel: number; // 1-10 levels
  totalWordsMemorized: number;
  streakDays: number;
  lastReviewDate: string;
  reviewSchedule: Record<string, string>;
  weakCategories: string[];
  strongCategories: string[];
  preferredMethod: "visual" | "audio" | "pattern" | "contextual";
  contextualMastery: Record<string, boolean>; // surah -> mastered
}

const QURAN_WORDS: QuranWord[] = [
  {
    id: "allah",
    arabic: "الله",
    root: "أ ل ه",
    french: "Allah",
    english: "Allah",
    meaning: "Le nom propre de Dieu, l'Unique Créateur",
    frequency: 2801,
    surahs: ["Al-Fatiha", "Al-Baqarah", "Al-Imran", "An-Nisa", "Al-Ma'idah"],
    category: "divine",
    difficulty: "easy",
    patterns: ["بسم الله", "الله أكبر", "الحمد لله"],
    relatedWords: ["ar-rahman", "ar-rahim", "al-ilah"],
    memoryHooks: ["Premier mot que l'on apprend", "Répété 2801 fois", "Centre de tout"],
  },
  {
    id: "rahmah",
    arabic: "رَحْمَة",
    root: "ر ح م",
    french: "Miséricorde",
    english: "Mercy",
    meaning: "La compassion, la tendresse, le pardon divin",
    frequency: 333,
    surahs: ["Al-A'raf", "Yusuf", "Ar-Rum", "Az-Zukhruf"],
    category: "divine",
    difficulty: "easy",
    patterns: ["بسم الله الرحمن الرحيم", "ورحمة الله"],
    relatedWords: ["ar-rahman", "ar-rahim"],
    memoryHooks: ["Comme une mère qui pardonne", "Présent dans Basmala", "333 occurrences"],
  },
  {
    id: "iman",
    arabic: "إِيمَان",
    root: "أ م ن",
    french: "Foi",
    english: "Faith",
    meaning: "La conviction profonde du cœur, la croyance sincère",
    frequency: 811,
    surahs: ["Al-Baqarah", "Al-Imran", "An-Nisa", "Al-Ma'idah", "Al-Anfal"],
    category: "spiritual",
    difficulty: "medium",
    patterns: ["الذين آمنوا", "بالإيمان", "كمال الإيمان"],
    relatedWords: ["mu'min", "mu'minat", "aman"],
    memoryHooks: ["6 piliers de l'iman", "811 occurrences", "Foi du cœur"],
  },
  {
    id: "salah",
    arabic: "صَلَاة",
    root: "ص ل و",
    french: "Prière",
    english: "Prayer",
    meaning: "La connexion directe avec Allah, 5 fois par jour",
    frequency: 672,
    surahs: ["Al-Baqarah", "Al-Imran", "An-Nisa", "Al-Ma'idah", "Hud"],
    category: "action",
    difficulty: "easy",
    patterns: ["أقيموا الصلاة", "الصلاة خير من النوم", "صلاة الجماعة"],
    relatedWords: ["musalla", "salli", "yusalli"],
    memoryHooks: ["5 fois par jour", "672 occurrences", "Miraj du Prophète"],
  },
  {
    id: "qur'an",
    arabic: "قُرْآن",
    root: "ق ر أ",
    french: "Coran",
    english: "Quran",
    meaning: "La révélation divine, le livre sacré de l'Islam",
    frequency: 70,
    surahs: ["Al-Baqarah", "Al-Imran", "An-Nisa", "Al-Ma'idah"],
    category: "divine",
    difficulty: "easy",
    patterns: ["القرآن الكريم", "تلاوة القرآن", "حفظ القرآن"],
    relatedWords: ["qara'a", "qur'an", "maqra'"],
    memoryHooks: ["70 occurrences", "Lecture révélation", "6236 versets"],
  },
  // ... (395 autres mots)
];

export async function loadQuranMasteryProgress(): Promise<QuranMasteryProgress> {
  try {
    const stored = await SecureStore.getItemAsync(QURAN_MASTERY_KEY);
    return stored ? JSON.parse(stored) : {
      masteredWords: [],
      currentLevel: 1,
      totalWordsMemorized: 0,
      streakDays: 0,
      lastReviewDate: "",
      reviewSchedule: {},
      weakCategories: [],
      strongCategories: [],
      preferredMethod: "contextual",
      contextualMastery: {},
    };
  } catch {
    return {
      masteredWords: [],
      currentLevel: 1,
      totalWordsMemorized: 0,
      streakDays: 0,
      lastReviewDate: "",
      reviewSchedule: {},
      weakCategories: [],
      strongCategories: [],
      preferredMethod: "contextual",
      contextualMastery: {},
    };
  }
}

export async function saveQuranMasteryProgress(progress: QuranMasteryProgress): Promise<void> {
  try {
    await SecureStore.setItemAsync(QURAN_MASTERY_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error("Failed to save Quran mastery progress:", error);
  }
}

export async function setupQuranMasterySystem(): Promise<void> {
  const progress = await loadQuranMasteryProgress();
  
  // 🎯 Système de Mémorisation Contextuelle
  await setupContextualMemorization(progress);
  
  // 🧠 Algorithm Ebbinghaus Avancé
  await setupAdvancedSpacedRepetition(progress);
  
  // 📊 Rappels Intelligents par Catégorie
  await setupCategoryBasedReminders(progress);
  
  // 🎮 Gamification de la Mémorisation
  await setupMemorizationGamification(progress);
}

async function setupContextualMemorization(progress: QuranMasteryProgress): Promise<void> {
  const now = new Date();
  
  // 🕌 Avant chaque prière - mots contextuels
  const prayerContexts = [
    { time: 5, words: ["allah", "rahmah", "salah"], context: "Fajr" },
    { time: 13, words: ["allah", "rahmah", "iman"], context: "Dhuhr" },
    { time: 16, words: ["allah", "salah", "iman"], context: "Asr" },
    { time: 18, words: ["allah", "rahmah", "salah"], context: "Maghrib" },
    { time: 20, words: ["allah", "rahmah", "iman"], context: "Isha" },
  ];
  
  for (const prayer of prayerContexts) {
    const prayerReminder = new Date(now);
    prayerReminder.setHours(prayer.time, -15, 0, 0); // 15 min avant
    if (prayerReminder <= now) prayerReminder.setDate(prayerReminder.getDate() + 1);
    
    await scheduleDateReminder({
      id: `quran-context-${prayer.context}`,
      title: `🕌 Mots Coraniques - ${prayer.context}`,
      body: `Révisez: ${prayer.words.join(", ")} avant la prière`,
      date: prayerReminder,
    });
  }
  
  // 📖 Pendant la lecture du Coran
  const quranReadingTimes = [8, 14, 19]; // Matin, après-midi, soir
  
  for (const time of quranReadingTimes) {
    const readingReminder = new Date(now);
    readingReminder.setHours(time, 0, 0, 0);
    if (readingReminder <= now) readingReminder.setDate(readingReminder.getDate() + 1);
    
    await scheduleDateReminder({
      id: `quran-reading-${time}`,
      title: "📖 Mots Coraniques - Lecture",
      body: "Apprenez de nouveaux mots pendant votre lecture",
      date: readingReminder,
    });
  }
  
  // 🚗 Pendant les transports
  const commuteTimes = [8, 12, 18];
  
  for (const time of commuteTimes) {
    const commuteReminder = new Date(now);
    commuteReminder.setHours(time, 30, 0, 0);
    if (commuteReminder <= now) commuteReminder.setDate(commuteReminder.getDate() + 1);
    
    await scheduleDateReminder({
      id: `quran-commute-${time}`,
      title: "🚗 Mots Coraniques - Transport",
      body: "Transformez votre trajet en apprentissage",
      date: commuteReminder,
    });
  }
}

async function setupAdvancedSpacedRepetition(progress: QuranMasteryProgress): Promise<void> {
  const now = new Date();
  
  // Algorithm Ebbinghaus personnalisé
  const intervals = {
    1: [1, 2, 4, 7, 12, 20, 35, 60], // Facile
    2: [1, 3, 6, 10, 17, 28, 45, 75], // Moyen  
    3: [1, 4, 8, 14, 24, 40, 65, 105], // Difficile
  };
  
  QURAN_WORDS.forEach(word => {
    if (!progress.masteredWords.includes(word.id)) {
      // Pas encore maîtrisé - rappels fréquents
      const baseInterval = word.difficulty === "easy" ? 1 : 
                         word.difficulty === "medium" ? 0.5 : 0.25;
      
      const nextReview = new Date(now);
      nextReview.setHours(now.getHours() + Math.floor(baseInterval * 24));
      
      scheduleDateReminder({
        id: `quran-spaced-${word.id}`,
        title: `📚 Mot: ${word.french}`,
        body: `${word.arabic} - ${word.meaning}`,
        date: nextReview,
      }).catch(console.error);
    } else {
      // Déjà maîtrisé - espacement intelligent
      const categoryStrength = progress.strongCategories.includes(word.category) ? 3 :
                           progress.weakCategories.includes(word.category) ? 1 : 2;
      
      const wordInterval = intervals[categoryStrength as keyof typeof intervals];
      const daysSinceMastery = Math.floor((now.getTime() - new Date(progress.lastReviewDate).getTime()) / (1000 * 60 * 60 * 24));
      
      const nextIntervalIndex = wordInterval.findIndex(interval => daysSinceMastery < interval);
      const nextInterval = nextIntervalIndex >= 0 ? wordInterval[nextIntervalIndex] : wordInterval[wordInterval.length - 1];
      
      const nextReview = new Date(now);
      nextReview.setDate(now.getDate() + nextInterval);
      
      scheduleDateReminder({
        id: `quran-spaced-${word.id}`,
        title: `📚 Révision: ${word.french}`,
        body: `${word.arabic} - ${word.meaning}`,
        date: nextReview,
      }).catch(console.error);
    }
  });
}

async function setupCategoryBasedReminders(progress: QuranMasteryProgress): Promise<void> {
  const now = new Date();
  
  // 🎯 Focus sur les catégories faibles
  if (progress.weakCategories.length > 0) {
    const weakCategory = progress.weakCategories[0];
    const weakWords = QURAN_WORDS.filter(word => word.category === weakCategory);
    
    if (weakWords.length > 0) {
      const focusReminder = new Date(now);
      focusReminder.setHours(10, 0, 0, 0); // 10h du matin
      if (focusReminder <= now) focusReminder.setDate(focusReminder.getDate() + 1);
      
      await scheduleDateReminder({
        id: `quran-focus-${weakCategory}`,
        title: `🎯 Focus: ${weakCategory}`,
        body: `Renforcez votre maîtrise des mots ${weakCategory}s`,
        date: focusReminder,
      });
    }
  }
  
  // 🌟 Célébration des catégories fortes
  if (progress.strongCategories.length > 0) {
    const strongCategory = progress.strongCategories[0];
    const strongWords = QURAN_WORDS.filter(word => word.category === strongCategory);
    
    const celebrationReminder = new Date(now);
    celebrationReminder.setHours(19, 0, 0, 0); // 19h
    if (celebrationReminder <= now) celebrationReminder.setDate(celebrationReminder.getDate() + 1);
    
    await scheduleDateReminder({
      id: `quran-celebration-${strongCategory}`,
      title: `🌟 Excellence: ${strongCategory}`,
      body: `Vous maîtrisez les mots ${strongCategory}s ! Continuez ainsi`,
      date: celebrationReminder,
    });
  }
}

async function setupMemorizationGamification(progress: QuranMasteryProgress): Promise<void> {
  const now = new Date();
  
  // 🎮 Défis quotidiens
  const dailyChallenge = new Date(now);
  dailyChallenge.setHours(9, 0, 0, 0); // 9h du matin
  if (dailyChallenge <= now) dailyChallenge.setDate(dailyChallenge.getDate() + 1);
  
  await scheduleDateReminder({
    id: "quran-daily-challenge",
    title: "🎮 Défi Quotidien",
    body: "Apprenez 5 nouveaux mots coraniques aujourd'hui !",
    date: dailyChallenge,
  });
  
  // 🏆 Récompenses hebdomadaires
  const weeklyReward = new Date(now);
  weeklyReward.setDate(now.getDate() + (7 - now.getDay())); // Dimanche
  weeklyReward.setHours(20, 0, 0, 0);
  if (weeklyReward <= now) weeklyReward.setDate(weeklyReward.getDate() + 7);
  
  await scheduleDateReminder({
    id: "quran-weekly-reward",
    title: "🏆 Récompense Hebdomadaire",
    body: `Niveau ${progress.currentLevel} - ${progress.totalWordsMemorized} mots maîtrisés`,
    date: weeklyReward,
  });
}

export async function masterWord(wordId: string, method: string): Promise<QuranMasteryProgress> {
  const progress = await loadQuranMasteryProgress();
  const word = QURAN_WORDS.find(w => w.id === wordId);
  const today = new Date().toISOString().split('T')[0];
  
  if (!word) return progress;
  
  // Update mastery
  if (!progress.masteredWords.includes(wordId)) {
    progress.masteredWords.push(wordId);
    progress.totalWordsMemorized++;
  }
  
  // Update streak
  if (progress.lastReviewDate !== today) {
    progress.streakDays = 0;
  }
  progress.streakDays++;
  progress.lastReviewDate = today;
  
  // Update categories
  if (!progress.strongCategories.includes(word.category)) {
    progress.strongCategories.push(word.category);
  }
  progress.weakCategories = progress.weakCategories.filter(cat => cat !== word.category);
  
  // Update level
  const wordsPerLevel = [10, 25, 50, 100, 200, 300, 400, 500, 600, 800];
  const currentLevelIndex = wordsPerLevel.findIndex(count => progress.totalWordsMemorized < count);
  progress.currentLevel = currentLevelIndex >= 0 ? currentLevelIndex + 1 : 10;
  
  // Update preferred method
  if (method && !["visual", "audio", "pattern", "contextual"].includes(progress.preferredMethod)) {
    progress.preferredMethod = method as any;
  }
  
  await saveQuranMasteryProgress(progress);
  return progress;
}

export function generateMemoryTechniques(word: QuranWord): string[] {
  const techniques: string[] = [];
  
  // 🎨 Technique Visuelle Avancée
  techniques.push(`🎨 Imaginez "${word.meaning}" comme une scène vivante`);
  techniques.push(`🎨 Visualisez les lettres de "${word.arabic}" en couleurs`);
  techniques.push(`🎨 Créez une histoire avec "${word.french}"`);
  
  // 🎵 Technique Auditive
  techniques.push(`🎵 Chantez "${word.arabic}" sur une mélodie simple`);
  techniques.push(`🎵 Répétez "${word.french}" avec un rythme 3x`);
  techniques.push(`🎵 Enregistrez-vous disant "${word.meaning}"`);
  
  // 🤚 Technique Kinesthésique
  techniques.push(`🤚 Écrivez "${word.arabic}" dans l'air avec les deux mains`);
  techniques.push(`🤚 Associez "${word.french}" à un geste symbolique`);
  techniques.push(`🤚 Marchez en répétant "${word.arabic}"`);
  
  // 🔗 Technique des Racines
  techniques.push(`🔗 Racine: ${word.root} - explorez les mots apparentés`);
  techniques.push(`🔗 Connectez à: ${word.relatedWords.join(", ")}`);
  techniques.push(`🔗 Pattern: ${word.patterns[0] || "aucun"}`);
  
  // 📱 Technique Numérique
  techniques.push(`📱 Créez une carte flash avec "${word.arabic}"`);
  techniques.push(`📱 Mettez "${word.french}" comme fond d'écran temporaire`);
  techniques.push(`📱 Utilisez "${word.meaning}" comme mot de passe temporaire`);
  
  // 🧠 Technique Mnémonique
  techniques.push(`🧠 Memory Hook: ${word.memoryHooks[0] || "créez le vôtre"}`);
  techniques.push(`🧠 Association: ${word.frequency}x dans le Coran`);
  techniques.push(`🧠 Contexte: ${word.surahs[0]} et ${word.surahs[1] || "autres"}`);
  
  // 🎭 Technique Émotionnelle
  techniques.push(`🎭 Ressentez l'émotion de "${word.meaning}"`);
  techniques.push(`🎭 Racontez une histoire avec "${word.french}" comme héros`);
  techniques.push(`🎭 Imaginez une situation où "${word.arabic}" est crucial`);
  
  return techniques;
}

export function getPersonalizedLearningPlan(progress: QuranMasteryProgress): {
  daily: { time: string; words: string[]; technique: string; duration: number }[];
  weekly: { day: string; focus: string; words: string[]; challenge: string }[];
  monthly: { month: string; goal: number; celebration: string }[];
} {
  const weakCategories = progress.weakCategories.length > 0 ? progress.weakCategories : ["divine"];
  const currentLevel = progress.currentLevel;
  
  return {
    daily: [
      { time: "08:00", words: ["allah", "rahmah", "iman"], technique: "🎨 Visualisation", duration: 5 },
      { time: "13:00", words: ["salah", "qur'an", "taqwa"], technique: "🎵 Répétition", duration: 3 },
      { time: "18:00", words: ["sabr", "shukr", "dua"], technique: "🤚 Kinesthésique", duration: 4 },
      { time: "21:00", words: ["husn", "khair", "barakah"], technique: "🔗 Racines", duration: 6 },
    ],
    weekly: [
      { day: "Lundi", focus: weakCategories[0], words: ["allah", "rahmah", "iman"], challenge: "Apprendre 5 racines" },
      { day: "Mercredi", focus: "spiritual", words: ["salah", "taqwa", "iman"], challenge: "Créer 10 phrases" },
      { day: "Vendredi", focus: "divine", words: ["qur'an", "rahmah", "hikmah"], challenge: "Mémoriser 3 versets" },
      { day: "Dimanche", focus: "action", words: ["sabr", "shukr", "dua"], challenge: "Pratiquer 1 semaine" },
    ],
    monthly: [
      { month: "Janvier", goal: 50, celebration: "🎉 50 mots maîtrisés ! Niveau 2 atteint" },
      { month: "Février", goal: 100, celebration: "🏆 100 mots maîtrisés ! Niveau 3 atteint" },
      { month: "Mars", goal: 200, celebration: "🌟 200 mots maîtrisés ! Niveau 5 atteint" },
    ],
  };
}
