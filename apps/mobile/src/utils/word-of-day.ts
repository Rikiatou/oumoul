import { QURAN_WORDS, QuranWord } from '../data/quran-words';

/**
 * Returns a deterministic word for a given date + offset.
 * Same word every day for every user (no randomness).
 * offset 0 = morning word, 1 = midday word, 2 = evening word
 */
export function getWordOfDay(date: Date = new Date(), offset: number = 0): QuranWord {
  const dayOfYear = getDayOfYear(date);
  const index = (dayOfYear * 3 + offset) % QURAN_WORDS.length;
  return QURAN_WORDS[index];
}

/**
 * Returns 3 words for today (morning, midday, evening)
 */
export function getTodayWords(date: Date = new Date()): [QuranWord, QuranWord, QuranWord] {
  return [
    getWordOfDay(date, 0),
    getWordOfDay(date, 1),
    getWordOfDay(date, 2),
  ];
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}
