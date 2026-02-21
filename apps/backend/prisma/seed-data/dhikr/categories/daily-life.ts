import type { SeedDhikrCategory } from "../types";

export const dailyLifeCategory: SeedDhikrCategory = {
  slug: "daily-life",
  order: 6,
  name: {
    fr: "Vie quotidienne",
    en: "Daily Life",
    ar: "أدعية الحياة اليومية",
  },
  description: {
    fr: "Du'as pour les gestes du quotidien : repas, maison, voyage, toilettes.",
    en: "Supplications for everyday acts: meals, home, travel, restroom.",
  },
  entries: [
    {
      slug: "before-eating",
      order: 1,
      title: { fr: "Avant de manger", en: "Before eating", ar: "قبل الطعام" },
      arabicText: "بِسْمِ اللَّهِ",
      transliteration: "Bismillāh",
      translation: {
        fr: "Au nom d'Allah.",
        en: "In the name of Allah.",
      },
      source: "Abū Dāwūd 3767",
      recommendedCount: 1,
    },
    {
      slug: "after-eating",
      order: 2,
      title: { fr: "Après avoir mangé", en: "After eating", ar: "بعد الطعام" },
      arabicText: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
      transliteration: "Al-ḥamdu lillāhi lladhī aṭʿamanī hādhā wa razaqanīhi min ghayri ḥawlin minnī wa lā quwwah",
      translation: {
        fr: "Louange à Allah qui m'a nourri de ceci et me l'a accordé sans force ni pouvoir de ma part.",
        en: "Praise be to Allah who fed me this and provided it for me without any strength or power on my part.",
      },
      source: "Tirmidhī 3458",
      recommendedCount: 1,
    },
    {
      slug: "enter-home",
      order: 3,
      title: { fr: "En entrant chez soi", en: "Entering the home", ar: "عند دخول البيت" },
      arabicText: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلَجِ وَخَيْرَ الْمَخْرَجِ بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا",
      transliteration: "Allāhumma innī asʾaluka khayra l-mawlaji wa khayra l-makhraj. Bismillāhi walajnā wa bismillāhi kharajnā wa ʿalā Allāhi Rabbinā tawakkalnā",
      translation: {
        fr: "Ô Allah, je Te demande le bien de l'entrée et le bien de la sortie. Au nom d'Allah nous entrons, au nom d'Allah nous sortons, et en Allah notre Seigneur nous nous confions.",
        en: "O Allah, I ask You for the good of entering and the good of leaving. In the name of Allah we enter, in the name of Allah we leave, and in Allah our Lord we trust.",
      },
      source: "Abū Dāwūd 5096",
      recommendedCount: 1,
    },
    {
      slug: "leave-home",
      order: 4,
      title: { fr: "En sortant de chez soi", en: "Leaving the home", ar: "عند الخروج من البيت" },
      arabicText: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
      transliteration: "Bismillāhi tawakkaltu ʿalā Allāhi wa lā ḥawla wa lā quwwata illā billāh",
      translation: {
        fr: "Au nom d'Allah, je me confie à Allah. Il n'y a ni force ni puissance si ce n'est par Allah.",
        en: "In the name of Allah, I place my trust in Allah. There is no might nor power except with Allah.",
      },
      source: "Abū Dāwūd 5095, Tirmidhī 3426",
      recommendedCount: 1,
    },
    {
      slug: "enter-toilet",
      order: 5,
      title: { fr: "En entrant aux toilettes", en: "Entering the restroom", ar: "عند دخول الخلاء" },
      arabicText: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ",
      transliteration: "Allāhumma innī aʿūdhu bika mina l-khubuthi wa l-khabāʾith",
      translation: {
        fr: "Ô Allah, je cherche refuge en Toi contre les démons mâles et femelles.",
        en: "O Allah, I seek refuge in You from male and female evil spirits.",
      },
      source: "Bukhārī 142, Muslim 375",
      recommendedCount: 1,
    },
    {
      slug: "exit-toilet",
      order: 6,
      title: { fr: "En sortant des toilettes", en: "Leaving the restroom", ar: "عند الخروج من الخلاء" },
      arabicText: "غُفْرَانَكَ",
      transliteration: "Ghufrānaka",
      translation: {
        fr: "Je Te demande pardon (ô Allah).",
        en: "I seek Your forgiveness (O Allah).",
      },
      source: "Abū Dāwūd 30, Tirmidhī 7",
      recommendedCount: 1,
    },
    {
      slug: "travel-dua",
      order: 7,
      title: { fr: "Du'a du voyage", en: "Supplication for travel", ar: "دعاء السفر" },
      arabicText: "اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى وَمِنَ الْعَمَلِ مَا تَرْضَى",
      transliteration: "Allāhu akbar (×3). Subḥāna lladhī sakhkhara lanā hādhā wa mā kunnā lahu muqrinīn. Wa innā ilā Rabbinā la-munqalibūn. Allāhumma innā nasʾaluka fī safarinā hādhā l-birra wa t-taqwā wa mina l-ʿamali mā tarḍā.",
      translation: {
        fr: "Allah est le Plus Grand (×3). Gloire à Celui qui nous a soumis cela alors que nous n'en étions pas capables. Et c'est vers notre Seigneur que nous retournerons. Ô Allah, nous Te demandons dans ce voyage la piété et la crainte de Toi, et des actes qui T'agréent.",
        en: "Allah is the Greatest (×3). Glory be to the One who has subjected this to us, and we could not have done it ourselves. And indeed, to our Lord we will return. O Allah, we ask You in this journey for righteousness, piety, and deeds that please You.",
      },
      source: "Muslim 1342",
      recommendedCount: 1,
    },
  ],
};
