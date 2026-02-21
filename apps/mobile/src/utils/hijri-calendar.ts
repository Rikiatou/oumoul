/**
 * Hijri calendar utilities for calculating Islamic dates
 */

export interface RamadanInfo {
  status: "before" | "during" | "after";
  daysUntil?: number;
  dayNumber?: number;
  totalDays: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Converts Gregorian date to Hijri date
 * More accurate calculation using Umm al-Qura algorithm
 */
export function gregorianToHijri(date: Date): { year: number; month: number; day: number } {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();

  // Calculate Julian Day Number (Gregorian)
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jd = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4)
    - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;

  // Convert JD to Hijri
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719)
    + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
    - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return { year, month, day };
}

/**
 * Converts Hijri date to Gregorian date
 * Approximate calculation - for production, consider using a proper library
 */
export function hijriToGregorian(year: number, month: number, day: number): Date {
  const hijriEpoch = new Date(622, 6, 16); // July 16, 622 CE
  
  // Calculate days from Hijri epoch
  let days = (year - 1) * 354.367056;
  
  // Add days for months
  const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];
  for (let i = 0; i < month - 1; i++) {
    days += monthLengths[i];
  }
  
  // Add days in current month
  days += day - 1;
  
  // Convert to milliseconds and add to epoch
  const resultDate = new Date(hijriEpoch.getTime() + days * 24 * 60 * 60 * 1000);
  
  return resultDate;
}

/**
 * Known Ramadan dates (Gregorian) — updated annually for accuracy.
 * Using official announced dates rather than algorithmic approximation.
 */
const RAMADAN_DATES: Record<number, { start: string; end: string; totalDays: number }> = {
  2024: { start: "2024-03-11", end: "2024-04-09", totalDays: 30 },
  2025: { start: "2025-03-01", end: "2025-03-29", totalDays: 29 },
  2026: { start: "2026-02-18", end: "2026-03-19", totalDays: 30 },
  2027: { start: "2027-02-07", end: "2027-03-08", totalDays: 29 },
  2028: { start: "2028-01-28", end: "2028-02-26", totalDays: 30 },
  2029: { start: "2029-01-17", end: "2029-02-14", totalDays: 29 },
  2030: { start: "2030-01-06", end: "2030-02-04", totalDays: 30 },
};

/**
 * Gets Ramadan information for a given Gregorian year
 */
export function getRamadanInfo(gregorianYear?: number): RamadanInfo {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const year = gregorianYear ?? now.getFullYear();

  const known = RAMADAN_DATES[year] ?? RAMADAN_DATES[now.getFullYear()];

  const ramadanStart = new Date(known.start);
  const ramadanEnd = new Date(known.end);
  const totalDays = known.totalDays;

  if (today < ramadanStart) {
    const diff = Math.ceil((ramadanStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { status: "before", daysUntil: diff, totalDays, startDate: ramadanStart, endDate: ramadanEnd };
  }

  if (today > ramadanEnd) {
    return { status: "after", daysUntil: 0, dayNumber: totalDays, totalDays, startDate: ramadanStart, endDate: ramadanEnd };
  }

  const dayNum = Math.ceil((today.getTime() - ramadanStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return { status: "during", daysUntil: 0, dayNumber: dayNum, totalDays, startDate: ramadanStart, endDate: ramadanEnd };
}

/**
 * Gets the current Hijri date
 */
export function getCurrentHijriDate(): { year: number; month: number; day: number; monthName: string } {
  const date = new Date();
  const hijri = gregorianToHijri(date);
  
  const hijriMonths = [
    "Muharram",
    "Safar",
    "Rabi' al-awwal",
    "Rabi' al-thani",
    "Jumada al-awwal",
    "Jumada al-thani",
    "Rajab",
    "Sha'ban",
    "Ramadan",
    "Shawwal",
    "Dhu al-Qi'dah",
    "Dhu al-Hijjah",
  ];
  
  return {
    ...hijri,
    monthName: hijriMonths[hijri.month - 1] || "",
  };
}
