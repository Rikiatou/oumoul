export type Locale = 'fr' | 'en' | 'ar';

export interface AuthUser {
  email: string;
  firstName: string;
  lastName: string;
  locale?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface SuccessResponse {
  success: true;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  locale?: Locale;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  user: AuthUser;
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface HadithItem {
  collection: string;
  hadithNumber: string;
  text: string;
  reference?: string;
}

export interface HadithRandomResponse {
  topic: string;
  hadith: HadithItem;
}

export enum CalculationMethodOption {
  MuslimWorldLeague = 'MuslimWorldLeague',
  Egyptian = 'Egyptian',
  Karachi = 'Karachi',
  UmmAlQura = 'UmmAlQura',
  Dubai = 'Dubai',
  Kuwait = 'Kuwait',
  Qatar = 'Qatar',
  Singapore = 'Singapore',
  Turkey = 'Turkey',
  NorthAmerica = 'NorthAmerica',
  Other = 'Other',
}

export enum MadhabOption {
  Shafi = 'Shafi',
  Hanafi = 'Hanafi',
}

export enum HighLatitudeRuleOption {
  MiddleOfTheNight = 'MiddleOfTheNight',
  SeventhOfTheNight = 'SeventhOfTheNight',
  AngleBased = 'AngleBased',
}

export interface PrayerTimesRequest {
  latitude: number;
  longitude: number;
  date?: string;
  method?: CalculationMethodOption;
  madhab?: MadhabOption;
  highLatitudeRule?: HighLatitudeRuleOption;
  fajrAdjustment?: number;
  dhuhrAdjustment?: number;
  asrAdjustment?: number;
  maghribAdjustment?: number;
  ishaAdjustment?: number;
  timeZone?: string;
}

export interface PrayerTimesResponse {
  location: {
    latitude: number;
    longitude: number;
    timeZone: string;
  };
  date: string;
  method: CalculationMethodOption;
  madhab: MadhabOption;
  highLatitudeRule: HighLatitudeRuleOption;
  adjustments: Record<string, number>;
  times: Record<string, string>;
  sunnahTimes: {
    middleOfTheNight: string;
    lastThirdOfTheNight: string;
  };
  currentPrayer: string | null;
  currentPrayerTime: string | null;
  nextPrayer: string | null;
  nextPrayerTime: string | null;
}

export enum FastingLogStatus {
  FASTED = 'FASTED',
  EXEMPTION = 'EXEMPTION',
  MISSED = 'MISSED',
  MADE_UP = 'MADE_UP',
}

export enum MakeupStrategy {
  SixDaysAfterEid = 'SixDaysAfterEid',
  MondaysThursdays = 'MondaysThursdays',
  WhiteDays = 'WhiteDays',
  Custom = 'Custom',
}

export enum PlanEntryStatus {
  Pending = 'Pending',
  Completed = 'Completed',
  Skipped = 'Skipped',
}

export interface FastingLog {
  id: string;
  userId: string;
  date: string;
  status: FastingLogStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFastingLogPayload {
  date: string;
  status: FastingLogStatus;
  notes?: string;
}

export interface UpdateFastingLogPayload {
  date?: string;
  status?: FastingLogStatus;
  notes?: string | null;
}

export interface GetFastingLogsQuery {
  startDate?: string;
  endDate?: string;
}

export interface MakeupPlanEntry {
  id: string;
  scheduledDate: string;
  status: PlanEntryStatus;
  completedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MakeupPlan {
  id: string;
  userId?: string;
  strategy: MakeupStrategy;
  title?: string | null;
  startDate?: string | null;
  targetDays: number;
  completedDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  entries?: MakeupPlanEntry[];
}

export interface CreateMakeupPlanPayload {
  strategy: MakeupStrategy;
  title?: string;
  startDate?: string;
  targetDays: number;
  scheduledDates?: string[];
}

export interface UpdatePlanEntryPayload {
  status: PlanEntryStatus;
  notes?: string;
}

export interface FastingSummary {
  statusCounts: Partial<Record<FastingLogStatus, number>>;
  outstandingMakeupDays: number;
  plans: Array<Pick<MakeupPlan, 'id' | 'strategy' | 'targetDays' | 'completedDays' | 'isActive'>>;
}

export enum ReminderType {
  AfterEid = 'AfterEid',
  WeeklyMonday = 'WeeklyMonday',
  WeeklyThursday = 'WeeklyThursday',
  Monthly = 'Monthly',
  Custom = 'Custom',
  ImaneProgramDaily = 'ImaneProgramDaily',
  RamadanDailyCheckin = 'RamadanDailyCheckin',
}

export interface ReminderPreference {
  id: string;
  userId: string;
  type: ReminderType;
  isEnabled: boolean;
  sendTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateReminderPreferencePayload {
  isEnabled: boolean;
  sendTime?: string;
}

export interface ReminderPreferenceListItem {
  type: ReminderType;
  isEnabled: boolean;
  sendTime: string | null;
}

export interface DhikrCategory {
  id: string;
  name: string;
  description?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  entries: DhikrEntry[];
}

export interface DhikrEntry {
  id: string;
  categoryId: string;
  title: string;
  arabicText: string;
  translit?: string | null;
  translation?: string | null;
  source?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  category?: DhikrCategory;
}

export interface DhikrRecord {
  id: string;
  userId: string;
  entryId: string;
  count: number;
  notedAt: string;
  notes?: string | null;
  entry: DhikrEntry;
}

export interface UpsertDhikrRecordPayload {
  entryId: string;
  count: number;
  notes?: string;
}

export interface UpdateDhikrRecordPayload {
  count?: number;
  notes?: string;
}

export interface TafsirRequest {
  surah: number;
  ayah: number;
  locale?: Locale;
  source?: string;
}

export interface TafsirResponse {
  source: string;
  locale: Locale;
  surah: number;
  ayah: number;
  text: string;
}

export interface RamadanDaySummary {
  date: string;
  fastStatus: FastingLogStatus | null;
  cycleStatus: CycleStatus | null;
  notes: string | null;
}

export interface RamadanSummaryResponse {
  year: number;
  days: RamadanDaySummary[];
}

export interface HijriCalendarDay {
  day: number;
  gregorianDate: string; // YYYY-MM-DD
  hijriDate: string; // YYYY-MM-DD
  hijriMonth: {
    number: number;
    en: string;
  };
}

export interface HijriCalendarResponse {
  year: number;
  month: number;
  city: string;
  country: string;
  days: HijriCalendarDay[];
}

export interface QuranSurahSummary {
  id: number;
  nameArabic: string;
  nameSimple: string;
  nameTranslated: string | null;
  versesCount: number;
  revelationPlace: string;
}

export interface QuranSurahsResponse {
  language: string;
  surahs: QuranSurahSummary[];
}

export interface QuranVerse {
  verseNumber: number;
  textArabic: string;
  textTranslated: string | null;
  textTransliteration?: string | null;
}

export interface QuranSurahVersesResponse {
  chapterId: number;
  language: string;
  verses: QuranVerse[];
}

export interface QuranSurahAudioResponse {
  chapterId: number;
  reciter: string;
  audioUrl: string;
}

export interface QuranAyahTafsirResponse {
  surah: number;
  ayah: number;
  tafsir: {
    text: string;
  };
}

export interface ImaneProgramItems {
  coranTilawa: boolean;
  dhikrMatinSoir: boolean;
  duasPersonnelles: boolean;
  sadaqa: boolean;
  autreBienfait: boolean;
}

export interface ImaneProgramDayResponse {
  date: string; // YYYY-MM-DD
  items: ImaneProgramItems;
}

export interface ImaneProgramMonthDaySummary {
  date: string; // YYYY-MM-DD
  completedCount: number;
}

export interface ImaneProgramMonthResponse {
  year: number;
  month: number; // 1-12
  days: ImaneProgramMonthDaySummary[];
}

export type CycleStatus = 'PURE' | 'MENSES' | 'SPOTTING' | 'POSTPARTUM';

export interface CycleDayDto {
  date: string; // YYYY-MM-DD
  status: CycleStatus;
  notes: string | null;
}

export interface CycleMonthResponse {
  year: number;
  month: number;
  days: CycleDayDto[];
}
