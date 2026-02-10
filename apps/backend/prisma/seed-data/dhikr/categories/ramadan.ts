import type { SeedDhikrCategory } from "../types";

export const ramadanCategory: SeedDhikrCategory = {
  slug: "ramadan",
  order: 5,
  name: {
    fr: "Ramadan & Laylat al-Qadr",
    en: "Ramadan & Laylat al-Qadr",
    ar: "رمضان وليلة القدر",
  },
  description: {
    fr: "Invocations liées au jeûne, à l’iftar et à la quête de la Nuit du Destin.",
    en: "Supplications for fasting, iftar, and seeking Laylat al-Qadr.",
  },
  entries: [
    {
      slug: "dua-before-iftar",
      order: 1,
      title: {
        fr: "Dua avant la rupture",
        en: "Supplication before breaking fast",
        ar: "دعاء قبل الإفطار",
      },
      arabicText:
        "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ",
      transliteration:
        "Dhahaba ẓ-ẓamaʾu wabtallati l-ʿurūqu wa thabata l-ajru inshāʾ Allāh.",
      translation: {
        fr: "La soif est partie, les veines sont humidifiées et la récompense est confirmée, si Allah le veut.",
        en: "The thirst is gone, the veins are moistened, and the reward is assured, if Allah wills.",
      },
      source: "Sunan Abi Dawud 2357",
      recommendedCount: 1,
    },
    {
      slug: "dua-laylatul-qadr",
      order: 2,
      title: {
        fr: "Dua de Laylat al-Qadr",
        en: "Laylat al-Qadr Supplication",
        ar: "دعاء ليلة القدر",
      },
      arabicText:
        "اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
      transliteration:
        "Allāhumma innaka ʿafuwwun tuḥibbu l-ʿafwa faʿfu ʿannī.",
      translation: {
        fr: "Ô Allah, Tu es Pardonneur et Tu aimes le pardon, pardonne-moi.",
        en: "O Allah, You are Pardoning and love to pardon, so pardon me.",
      },
      source: "Jamiʿ at-Tirmidhi 3513",
      recommendedCount: 1,
      note: "À répéter intensément durant les dix dernières nuits de Ramadan.",
    },
    {
      slug: "dua-fasting-intention",
      order: 3,
      title: {
        fr: "Intention du jeûne",
        en: "Intention for fasting",
        ar: "نية الصيام",
      },
      arabicText:
        "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانَ هَذِهِ السَّنَةِ لِلَّهِ تَعَالَى",
      transliteration:
        "Nawaytu ṣawma ghadin ʿan adāʾi farḍi shahri Ramaḍāna hādhihi s-sanati lillāhi taʿālā.",
      translation: {
        fr: "J’ai l’intention de jeûner demain le mois de Ramadan de cette année pour Allah, le Très-Haut.",
        en: "I intend to fast tomorrow in fulfillment of the obligatory fast of Ramadan this year for Allah Most High.",
      },
      source: "Formulation d’intention – écoles juridiques",
      recommendedCount: 1,
    },
  ],
};
