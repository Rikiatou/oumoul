import type { SeedDhikrCategory } from "../types";

export const familyHealthCategory: SeedDhikrCategory = {
  slug: "family-health",
  order: 8,
  name: {
    fr: "Famille & Santé",
    en: "Family & Health",
    ar: "أدعية الأسرة والصحة",
  },
  description: {
    fr: "Du'as pour les parents, les enfants, la guérison et la protection de la famille.",
    en: "Supplications for parents, children, healing and family protection.",
  },
  entries: [
    {
      slug: "dua-parents",
      order: 1,
      title: { fr: "Pour ses parents", en: "For one's parents", ar: "دعاء للوالدين" },
      arabicText: "رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
      transliteration: "Rabbi rḥamhumā kamā rabbayānī ṣaghīrā",
      translation: {
        fr: "Seigneur, fais-leur miséricorde comme ils m'ont élevé tout petit. (Coran 17:24)",
        en: "My Lord, have mercy upon them as they raised me when I was small. (Qur'an 17:24)",
      },
      source: "Coran 17:24",
      recommendedCount: 1,
    },
    {
      slug: "dua-healing",
      order: 2,
      title: { fr: "Du'a pour la guérison", en: "Supplication for healing", ar: "دعاء الشفاء" },
      arabicText: "اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ اشْفِهِ وَأَنْتَ الشَّافِي لَا شِفَاءَ إِلَّا شِفَاؤُكَ شِفَاءً لَا يُغَادِرُ سَقَمًا",
      transliteration: "Allāhumma Rabba n-nāsi adhhib il-baʾs, ishfihī wa anta sh-Shāfī, lā shifāʾa illā shifāʾuka shifāʾan lā yughādiru saqamā",
      translation: {
        fr: "Ô Allah, Seigneur des hommes, éloigne la souffrance, guéris-le/la. Tu es le Guérisseur. Il n'y a de guérison que la Tienne, une guérison qui ne laisse aucune maladie.",
        en: "O Allah, Lord of mankind, remove the affliction, cure him/her. You are the Healer. There is no cure except Your cure, a cure that leaves no illness behind.",
      },
      source: "Bukhārī 5675, Muslim 2191",
      recommendedCount: 1,
    },
    {
      slug: "dua-sick-person",
      order: 3,
      title: { fr: "Pour le malade (visite)", en: "Visiting the sick", ar: "عيادة المريض" },
      arabicText: "لَا بَأْسَ طَهُورٌ إِنْ شَاءَ اللَّهُ",
      transliteration: "Lā baʾsa ṭahūrun in shāʾa Allāh",
      translation: {
        fr: "Pas de mal, c'est une purification, si Allah le veut.",
        en: "No harm, it is a purification, if Allah wills.",
      },
      source: "Bukhārī 3616",
      recommendedCount: 1,
    },
    {
      slug: "dua-righteous-children",
      order: 4,
      title: { fr: "Pour avoir une descendance pieuse", en: "For righteous offspring", ar: "دعاء الذرية الصالحة" },
      arabicText: "رَبِّ هَبْ لِي مِن لَّدُنكَ ذُرِّيَّةً طَيِّبَةً إِنَّكَ سَمِيعُ الدُّعَاءِ",
      transliteration: "Rabbi hab lī min ladunka dhurriyyatan ṭayyibatan innaka samīʿu d-duʿāʾ",
      translation: {
        fr: "Seigneur, accorde-moi de Ta part une descendance vertueuse. Tu es certes Celui qui entend la prière. (Coran 3:38)",
        en: "My Lord, grant me from Yourself a good offspring. Indeed, You are the Hearer of supplication. (Qur'an 3:38)",
      },
      source: "Coran 3:38",
      recommendedCount: 1,
    },
    {
      slug: "dua-family-happiness",
      order: 5,
      title: { fr: "Pour la famille et la sérénité du foyer", en: "For family and home peace", ar: "دعاء السعادة الزوجية" },
      arabicText: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا",
      transliteration: "Rabbanā hab lanā min azwājinā wa dhurriyyātinā qurrata aʿyunin wa jʿalnā lil-muttaqīna imāmā",
      translation: {
        fr: "Notre Seigneur, accorde-nous, de nos époux et de notre descendance, la joie des yeux, et fais de nous un modèle pour les pieux. (Coran 25:74)",
        en: "Our Lord, grant us from among our wives and offspring comfort to our eyes and make us an example for the righteous. (Qur'an 25:74)",
      },
      source: "Coran 25:74",
      recommendedCount: 1,
    },
    {
      slug: "ruqyah-self",
      order: 6,
      title: { fr: "Ruqyah — protection personnelle", en: "Ruqyah — self-protection", ar: "رقية النفس" },
      arabicText: "بِسْمِ اللَّهِ أَرْقِيكَ مِنْ كُلِّ شَيْءٍ يُؤْذِيكَ مِنْ شَرِّ كُلِّ نَفْسٍ أَوْ عَيْنٍ حَاسِدٍ اللَّهُ يَشْفِيكَ بِسْمِ اللَّهِ أَرْقِيكَ",
      transliteration: "Bismillāhi arqīka min kulli shayʾin yuʾdhīka, min sharri kulli nafsin aw ʿaynin ḥāsidin, Allāhu yashfīka, bismillāhi arqīka",
      translation: {
        fr: "Au nom d'Allah je te fais la ruqyah contre tout ce qui te nuit, contre le mal de toute âme ou de tout œil envieux. Qu'Allah te guérisse. Au nom d'Allah je te fais la ruqyah.",
        en: "In the name of Allah I perform ruqyah for you from everything that harms you, from the evil of every soul or envious eye. May Allah heal you. In the name of Allah I perform ruqyah for you.",
      },
      source: "Muslim 2186",
      recommendedCount: 3,
    },
  ],
};
