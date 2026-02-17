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
 * Approximate calculation - for production, consider using a proper library
 */
export function gregorianToHijri(date: Date): { year: number; month: number; day: number } {
  // Using approximate conversion (354.367056 days per Hijri year)
  const hijriEpoch = new Date(622, 6, 16); // July 16, 622 CE
  const diffDays = Math.floor((date.getTime() - hijriEpoch.getTime()) / (1000 * 60 * 60 * 24));
  
  const hijriYear = Math.floor(diffDays / 354.367056) + 1;
  const remainingDays = diffDays % 354.367056;
  
  // Hijri months (approximate lengths)
  const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30]; // Last month can be 30 in leap years
  
  let hijriMonth = 0;
  let dayOfYear = remainingDays;
  
  for (let i = 0; i < monthLengths.length; i++) {
    if (dayOfYear < monthLengths[i]) {
      hijriMonth = i + 1;
      break;
    }
    dayOfYear -= monthLengths[i];
  }
  
  const hijriDay = Math.floor(dayOfYear) + 1;
  
  return { year: hijriYear, month: hijriMonth, day: hijriDay };
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
 * Gets Ramadan information for a given Gregorian year
 * Ramadan is the 9th month of the Hijri calendar
 */
export function getRamadanInfo(gregorianYear: number): RamadanInfo {
  // Find the start of Ramadan in the given Gregorian year
  // Ramadan is month 9 in Hijri calendar
  let hijriYear = gregorianYear - 622; // Rough estimate
  hijriYear = Math.floor(hijriYear * 365.25 / 354.367056) + 1;
  
  // Try to find Ramadan in this year or the next
  let ramadanStart = hijriToGregorian(hijriYear, 9, 1);
  
  // If it's in the wrong year, adjust
  if (ramadanStart.getFullYear() < gregorianYear - 1) {
    hijriYear++;
    ramadanStart = hijriToGregorian(hijriYear, 9, 1);
  } else if (ramadanStart.getFullYear() > gregorianYear + 1) {
    hijriYear--;
    ramadanStart = hijriToGregorian(hijriYear, 9, 1);
  }
  
  // Ramadan lasts 29-30 days (typically 30)
  const ramadanEnd = new Date(ramadanStart);
  ramadanEnd.setDate(ramadanEnd.getDate() + 29); // 30 days total (inclusive)
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (today < ramadanStart) {
    const diff = Math.ceil((ramadanStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      status: "before",
      daysUntil: diff,
      totalDays: 30,
      startDate: ramadanStart,
      endDate: ramadanEnd,
    };
  }
  
  if (today > ramadanEnd) {
    return {
      status: "after",
      daysUntil: 0,
      dayNumber: 30,
      totalDays: 30,
      startDate: ramadanStart,
      endDate: ramadanEnd,
    };
  }
  
  const dayNum = Math.ceil((today.getTime() - ramadanStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return {
    status: "during",
    daysUntil: 0,
    dayNumber: dayNum,
    totalDays: 30,
    startDate: ramadanStart,
    endDate: ramadanEnd,
  };
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
