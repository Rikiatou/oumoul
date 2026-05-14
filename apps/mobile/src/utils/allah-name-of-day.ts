import { ALLAH_NAMES, AllahNameLocal } from '../data/allah-names';

/**
 * Returns a deterministic name of Allah for a given date + offset.
 * Same name every day for every user (no randomness).
 * offset 0 = morning reminder, 1 = evening reminder
 */
export function getAllahNameOfDay(date: Date = new Date(), offset: number = 0): AllahNameLocal {
  const dayOfYear = getDayOfYear(date);
  const index = (dayOfYear * 2 + offset) % ALLAH_NAMES.length;
  return ALLAH_NAMES[index];
}

/**
 * Returns today's name + tomorrow's preview (for memorization motivation)
 */
export function getTodayAllahName(date: Date = new Date()): AllahNameLocal {
  return getAllahNameOfDay(date, 0);
}

/**
 * Returns how many names have been covered so far this year
 */
export function getNamesProgress(date: Date = new Date()): { covered: number; total: number; percent: number } {
  const dayOfYear = getDayOfYear(date);
  const covered = Math.min(dayOfYear, ALLAH_NAMES.length);
  return { covered, total: ALLAH_NAMES.length, percent: Math.round((covered / ALLAH_NAMES.length) * 100) };
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
