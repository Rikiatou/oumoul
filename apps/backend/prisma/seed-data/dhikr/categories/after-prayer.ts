import type { SeedDhikrCategory } from "../types";

export const afterPrayerCategory: SeedDhikrCategory = {
  slug: "after-prayer",
  order: 2,
  name: {
    fr: "Après la prière",
    en: "After Salah",
    ar: "أذكار بعد الصلاة",
  },
  description: {
    fr: "Invocations authentiques à répéter après chaque prière obligatoire.",
    en: "Authentic adhkar to recite after every obligatory prayer.",
  },
  entries: [
    {
      slug: "tasbih-fatimah",
      order: 1,
      title: {
        fr: "Tasbīḥ Fāṭimah",
        en: "Tasbih of Fatimah",
        ar: "تسبيح فاطمة",
      },
      arabicText:
        "سُبْحَانَ اللَّهِ (33) مَرَّةً، الْحَمْدُ لِلَّهِ (33) مَرَّةً، اللَّهُ أَكْبَرُ (34) مَرَّةً",
      transliteration: "Subḥān Allāh (33), al-ḥamdu lillāh (33), Allāhu akbar (34).",
      translation: {
        fr: "\"Gloire à Allah\" 33 fois, \"Louange à Allah\" 33 fois, \"Allah est le Plus Grand\" 34 fois.",
        en: "\"Glory be to Allah\" 33 times, \"All praise is for Allah\" 33 times, \"Allah is the Greatest\" 34 times.",
      },
      source: "Sahih Muslim 2728",
      recommendedCount: 100,
      note: "Tasbīḥ complet recommandé après chaque ṣalāt farḍ.",
    },
    {
      slug: "allahumma-antas-salam",
      order: 2,
      title: {
        fr: "Invocation de clôture",
        en: "Closing Supplication",
        ar: "دُعَاء الانصراف من الصلاة",
      },
      arabicText:
        "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
      transliteration:
        "Allāhumma anta s-salām wa minka s-salām, tabārakta yā dhā l-jalāli wa l-ikrām.",
      translation: {
        fr: "Ô Allah, Tu es la Paix et de Toi vient la paix; Tu es béni, Ô Détenteur de majesté et de générosité.",
        en: "O Allah, You are Peace and from You is peace. Blessed are You, O Possessor of Majesty and Honor.",
      },
      source: "Sahih Muslim 591",
      recommendedCount: 1,
    },
    {
      slug: "astaghfirullah-3",
      order: 3,
      title: {
        fr: "Istighfār après prière",
        en: "Post-Prayer Seeking Forgiveness",
        ar: "الاستغفار بعد الصلاة",
      },
      arabicText: "أَسْتَغْفِرُ اللَّهَ ×٣",
      transliteration: "Astaghfirullāh (à répéter trois fois).",
      translation: {
        fr: "Je demande pardon à Allah (3 fois).",
        en: "I seek Allah’s forgiveness (3 times).",
      },
      source: "Sahih Muslim 591",
      recommendedCount: 3,
    },
  ],
};
