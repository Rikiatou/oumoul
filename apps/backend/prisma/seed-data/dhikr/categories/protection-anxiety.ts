import type { SeedDhikrCategory } from "../types";

export const protectionAnxietyCategory: SeedDhikrCategory = {
  slug: "protection-anxiety",
  order: 3,
  name: {
    fr: "Protection & sérénité",
    en: "Protection & Calm",
    ar: "أذكار التحصين والسكينة",
  },
  description: {
    fr: "Formules contre l’angoisse, pour se confier à Allah et obtenir Sa protection.",
    en: "Supplications for relief from anxiety and for divine protection.",
  },
  entries: [
    {
      slug: "hasbiyallahu",
      order: 1,
      title: {
        fr: "Hasbiyallāhu",
        en: "Hasbiyallahu",
        ar: "حَسْبِيَ اللَّهُ",
      },
      arabicText:
        "حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
      transliteration:
        "Hasbiyallāhu lā ilāha illā Huwa, ʿalayhi tawakkaltu wa Huwa Rabbu l-ʿarshi l-ʿaẓīm.",
      translation: {
        fr: "Allah me suffit; point de divinité à part Lui. Je place ma confiance en Lui; Il est le Seigneur du Trône immense.",
        en: "Allah is sufficient for me, there is no deity except Him. I rely upon Him and He is the Lord of the mighty Throne.",
      },
      source: "Qur’an 9:129; Sunan Abi Dawud 5081",
      recommendedCount: 7,
      note: "À répéter matin et soir contre les soucis.",
    },
    {
      slug: "la-hawla-wa-la-quwwata",
      order: 2,
      title: {
        fr: "La hawla wa lā quwwata",
        en: "La hawla wa la quwwata",
        ar: "لا حول ولا قوة إلا بالله",
      },
      arabicText: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
      transliteration: "Lā ḥawla wa lā quwwata illā bi-llāh.",
      translation: {
        fr: "Il n’y a de force ni de puissance qu’en Allah.",
        en: "There is no power nor might except through Allah.",
      },
      source: "Sahih al-Bukhari 4205; Sahih Muslim 2058",
      recommendedCount: 100,
      note: "Trésor du Paradis, apaise les peines et renforce la confiance.",
    },
    {
      slug: "dua-jonah",
      order: 3,
      title: {
        fr: "Invocation de Yûnus",
        en: "Supplication of Prophet Yunus",
        ar: "دُعَاء ذِي النُّونِ",
      },
      arabicText: "لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
      transliteration: "Lā ilāha illā anta, subḥānaka, innī kuntu mina ẓ-ẓālimīn.",
      translation: {
        fr: "Il n’y a de divinité que Toi, Gloire à Toi! J’ai été parmi les injustes.",
        en: "There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.",
      },
      source: "Sunan al-Tirmidhi 3505; Qur’an 21:87",
      recommendedCount: 3,
    },
  ],
};
