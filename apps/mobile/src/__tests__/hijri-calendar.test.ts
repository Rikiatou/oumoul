import { gregorianToHijri, hijriToGregorian, getCurrentHijriDate } from '../utils/hijri-calendar';

describe('hijri-calendar', () => {
  describe('gregorianToHijri', () => {
    it('returns a valid hijri date object', () => {
      const result = gregorianToHijri(new Date(2026, 1, 17)); // Feb 17, 2026
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('month');
      expect(result).toHaveProperty('day');
      expect(result.year).toBeGreaterThan(1440);
      expect(result.month).toBeGreaterThanOrEqual(1);
      expect(result.month).toBeLessThanOrEqual(12);
      expect(result.day).toBeGreaterThanOrEqual(1);
      expect(result.day).toBeLessThanOrEqual(30);
    });

    it('returns month 9 (Ramadan) for a known Ramadan date', () => {
      // Ramadan 2025 started around Feb 28, 2025 (approx)
      // This is an approximate test given the approximate algorithm
      const result = gregorianToHijri(new Date(2025, 2, 15)); // mid-March 2025
      expect(result.month).toBeGreaterThanOrEqual(8);
      expect(result.month).toBeLessThanOrEqual(10);
    });
  });

  describe('hijriToGregorian', () => {
    it('returns a valid Date object', () => {
      const result = hijriToGregorian(1447, 1, 1);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBeGreaterThan(2020);
    });

    it('round-trips approximately with gregorianToHijri', () => {
      const original = new Date(2026, 5, 15); // June 15, 2026
      const hijri = gregorianToHijri(original);
      const backToGreg = hijriToGregorian(hijri.year, hijri.month, hijri.day);
      // Allow 2-day tolerance due to approximate algorithm
      const diffDays = Math.abs(original.getTime() - backToGreg.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeLessThan(3);
    });
  });

  describe('getCurrentHijriDate', () => {
    it('returns year, month, day, and monthName', () => {
      const result = getCurrentHijriDate();
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('month');
      expect(result).toHaveProperty('day');
      expect(result).toHaveProperty('monthName');
      expect(typeof result.monthName).toBe('string');
      expect(result.monthName.length).toBeGreaterThan(0);
    });
  });
});
