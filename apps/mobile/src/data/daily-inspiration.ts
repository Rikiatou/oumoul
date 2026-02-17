/**
 * Daily Dua & Ayah of the Day — rotates based on day of year.
 * Each entry has Arabic text, transliteration, French translation, and source.
 */

export interface DailyInspiration {
  type: "ayah" | "dua";
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;
}

const INSPIRATIONS: DailyInspiration[] = [
  // ── Ayat ──
  {
    type: "ayah",
    arabic: "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا",
    transliteration: "Inna ma'al 'usri yusra",
    translation: "Certes, avec la difficulté il y a une facilité.",
    source: "Sourate Ash-Sharh 94:6",
  },
  {
    type: "ayah",
    arabic: "وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُ",
    transliteration: "Wa man yatawakkal 'alallahi fahuwa hasbuhu",
    translation: "Et quiconque place sa confiance en Allah, Il lui suffit.",
    source: "Sourate At-Talaq 65:3",
  },
  {
    type: "ayah",
    arabic: "فَٱذْكُرُونِىٓ أَذْكُرْكُمْ",
    transliteration: "Fadhkuruni adhkurkum",
    translation: "Souvenez-vous de Moi, Je Me souviendrai de vous.",
    source: "Sourate Al-Baqarah 2:152",
  },
  {
    type: "ayah",
    arabic: "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ",
    transliteration: "Wa lasawfa yu'tika rabbuka fatarda",
    translation: "Ton Seigneur t'accordera certes Ses faveurs, et tu seras satisfait.",
    source: "Sourate Ad-Duha 93:5",
  },
  {
    type: "ayah",
    arabic: "رَبِّ ٱشْرَحْ لِى صَدْرِى",
    transliteration: "Rabbi-shrah li sadri",
    translation: "Seigneur, ouvre-moi ma poitrine.",
    source: "Sourate Ta-Ha 20:25",
  },
  {
    type: "ayah",
    arabic: "وَإِذَا سَأَلَكَ عِبَادِى عَنِّى فَإِنِّى قَرِيبٌ",
    transliteration: "Wa idha sa'alaka 'ibadi 'anni fa inni qarib",
    translation: "Et quand Mes serviteurs t'interrogent sur Moi, Je suis tout proche.",
    source: "Sourate Al-Baqarah 2:186",
  },
  {
    type: "ayah",
    arabic: "لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
    transliteration: "La yukallifu Allahu nafsan illa wus'aha",
    translation: "Allah n'impose à aucune âme une charge supérieure à sa capacité.",
    source: "Sourate Al-Baqarah 2:286",
  },
  // ── Duas ──
  {
    type: "dua",
    arabic: "رَبَّنَا آتِنَا فِى ٱلدُّنْيَا حَسَنَةً وَفِى ٱلْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ ٱلنَّارِ",
    transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar",
    translation: "Seigneur ! Accorde-nous une belle part ici-bas, et une belle part dans l'au-delà ; et protège-nous du châtiment du Feu.",
    source: "Sourate Al-Baqarah 2:201",
  },
  {
    type: "dua",
    arabic: "رَبِّ زِدْنِى عِلْمًا",
    transliteration: "Rabbi zidni 'ilma",
    translation: "Seigneur, accrois mes connaissances.",
    source: "Sourate Ta-Ha 20:114",
  },
  {
    type: "dua",
    arabic: "بِسْمِ ٱللَّهِ ٱلَّذِى لَا يَضُرُّ مَعَ ٱسْمِهِ شَىْءٌ فِى ٱلْأَرْضِ وَلَا فِى ٱلسَّمَآءِ وَهُوَ ٱلسَّمِيعُ ٱلْعَلِيمُ",
    transliteration: "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wa la fis-sama'i wa huwas-Sami'ul-'Alim",
    translation: "Au nom d'Allah, Celui dont le nom protège de tout mal sur terre et dans le ciel, et Il est l'Audient, l'Omniscient.",
    source: "Hadith — Abu Dawud, At-Tirmidhi",
  },
  {
    type: "dua",
    arabic: "اللَّهُمَّ إِنِّى أَسْأَلُكَ الْعَافِيَةَ فِى الدُّنْيَا وَالْآخِرَةِ",
    transliteration: "Allahumma inni as'alukal-'afiyata fid-dunya wal-akhirah",
    translation: "Ô Allah, je Te demande le bien-être dans ce monde et dans l'au-delà.",
    source: "Hadith — Ibn Majah",
  },
  {
    type: "dua",
    arabic: "حَسْبِىَ ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ ٱلْعَرْشِ ٱلْعَظِيمِ",
    transliteration: "Hasbiyal-lahu la ilaha illa huwa, 'alayhi tawakkaltu wa huwa Rabbul-'Arshil-'Adhim",
    translation: "Allah me suffit, il n'y a de divinité que Lui. En Lui je place ma confiance et Il est le Seigneur du Trône immense.",
    source: "Sourate At-Tawbah 9:129",
  },
  {
    type: "dua",
    arabic: "اللَّهُمَّ أَعِنِّى عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
    transliteration: "Allahumma a'inni 'ala dhikrika wa shukrika wa husni 'ibadatik",
    translation: "Ô Allah, aide-moi à T'évoquer, à Te remercier et à T'adorer de la meilleure manière.",
    source: "Hadith — Abu Dawud, An-Nasa'i",
  },
  {
    type: "dua",
    arabic: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً",
    transliteration: "Rabbana la tuzigh qulubana ba'da idh hadaytana wa hab lana min ladunka rahmah",
    translation: "Seigneur ! Ne fais pas dévier nos cœurs après nous avoir guidés, et accorde-nous Ta miséricorde.",
    source: "Sourate Al-Imran 3:8",
  },
  {
    type: "ayah",
    arabic: "وَنُنَزِّلُ مِنَ ٱلْقُرْءَانِ مَا هُوَ شِفَآءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ",
    transliteration: "Wa nunazzilu minal-Qur'ani ma huwa shifa'un wa rahmatun lil-mu'minin",
    translation: "Nous faisons descendre du Coran ce qui est une guérison et une miséricorde pour les croyants.",
    source: "Sourate Al-Isra 17:82",
  },
  {
    type: "ayah",
    arabic: "إِنَّ ٱللَّهَ مَعَ ٱلصَّـٰبِرِينَ",
    transliteration: "Innallaha ma'as-sabirin",
    translation: "Certes, Allah est avec les patients.",
    source: "Sourate Al-Baqarah 2:153",
  },
  {
    type: "dua",
    arabic: "اللَّهُمَّ إِنِّى أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ",
    transliteration: "Allahumma inni a'udhu bika minal-hammi wal-hazan",
    translation: "Ô Allah, je cherche refuge auprès de Toi contre les soucis et la tristesse.",
    source: "Hadith — Al-Bukhari",
  },
  {
    type: "ayah",
    arabic: "وَلَنَبْلُوَنَّكُم بِشَىْءٍ مِّنَ ٱلْخَوْفِ وَٱلْجُوعِ وَنَقْصٍ مِّنَ ٱلْأَمْوَٰلِ وَٱلْأَنفُسِ وَٱلثَّمَرَٰتِ وَبَشِّرِ ٱلصَّـٰبِرِينَ",
    transliteration: "Wa lanabluwannakum bi shay'in minal-khawfi wal-ju'i wa naqsin minal-amwali wal-anfusi wath-thamarati wa bashshiris-sabirin",
    translation: "Nous vous éprouverons par un peu de peur, de faim et de diminution de biens, de personnes et de fruits. Et fais la bonne annonce aux endurants.",
    source: "Sourate Al-Baqarah 2:155",
  },
  {
    type: "dua",
    arabic: "سُبْحَانَ ٱللَّهِ وَبِحَمْدِهِ سُبْحَانَ ٱللَّهِ ٱلْعَظِيمِ",
    transliteration: "SubhanAllahi wa bihamdihi, SubhanAllahil-'Adhim",
    translation: "Gloire à Allah et louange à Lui, Gloire à Allah le Très Grand.",
    source: "Hadith — Al-Bukhari, Muslim",
  },
  {
    type: "dua",
    arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ",
    transliteration: "La hawla wa la quwwata illa billah",
    translation: "Il n'y a de force ni de puissance qu'en Allah.",
    source: "Hadith — Al-Bukhari, Muslim",
  },
  {
    type: "ayah",
    arabic: "قُلْ هُوَ ٱللَّهُ أَحَدٌ ٱللَّهُ ٱلصَّمَدُ لَمْ يَلِدْ وَلَمْ يُولَدْ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ",
    transliteration: "Qul Huwal-lahu Ahad, Allahus-Samad, Lam yalid wa lam yulad, Wa lam yakun lahu kufuwan ahad",
    translation: "Dis : Il est Allah, Unique. Allah, Le Seul à être imploré. Il n'a jamais engendré, n'a pas été engendré. Et nul n'est égal à Lui.",
    source: "Sourate Al-Ikhlas 112:1-4",
  },
  {
    type: "ayah",
    arabic: "ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ",
    transliteration: "Allahu la ilaha illa Huwal-Hayyul-Qayyum",
    translation: "Allah ! Point de divinité à part Lui, le Vivant, Celui qui subsiste par Lui-même.",
    source: "Ayat Al-Kursi — Sourate Al-Baqarah 2:255",
  },
  {
    type: "dua",
    arabic: "رَبَّنَا تَقَبَّلْ مِنَّآ إِنَّكَ أَنتَ ٱلسَّمِيعُ ٱلْعَلِيمُ",
    transliteration: "Rabbana taqabbal minna innaka Antas-Sami'ul-'Alim",
    translation: "Seigneur ! Accepte ceci de notre part ! Car c'est Toi l'Audient, l'Omniscient.",
    source: "Sourate Al-Baqarah 2:127",
  },
  {
    type: "dua",
    arabic: "اللَّهُمَّ بَارِكْ لَنَا فِى رَجَبَ وَشَعْبَانَ وَبَلِّغْنَا رَمَضَانَ",
    transliteration: "Allahumma barik lana fi Rajab wa Sha'ban wa ballighna Ramadan",
    translation: "Ô Allah, bénis-nous en Rajab et Sha'ban, et fais-nous parvenir au Ramadan.",
    source: "Hadith — Ahmad, At-Tabarani",
  },
  {
    type: "ayah",
    arabic: "وَٱصْبِرْ فَإِنَّ ٱللَّهَ لَا يُضِيعُ أَجْرَ ٱلْمُحْسِنِينَ",
    transliteration: "Wasbir fa innallaha la yudi'u ajral-muhsinin",
    translation: "Et sois patient, car Allah ne laisse pas perdre la récompense des bienfaisants.",
    source: "Sourate Hud 11:115",
  },
  {
    type: "dua",
    arabic: "اللَّهُمَّ اجْعَلْنِى مِنَ التَّوَّابِينَ وَاجْعَلْنِى مِنَ الْمُتَطَهِّرِينَ",
    transliteration: "Allahummaj'alni minat-tawwabina waj'alni minal-mutatahhirin",
    translation: "Ô Allah, fais de moi un de ceux qui se repentent et un de ceux qui se purifient.",
    source: "Hadith — At-Tirmidhi",
  },
  {
    type: "ayah",
    arabic: "وَمَآ أَرْسَلْنَـٰكَ إِلَّا رَحْمَةً لِّلْعَـٰلَمِينَ",
    transliteration: "Wa ma arsalnaka illa rahmatan lil-'alamin",
    translation: "Et Nous ne t'avons envoyé qu'en miséricorde pour l'univers.",
    source: "Sourate Al-Anbiya 21:107",
  },
  {
    type: "dua",
    arabic: "اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّى",
    transliteration: "Allahumma innaka 'Afuwwun tuhibbul-'afwa fa'fu 'anni",
    translation: "Ô Allah, Tu es Celui qui pardonne, Tu aimes le pardon, alors pardonne-moi.",
    source: "Hadith — At-Tirmidhi, Ibn Majah",
  },
];

/**
 * Returns the inspiration for today, rotating through the collection.
 */
export function getTodayInspiration(): DailyInspiration {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return INSPIRATIONS[dayOfYear % INSPIRATIONS.length];
}
