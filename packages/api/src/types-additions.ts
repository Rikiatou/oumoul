// Additional types for new features

// Prayer Tracking
export interface PrayerLog {
  id: string;
  userId: string;
  date: string; // ISO date
  fajr: PrayerStatus;
  dhuhr: PrayerStatus;
  asr: PrayerStatus;
  maghrib: PrayerStatus;
  isha: PrayerStatus;
  sunnah?: {
    beforeFajr: number;
    beforeDhuhr: number;
    beforeAsr: number;
    afterMaghrib: number;
    afterIsha: number;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export enum PrayerStatus {
  PRAYED_ON_TIME = 'prayed_on_time',
  PRAYED_LATE = 'prayed_late',
  MISSED = 'missed',
  EXEMPTED = 'exempted',
}

export interface PrayerStats {
  totalDays: number;
  currentStreak: number;
  longestStreak: number;
  onTimePercentage: number;
  prayerCounts: Record<string, number>;
  monthlyStats: Array<{
    month: string;
    onTimePercentage: number;
    totalPrayed: number;
    totalPossible: number;
  }>;
}

// Quran Audio
export interface Qari {
  id: string;
  name: string;
  arabicName: string;
  style: string;
  relativePath: string;
  hasGapless: boolean;
}

export interface AudioRecitation {
  surahId: number;
  ayahNumber: number;
  qariId: string;
  audioUrl: string;
  duration: number;
  size: number;
}

// 99 Names of Allah
export interface AllahName {
  id: string;
  name: string;
  meaning: string;
  benefit: string;
  transliteration: string;
  audioUrl?: string;
  order: number;
}

export interface NameMemorizationProgress {
  userId: string;
  nameId: string;
  memorized: boolean;
  lastReviewed: string;
  reviewCount: number;
}

// Enhanced Dhikr
export interface DhikrSession {
  id: string;
  userId: string;
  categoryId: string;
  customText?: string;
  targetCount: number;
  currentCount: number;
  completedAt?: string;
  createdAt: string;
  notes?: string;
}

export interface CustomDhikr {
  id: string;
  userId: string;
  text: string;
  translation: string;
  transliteration?: string;
  targetCount: number;
  isActive: boolean;
  createdAt: string;
}

// Mosque Finder
export interface Mosque {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  email?: string;
  prayerTimes?: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    jummah: string;
  };
  facilities: MosqueFacility[];
  rating: number;
  reviewCount: number;
  distance?: number; // Calculated dynamically
  verified: boolean;
}

export enum MosqueFacility {
  PARKING = 'parking',
  WODU = 'wodu',
  SISTERS_AREA = 'sisters_area',
  DISABLED_ACCESS = 'disabled_access',
  KIDS_AREA = 'kids_area',
  FUNERAL_SERVICES = 'funeral_services',
  ISLAMIC_SCHOOL = 'islamic_school',
}

export interface MosqueReview {
  id: string;
  mosqueId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// Common
export interface UpsertPrayerLogPayload {
  date: string;
  fajr: PrayerStatus;
  dhuhr: PrayerStatus;
  asr: PrayerStatus;
  maghrib: PrayerStatus;
  isha: PrayerStatus;
  sunnah?: PrayerLog['sunnah'];
  notes?: string;
}

export interface GetPrayerLogsQuery {
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface CreateCustomDhikrPayload {
  text: string;
  translation: string;
  transliteration?: string;
  targetCount: number;
}

export interface UpdateCustomDhikrPayload {
  text?: string;
  translation?: string;
  transliteration?: string;
  targetCount?: number;
  isActive?: boolean;
}

export interface CreateDhikrSessionPayload {
  categoryId?: string;
  customText?: string;
  targetCount: number;
  notes?: string;
}

export interface UpdateDhikrSessionPayload {
  currentCount: number;
  completedAt?: string;
  notes?: string;
}

export interface GetMosquesQuery {
  latitude?: number;
  longitude?: number;
  radius?: number; // in km
  city?: string;
  facilities?: MosqueFacility[];
  limit?: number;
  offset?: number;
}

export interface CreateMosqueReviewPayload {
  mosqueId: string;
  rating: number;
  comment: string;
}
