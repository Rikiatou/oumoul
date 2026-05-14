export const appMetadata = {
  name: "Ramadan Nissa Tracker & Imane",
  defaultLocale: "fr",
  supportedLocales: ["fr", "en", "ar"],
  currencyFallbacks: ["XAF", "EUR", "USD"],
  mission: "Accompagner chaque femme musulmane dans son adoration quotidienne partout dans le monde.",
} as const;

export const featureFlags = {
  enableFamilyProfiles: true,
  enableDhikrStreaks: true,
  enableTafsirDownloads: false,
} as const;

export const apiRoutes = {
  backend: {
    base: process.env.OU_MOUL_API_URL ?? "https://backend-production-bdc1.up.railway.app/api",
    auth: "/auth",
    prayer: "/prayer-times",
    fasting: "/fasting",
    reminders: "/reminders",
    dhikr: "/dhikr",
    quran: "/quran",
    hadith: "/hadith",
    tafsir: "/tafsir",
    cycle: "/cycle",
    imaneProgram: "/imane/program",
    ramadan: "/ramadan",
    hijri: "/hijri",
    prayerTracking: "/prayer-log",
    quranAudio: "/quran-audio",
    allahNames: "/allah-names",
    mosqueFinder: "/mosques",
    hifz: "/hifz",
    prayerLog: "/prayer-log",
  },
} as const;
