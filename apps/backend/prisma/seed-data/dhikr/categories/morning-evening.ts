import type { SeedDhikrCategory } from "../types";

export const morningEveningCategory: SeedDhikrCategory = {
  slug: "morning-evening",
  order: 1,
  name: {
    fr: "Matin & Soir",
    en: "Morning & Evening",
    ar: "أذكار الصباح والمساء",
  },
  description: {
    fr: "Formules authentiques recommandées au lever du jour et avant le coucher du soleil.",
    en: "Authentic supplications recommended at daybreak and before sunset.",
  },
  entries: [
    {
      slug: "ayat-al-kursi",
      order: 1,
      title: {
        fr: "Ayat al-Kursî",
        en: "Verse of the Throne",
        ar: "آية الكرسي",
      },
      arabicText:
        "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ",
      transliteration:
        "Allāhu lā ilāha illā Huwa l-Ḥayyu l-Qayyūm. Lā taʾkhudhuhu sinatun wa lā nawm. Lahu mā fī s-samāwāti wa mā fī l-arḍ. Man dhā lladhī yashfaʿu ʿindahu illā biʾidhnih. Yaʿlamu mā bayna aydīhim wa mā khalfahum wa lā yuḥīṭūna bi-shayʾin min ʿilmihī illā bimā shāʾ. Wasiʿa kursiyyuhu s-samāwāti wa l-arḍ, wa lā yaʾūduhu ḥifẓuhumā wa Huwa l-ʿAliyyu l-ʿAẓīm.",
      translation: {
        fr: "Allah! Il n’y a point de divinité en dehors de Lui, le Vivant, Celui qui subsiste par Lui-même... (Coran 2:255)",
        en: "Allah! There is no deity except Him, the Ever-Living, the Sustainer of all... (Qur’an 2:255)",
      },
      source: "Sahih al-Bukhari 2311; Sahih Muslim 810",
      recommendedCount: 1,
      note: "À réciter après chaque prière obligatoire et au matin/soir pour la protection.",
    },
    {
      slug: "sayyid-al-istighfar",
      order: 2,
      title: {
        fr: "Sayyid al-Istighfar",
        en: "Master Supplication for Seeking Forgiveness",
        ar: "سَيِّدُ الاسْتِغْفَارِ",
      },
      arabicText:
        "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
      transliteration:
        "Allāhumma anta Rabbī, lā ilāha illā anta, khalaqtanī wa anā ʿabduka, wa anā ʿalā ʿahdika wa waʿdika mā staṭaʿtu. Aʿūdhu bika min sharri mā ṣanaʿtu. Abūʾu laka biniʿmatika ʿalayya wa abūʾu bidhambī faghfir lī fa innahu lā yaghfirudh-dhunūba illā anta.",
      translation: {
        fr: "Ô Allah, Tu es mon Seigneur... pardonne-moi, car nul ne pardonne les péchés en dehors de Toi.",
        en: "O Allah, You are my Lord... forgive me, for none forgives sins except You.",
      },
      source: "Sahih al-Bukhari 6323",
      recommendedCount: 1,
      note: "À réciter matin et soir; celui qui meurt après l’avoir dite entre au Paradis.",
    },
    {
      slug: "subhanallahi-wa-bihamdihi-100",
      order: 3,
      title: {
        fr: "Tasbīḥ du matin",
        en: "Morning Tasbih",
        ar: "تسبيح الصباح",
      },
      arabicText: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
      transliteration: "Subḥān Allāhi wa biḥamdihī.",
      translation: {
        fr: "Gloire et louange à Allah.",
        en: "Glory and praise be to Allah.",
      },
      source: "Sahih Muslim 2691",
      recommendedCount: 100,
      note: "Efface les péchés même s’ils équivalent à l’écume de la mer.",
    },
  ],
};
