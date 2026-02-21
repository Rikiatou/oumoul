import type { SeedDhikrCategory } from "../types";

export const forgivenessCategory: SeedDhikrCategory = {
  slug: "forgiveness",
  order: 7,
  name: {
    fr: "Repentir & Pardon",
    en: "Repentance & Forgiveness",
    ar: "الاستغفار والتوبة",
  },
  description: {
    fr: "Du'as pour demander le pardon d'Allah et se repentir sincèrement.",
    en: "Supplications for seeking Allah's forgiveness and sincere repentance.",
  },
  entries: [
    {
      slug: "sayyid-al-istighfar",
      order: 1,
      title: { fr: "Sayyid al-Istighfār", en: "Master of Forgiveness", ar: "سيد الاستغفار" },
      arabicText: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
      transliteration: "Allāhumma anta Rabbī lā ilāha illā anta, khalaqtanī wa anā ʿabduka, wa anā ʿalā ʿahdika wa waʿdika mā staṭaʿtu. Aʿūdhu bika min sharri mā ṣanaʿtu, abūʾu laka biniʿmatika ʿalayya wa abūʾu bidhanbī, faghfir lī fa-innahu lā yaghfiru dh-dhunūba illā ant.",
      translation: {
        fr: "Ô Allah, Tu es mon Seigneur, il n'y a de divinité que Toi. Tu m'as créé et je suis Ton serviteur. Je suis sur Ton pacte et Ta promesse autant que je le peux. Je cherche refuge en Toi contre le mal de ce que j'ai fait. Je reconnais Tes bienfaits sur moi et je reconnais mon péché. Pardonne-moi, car nul ne pardonne les péchés sinon Toi.",
        en: "O Allah, You are my Lord, there is no deity but You. You created me and I am Your servant. I am upon Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favor upon me and I acknowledge my sin. Forgive me, for none forgives sins except You.",
      },
      source: "Bukhārī 6306",
      recommendedCount: 1,
    },
    {
      slug: "istighfar-simple",
      order: 2,
      title: { fr: "Istighfār simple", en: "Simple Istighfar", ar: "الاستغفار البسيط" },
      arabicText: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
      transliteration: "Astaghfiru Allāha wa atūbu ilayh",
      translation: {
        fr: "Je demande pardon à Allah et je me repens à Lui.",
        en: "I seek forgiveness from Allah and repent to Him.",
      },
      source: "Bukhārī 6307, Muslim 2702",
      recommendedCount: 100,
    },
    {
      slug: "subhanallah-wabihamdihi",
      order: 3,
      title: { fr: "Subḥānallāhi wa biḥamdih", en: "Glory and Praise", ar: "سبحان الله وبحمده" },
      arabicText: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
      transliteration: "Subḥāna Allāhi wa biḥamdih",
      translation: {
        fr: "Gloire à Allah et louange à Lui. (Efface les péchés même s'ils sont aussi nombreux que l'écume de la mer.)",
        en: "Glory be to Allah and praise be to Him. (Erases sins even if they are as numerous as the foam of the sea.)",
      },
      source: "Muslim 2691",
      recommendedCount: 100,
    },
    {
      slug: "dua-tawbah",
      order: 4,
      title: { fr: "Du'a du repentir", en: "Supplication of repentance", ar: "دعاء التوبة" },
      arabicText: "رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ",
      transliteration: "Rabbanā ẓalamnā anfusanā wa in lam taghfir lanā wa tarḥamnā la-nakūnanna mina l-khāsirīn",
      translation: {
        fr: "Notre Seigneur, nous avons fait du tort à nous-mêmes. Si Tu ne nous pardonnes pas et ne nous fais pas miséricorde, nous serons certes du nombre des perdants. (Coran 7:23)",
        en: "Our Lord, we have wronged ourselves, and if You do not forgive us and have mercy upon us, we will surely be among the losers. (Qur'an 7:23)",
      },
      source: "Coran 7:23",
      recommendedCount: 1,
    },
  ],
};
