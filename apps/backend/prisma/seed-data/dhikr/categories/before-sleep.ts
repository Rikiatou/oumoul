import type { SeedDhikrCategory } from "../types";

export const beforeSleepCategory: SeedDhikrCategory = {
  slug: "before-sleep",
  order: 4,
  name: {
    fr: "Avant de dormir",
    en: "Before Sleep",
    ar: "أذكار النوم",
  },
  description: {
    fr: "Dhikr pour terminer la journée dans la sérénité et la protection.",
    en: "Evening adhkar for protection and serenity before sleep.",
  },
  entries: [
    {
      slug: "last-two-verses-baqarah",
      order: 1,
      title: {
        fr: "Derniers versets d’al-Baqara",
        en: "Last Verses of al-Baqarah",
        ar: "خواتيم سورة البقرة",
      },
      arabicText:
        "آمَنَ الرَّسُولُ بِمَا أُنْزِلَ إِلَيْهِ مِنْ رَبِّهِ وَالْمُؤْمِنُونَ ... لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ... (البقرة ٢٨٥-٢٨٦)",
      transliteration:
        "Āmana r-rasūlu bimā unzila ilayhi min rabbihī wal-muʾminūn... Lā yukallifu llāhu nafsan illā wusʿahā, lahā mā kasabat wa ʿalayhā mā iktasabat... (al-Baqarah 2:285-286)",
      translation: {
        fr: "Le Messager a cru en ce qui lui a été révélé de la part de son Seigneur, et les croyants de même... Allah n’impose à aucune âme une charge supérieure à sa capacité... (Coran 2:285-286)",
        en: "The Messenger has believed in what was revealed to him from his Lord, and so have the believers... Allah does not burden a soul beyond its capacity... (Qur’an 2:285-286)",
      },
      source: "Sahih al-Bukhari 5009; Sahih Muslim 807",
      recommendedCount: 1,
      note: "Apporte une protection suffisante pour la nuit.",
    },
    {
      slug: "bismika-allahumma-amutu",
      order: 2,
      title: {
        fr: "Invocation du coucher",
        en: "Supplication Before Sleeping",
        ar: "دعاء النوم",
      },
      arabicText: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
      transliteration: "Bismika Allāhumma amūtu wa aḥyā.",
      translation: {
        fr: "C’est en Ton nom, ô Allah, que je meurs et que je vis.",
        en: "In Your name, O Allah, I die and I live.",
      },
      source: "Sahih al-Bukhari 6324",
      recommendedCount: 1,
    },
    {
      slug: "ikhlas-falaq-nas",
      order: 3,
      title: {
        fr: "Protection par les trois sourates",
        en: "Protection with the Three Surahs",
        ar: "المعوذات",
      },
      arabicText: "قُلْ هُوَ اللَّهُ أَحَدٌ … قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ … قُلْ أَعُوذُ بِرَبِّ النَّاسِ",
      transliteration:
        "Qul huwa Allāhu aḥad... Qul aʿūdhu birabbi l-falaq... Qul aʿūdhu birabbi n-nās (chaque sourate récitée trois fois).",
      translation: {
        fr: "Récite les sourates al-Ikhlās, al-Falaq et an-Nās (3 fois chacune) pour la protection nocturne.",
        en: "Recite Surah al-Ikhlas, al-Falaq, and an-Nas (3 times each) for nightly protection.",
      },
      source: "Sunan Abi Dawud 5056; Jamiʿ at-Tirmidhi 3575",
      recommendedCount: 3,
      note: "Passer les mains sur le corps après chaque série, comme faisait le Prophète ﷺ.",
    },
  ],
};
