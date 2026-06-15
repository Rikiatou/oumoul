import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { palette } from '../theme';
import { awardEvent } from '../gamification/gamification-events';
import { HelpTip } from '../components/HelpTip';

// ─── Data ─────────────────────────────────────────────────────────────────────

export interface Dua {
  id: string;
  category: string;
  situation: string;
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;
}

const CATEGORIES = [
  { id: 'all', label: 'Tous', icon: 'apps' as const },
  { id: 'matin', label: 'Matin', icon: 'sunny' as const },
  { id: 'soir', label: 'Soir', icon: 'moon' as const },
  { id: 'repas', label: 'Repas', icon: 'restaurant' as const },
  { id: 'voyage', label: 'Voyage', icon: 'airplane' as const },
  { id: 'protection', label: 'Protection', icon: 'shield-checkmark' as const },
  { id: 'maladie', label: 'Maladie', icon: 'medical' as const },
  { id: 'famille', label: 'Famille', icon: 'people' as const },
  { id: 'etude', label: 'Études', icon: 'book' as const },
  { id: 'travail', label: 'Travail', icon: 'briefcase' as const },
  { id: 'pluie', label: 'Pluie', icon: 'rainy' as const },
  { id: 'mosque', label: 'Mosquée', icon: 'business' as const },
  { id: 'general', label: 'Général', icon: 'heart' as const },
];

const DUAS: Dua[] = [
  {
    id: '1', category: 'matin', situation: 'Au réveil',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration: 'Alhamdulillahi-lladhī ahyānā ba\'da mā amātanā wa ilayhi-n-nushūr',
    translation: 'Louange à Allah qui nous a redonné la vie après nous avoir fait mourir, et c\'est vers Lui la résurrection.',
    source: 'Bukhari 6312',
  },
  {
    id: '2', category: 'matin', situation: 'Supplication du matin',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    transliteration: 'Aṣbaḥnā wa aṣbaḥa-l-mulku lillāh, wa-l-ḥamdu lillāh, lā ilāha illallāhu waḥdahu lā sharīka lah',
    translation: 'Nous voici au matin et toute souveraineté appartient à Allah. Louange à Allah. Nul dieu sauf Allah, Seul, sans associé.',
    source: 'Muslim 2723',
  },
  {
    id: '3', category: 'soir', situation: 'Au coucher',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allāhumma amūtu wa aḥyā',
    translation: 'En Ton nom ô Allah, je meurs et je vis.',
    source: 'Bukhari 6324',
  },
  {
    id: '4', category: 'soir', situation: 'Supplication du soir',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    transliteration: 'Amsaynā wa amsa-l-mulku lillāh, wa-l-ḥamdu lillāh, lā ilāha illallāhu waḥdahu lā sharīka lah',
    translation: 'Nous voici au soir et toute souveraineté appartient à Allah. Louange à Allah. Nul dieu sauf Allah, Seul, sans associé.',
    source: 'Muslim 2723',
  },
  {
    id: '5', category: 'repas', situation: 'Avant de manger',
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismillāh',
    translation: 'Au nom d\'Allah.',
    source: 'Abu Dawud 3767',
  },
  {
    id: '6', category: 'repas', situation: 'Après le repas',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
    transliteration: 'Alhamdulillāhi-lladhī aṭ\'amanī hādhā wa razaqanīhi min ghayri ḥawlin minnī wa lā quwwah',
    translation: 'Louange à Allah qui m\'a nourri de ceci et me l\'a accordé sans force ni pouvoir de ma part.',
    source: 'Abu Dawud 4023',
  },
  {
    id: '7', category: 'voyage', situation: 'Avant de voyager',
    arabic: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى',
    transliteration: 'Allāhumma innā nas\'aluka fī safarinā hādhā-l-birra wa-t-taqwā, wa mina-l-\'amali mā tarḍā',
    translation: 'Ô Allah, nous Te demandons dans ce voyage la piété et la crainte de Toi, et parmi les actes, ce qui T\'agrée.',
    source: 'Muslim 1342',
  },
  {
    id: '8', category: 'voyage', situation: 'En montant dans un véhicule',
    arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
    transliteration: 'Subḥāna-lladhī sakhkhara lanā hādhā wa mā kunnā lahu muqrinīn, wa innā ilā rabbinā la-munqalibūn',
    translation: 'Gloire à Celui qui nous a soumis cela alors que nous n\'aurions pu le maîtriser, et c\'est vers notre Seigneur que nous retournerons.',
    source: 'Abu Dawud 2602',
  },
  {
    id: '9', category: 'protection', situation: 'Protection contre le mal',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    transliteration: 'A\'ūdhu bi kalimātillāhi-t-tāmmāti min sharri mā khalaq',
    translation: 'Je cherche refuge dans les paroles parfaites d\'Allah contre le mal de ce qu\'Il a créé.',
    source: 'Muslim 2708',
  },
  {
    id: '10', category: 'protection', situation: 'Au nom d\'Allah (protection)',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration: 'Bismillāhi-lladhī lā yaḍurru ma\'a-smihi shay\'un fi-l-arḍi wa lā fi-s-samā\'i wa huwa-s-samī\'u-l-\'alīm',
    translation: 'Au nom d\'Allah avec Lequel rien ne peut nuire sur terre ni dans les cieux, et Il est l\'Audient, l\'Omniscient.',
    source: 'Abu Dawud 5088',
  },
  {
    id: '11', category: 'maladie', situation: 'Pour soi-même malade',
    arabic: 'اللَّهُمَّ رَبَّ النَّاسِ، أَذْهِبِ الْبَاسَ، اشْفِ أَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا',
    transliteration: 'Allāhumma Rabba-n-nās, adh-hibi-l-bās, ishfi anta-sh-shāfī, lā shifā\'a illā shifā\'uk, shifā\'an lā yughādiru saqamā',
    translation: 'Ô Allah, Seigneur des hommes, ôte la souffrance, guéris — Tu es le Guérisseur —, il n\'y a de guérison que la Tienne, une guérison qui ne laisse aucune maladie.',
    source: 'Bukhari 5675',
  },
  {
    id: '12', category: 'maladie', situation: 'Pour visiter un malade',
    arabic: 'لَا بَأْسَ طَهُورٌ إِنْ شَاءَ اللَّهُ',
    transliteration: 'Lā ba\'sa, ṭahūrun inshā\'allāh',
    translation: 'Pas de problème, c\'est une purification, si Allah le veut.',
    source: 'Bukhari 5656',
  },
  {
    id: '13', category: 'famille', situation: 'Pour les parents',
    arabic: 'رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    transliteration: 'Rabbi-rḥamhumā kamā rabbayānī ṣaghīrā',
    translation: 'Seigneur, aie pitié d\'eux tous deux, comme ils m\'ont élevé tout petit.',
    source: 'Coran 17:24',
  },
  {
    id: '14', category: 'famille', situation: 'Pour les enfants',
    arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
    transliteration: 'Rabbanā hab lanā min azwājinā wa dhurriyyātinā qurrata a\'yunin wa-j\'alnā lil-muttaqīna imāmā',
    translation: 'Notre Seigneur, donne-nous, en nos épouses et nos descendants, la joie des yeux, et fais de nous un guide pour les pieux.',
    source: 'Coran 25:74',
  },
  {
    id: '15', category: 'etude', situation: 'Demander la connaissance',
    arabic: 'رَّبِّ زِدْنِي عِلْمًا',
    transliteration: 'Rabbi zidnī \'ilmā',
    translation: 'Seigneur, accrois-moi en science.',
    source: 'Coran 20:114',
  },
  {
    id: '16', category: 'etude', situation: 'Avant un examen',
    arabic: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا',
    transliteration: 'Allāhumma lā sahla illā mā ja\'altahu sahlā, wa anta taj\'alu-l-ḥazna idhā shi\'ta sahlā',
    translation: 'Ô Allah, rien n\'est facile sauf ce que Tu rends facile, et Tu peux rendre le difficile facile si Tu le veux.',
    source: 'Ibn Hibban 2427',
  },
  {
    id: '17', category: 'travail', situation: 'En commençant le travail',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ رِزْقًا طَيِّبًا، وَعِلْمًا نَافِعًا، وَعَمَلًا مُتَقَبَّلًا',
    transliteration: 'Allāhumma innī as\'aluka rizqan ṭayyibā, wa \'ilman nāfi\'ā, wa \'amalan mutaqabbalā',
    translation: 'Ô Allah, je Te demande une subsistance licite, une science utile et une œuvre acceptée.',
    source: 'Ibn Majah 925',
  },
  {
    id: '18', category: 'pluie', situation: 'Quand il pleut',
    arabic: 'اللَّهُمَّ صَيِّبًا نَافِعًا',
    transliteration: 'Allāhumma ṣayyiban nāfi\'ā',
    translation: 'Ô Allah, [fais-en] une pluie bienfaisante.',
    source: 'Bukhari 1032',
  },
  {
    id: '19', category: 'mosque', situation: 'En entrant à la mosquée',
    arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    transliteration: 'Allāhumma-ftaḥ lī abwāba raḥmatik',
    translation: 'Ô Allah, ouvre-moi les portes de Ta miséricorde.',
    source: 'Muslim 713',
  },
  {
    id: '20', category: 'mosque', situation: 'En sortant de la mosquée',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
    transliteration: 'Allāhumma innī as\'aluka min faḍlik',
    translation: 'Ô Allah, je Te demande une partie de Ta grâce.',
    source: 'Muslim 713',
  },
  {
    id: '21', category: 'general', situation: 'Du\'a universel',
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    transliteration: 'Rabbanā ātinā fi-d-dunyā ḥasanatan wa fi-l-ākhirati ḥasanatan wa qinā \'adhāba-n-nār',
    translation: 'Notre Seigneur, donne-nous le bien ici-bas et le bien dans l\'au-delà et préserve-nous du châtiment du Feu.',
    source: 'Coran 2:201',
  },
  {
    id: '22', category: 'general', situation: 'Pardon et miséricorde',
    arabic: 'رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ',
    transliteration: 'Rabbanā ẓalamnā anfusanā wa in lam taghfir lanā wa tarḥamnā la-nakūnanna mina-l-khāsirīn',
    translation: 'Notre Seigneur, nous avons été injustes envers nous-mêmes et si Tu ne nous pardonnes pas et ne nous fais pas miséricorde, nous serons assurément du nombre des perdants.',
    source: 'Coran 7:23',
  },
  {
    id: '23', category: 'protection', situation: 'Protection pour les enfants',
    arabic: 'أُعِيذُكُمَا بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ',
    transliteration: 'U\'īdhukumā bi kalimātillāhi-t-tāmmati min kulli shayṭānin wa hāmmatin wa min kulli \'aynin lāmmatin',
    translation: 'Je vous protège par les paroles parfaites d\'Allah contre tout démon et tout animal venimeux, et contre tout mauvais œil.',
    source: 'Bukhari 3371',
  },
  {
    id: '24', category: 'travail', situation: 'Stress et anxiété',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ الْهَمِّ وَالْحُزْنِ، وَأَعُوذُ بِكَ مِنْ الْعَجْزِ وَالْكَسَلِ',
    transliteration: 'Allāhumma innī a\'ūdhu bika mina-l-hammi wa-l-ḥuzni, wa a\'ūdhu bika mina-l-\'ajzi wa-l-kasali',
    translation: 'Ô Allah, je cherche refuge auprès de Toi contre l\'inquiétude et la tristesse, et je cherche refuge auprès de Toi contre la faiblesse et la paresse.',
    source: 'Bukhari 6369',
  },
  {
    id: '25', category: 'famille', situation: 'Pour le mariage',
    arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ',
    transliteration: 'Rabbanā hab lanā min azwājinā wa dhurriyyātinā qurrata a\'yunin',
    translation: 'Notre Seigneur, donne-nous, en nos épouses et nos descendants, la joie des yeux.',
    source: 'Coran 25:74',
  },
  {
    id: '26', category: 'general', situation: 'Confiance en Allah',
    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    transliteration: 'Ḥasbunallāhu wa ni\'ma-l-wakīl',
    translation: 'Allah nous suffit, quel excellent garant!',
    source: 'Coran 3:173',
  },
  {
    id: '27', category: 'maladie', situation: 'Guérison du cœur',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى',
    transliteration: 'Allāhumma innī as\'aluka-l-hudā wa-t-tuqā wa-l-\'afāfa wa-l-ghinā',
    translation: 'Ô Allah, je Te demande la guidance, la piété, la chasteté et la richesse de l\'âme.',
    source: 'Muslim 2725',
  },
  // ── Matin supplémentaires ──────────────────────────────────────────────────
  {
    id: '28', category: 'matin', situation: 'Dhikr du matin — Sayyidul Istighfar',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
    transliteration: 'Allāhumma anta rabbī lā ilāha illā anta, khalaqtanī wa anā \'abduk, wa anā \'alā \'ahdika wa wa\'dika mā-staṭa\'tu',
    translation: 'Ô Allah, Tu es mon Seigneur, nul dieu sauf Toi. Tu m\'as créé et je suis Ton serviteur. Je m\'engage à Ton pacte et à Ta promesse autant que je le puis.',
    source: 'Bukhari 6306',
  },
  {
    id: '29', category: 'matin', situation: 'Lire Ayat al-Kursi',
    arabic: 'اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ',
    transliteration: 'Allāhu lā ilāha illā huwa-l-ḥayyu-l-qayyūm, lā ta\'khudhuhū sinatun wa lā nawm',
    translation: 'Allah ! Point de divinité à part Lui, le Vivant, Celui qui subsiste par lui-même. Ni somnolence ni sommeil ne Le saisissent.',
    source: 'Coran 2:255',
  },
  {
    id: '30', category: 'matin', situation: 'Protection du matin × 3',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration: 'Bismillāhi-lladhī lā yaḍurru ma\'a-smihi shay\'un fi-l-arḍi wa lā fi-s-samā\'i, wa huwa-s-samī\'u-l-\'alīm',
    translation: 'Au nom d\'Allah avec Lequel rien ne peut nuire sur terre ni dans les cieux. À réciter 3× le matin.',
    source: 'Abu Dawud 5088',
  },
  // ── Soir supplémentaires ───────────────────────────────────────────────────
  {
    id: '31', category: 'soir', situation: 'Demander pardon le soir',
    arabic: 'أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullāha-lladhī lā ilāha illā huwa-l-ḥayyu-l-qayyūmu wa atūbu ilayh',
    translation: 'Je demande pardon à Allah, nul dieu sauf Lui, le Vivant, le Subsistant, et je me repens à Lui.',
    source: 'Abu Dawud 1517',
  },
  {
    id: '32', category: 'soir', situation: 'Avant de dormir — Al-Ikhlas, Al-Falaq, An-Nas',
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
    transliteration: 'Qul huwa-llāhu aḥad, Allāhu-ṣ-ṣamad, lam yalid wa lam yūlad, wa lam yakun lahu kufuwan aḥad',
    translation: 'Lire Al-Ikhlas, Al-Falaq et An-Nas, souffler dans ses mains et les passer sur le corps. À faire 3× avant de dormir.',
    source: 'Bukhari 5017',
  },
  {
    id: '33', category: 'soir', situation: 'Se placer sous la protection d\'Allah',
    arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
    transliteration: 'Allāhumma bika amsaynā, wa bika aṣbaḥnā, wa bika naḥyā, wa bika namūtu, wa ilayka-l-maṣīr',
    translation: 'Ô Allah, par Toi nous voici au soir, par Toi au matin, par Toi nous vivons, par Toi nous mourons, et vers Toi est le retour.',
    source: 'Tirmidhi 3391',
  },
  // ── Repentance & guidance ──────────────────────────────────────────────────
  {
    id: '34', category: 'general', situation: 'Repentance sincère',
    arabic: 'رَبِّ إِنِّي ظَلَمْتُ نَفْسِي فَاغْفِرْ لِي',
    transliteration: 'Rabbi innī ẓalamtu nafsī fa-ghfir lī',
    translation: 'Seigneur, je me suis fait du tort à moi-même, pardonne-moi.',
    source: 'Coran 28:16',
  },
  {
    id: '35', category: 'general', situation: 'Du\'a de Yunus (Jonas) dans la baleine',
    arabic: 'لَّا إِلَهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ',
    transliteration: 'Lā ilāha illā anta subḥānaka innī kuntu mina-ẓ-ẓālimīn',
    translation: 'Il n\'y a de dieu que Toi, gloire à Toi, j\'ai vraiment été du nombre des injustes.',
    source: 'Coran 21:87',
  },
  {
    id: '36', category: 'general', situation: 'Guidance sur le droit chemin',
    arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ',
    transliteration: 'Ihdinā-ṣ-ṣirāṭa-l-mustaqīm, ṣirāṭa-lladhīna an\'amta \'alayhim',
    translation: 'Guide-nous sur le droit chemin, le chemin de ceux que Tu as comblés de bienfaits.',
    source: 'Coran 1:6-7',
  },
  {
    id: '37', category: 'general', situation: 'Fermeté dans la foi',
    arabic: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ',
    transliteration: 'Yā muqalliba-l-qulūbi thabbit qalbī \'alā dīnik',
    translation: 'Ô Celui qui retourne les cœurs, affermis mon cœur sur Ta religion.',
    source: 'Tirmidhi 2140',
  },
  // ── Famille & mariage ─────────────────────────────────────────────────────
  {
    id: '38', category: 'famille', situation: 'Dou\'a du mariage (Nikah)',
    arabic: 'بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ',
    transliteration: 'Bārakallāhu laka wa bāraka \'alayka wa jama\'a baynakumā fī khayr',
    translation: 'Qu\'Allah te bénisse et répande Ses bénédictions sur toi, et qu\'Il vous unisse dans le bien.',
    source: 'Abu Dawud 2130',
  },
  {
    id: '39', category: 'famille', situation: 'Avant les relations conjugales',
    arabic: 'اللَّهُمَّ جَنِّبْنَا الشَّيْطَانَ وَجَنِّبِ الشَّيْطَانَ مَا رَزَقْتَنَا',
    transliteration: 'Allāhumma jannibna-sh-shayṭāna wa jannib-ish-shayṭāna mā razaqtanā',
    translation: 'Ô Allah, éloigne de nous le Diable, et éloigne le Diable de ce que Tu nous accorderas.',
    source: 'Bukhari 141',
  },
  {
    id: '40', category: 'famille', situation: 'Pour une grossesse',
    arabic: 'رَبِّ لَا تَذَرْنِي فَرْدًا وَأَنتَ خَيْرُ الْوَارِثِينَ',
    transliteration: 'Rabbi lā tadharni fardan wa anta khayru-l-wārithīn',
    translation: 'Seigneur, ne me laisse pas sans descendance, alors que Tu es le meilleur des héritiers.',
    source: 'Coran 21:89',
  },
  // ── Protection supplémentaires ─────────────────────────────────────────────
  {
    id: '41', category: 'protection', situation: 'En entrant chez soi',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلَجِ وَخَيْرَ الْمَخْرَجِ، بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا',
    transliteration: 'Allāhumma innī as\'aluka khayra-l-mawlaji wa khayra-l-makhraji, bismillāhi walajna, wa bismillāhi kharajnā',
    translation: 'Ô Allah, je Te demande le bien de l\'entrée et le bien de la sortie. Au nom d\'Allah nous entrons, et au nom d\'Allah nous sortons.',
    source: 'Abu Dawud 5096',
  },
  {
    id: '42', category: 'protection', situation: 'Contre le mauvais œil (Ain)',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ',
    transliteration: 'A\'ūdhu bi kalimātillāhi-t-tāmmati min kulli shayṭānin wa hāmmatin wa min kulli \'aynin lāmmatin',
    translation: 'Je cherche refuge dans les paroles parfaites d\'Allah contre tout démon, tout animal nuisible et tout mauvais œil.',
    source: 'Bukhari 3371',
  },
  {
    id: '43', category: 'protection', situation: 'Contre l\'anxiété et la tristesse',
    arabic: 'اللَّهُمَّ إِنِّي عَبْدُكَ ابْنُ عَبْدِكَ ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ',
    transliteration: 'Allāhumma innī \'abduka ibnu \'abdika ibnu amatika, nāṣiyatī biyadik, māḍin fiyya ḥukmuk, \'adlun fiyya qaḍā\'uk',
    translation: 'Ô Allah, je suis Ton serviteur, fils de Ton serviteur, fils de Ta servante. Mon destin est entre Tes mains, Ton jugement s\'accomplit sur moi, Ta décision est juste à mon égard.',
    source: 'Ahmad 3704',
  },
  // ── Voyage supplémentaires ─────────────────────────────────────────────────
  {
    id: '44', category: 'voyage', situation: 'À l\'arrivée dans un lieu',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    transliteration: 'A\'ūdhu bi kalimātillāhi-t-tāmmāti min sharri mā khalaq',
    translation: 'Je cherche refuge dans les paroles parfaites d\'Allah contre le mal de ce qu\'Il a créé.',
    source: 'Muslim 2708',
  },
  {
    id: '45', category: 'voyage', situation: 'Du\'a pour le retour de voyage',
    arabic: 'آيِبُونَ تَائِبُونَ عَابِدُونَ لِرَبِّنَا حَامِدُونَ',
    transliteration: 'Āyibūna tā\'ibūna \'ābidūna li-rabbinā ḥāmidūn',
    translation: 'Nous revenons, nous nous repentons, nous adorons notre Seigneur et nous Le louons.',
    source: 'Muslim 1342',
  },
  // ── Études supplémentaires ─────────────────────────────────────────────────
  {
    id: '46', category: 'etude', situation: 'Mémoriser et comprendre',
    arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي ۝ وَيَسِّرْ لِي أَمْرِي ۝ وَاحْلُلْ عُقْدَةً مِّن لِّسَانِي ۝ يَفْقَهُوا قَوْلِي',
    transliteration: 'Rabbi-shraḥ lī ṣadrī, wa yassir lī amrī, wa-ḥlul \'uqdatan min lisānī, yafqahū qawlī',
    translation: 'Seigneur, ouvre ma poitrine, facilite-moi ma tâche, dénoue le nœud de ma langue afin qu\'ils comprennent mes paroles.',
    source: 'Coran 20:25-28',
  },
  {
    id: '47', category: 'etude', situation: 'Avant de lire le Coran',
    arabic: 'اللَّهُمَّ افْتَحْ عَلَيْنَا حِكْمَتَكَ، وَانْشُرْ عَلَيْنَا رَحْمَتَكَ، يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    transliteration: 'Allāhumma-ftaḥ \'alaynā ḥikmataka, wa-nshur \'alaynā raḥmatak, yā dha-l-jalāli wa-l-ikrām',
    translation: 'Ô Allah, ouvre-nous Ta sagesse, répands sur nous Ta miséricorde, ô Maître de la Majesté et de la Grâce.',
    source: 'Tradition',
  },
  // ── Santé & maladie supplémentaires ───────────────────────────────────────
  {
    id: '48', category: 'maladie', situation: 'Ruqya — souffler sur soi-même',
    arabic: 'أَذْهِبِ الْبَأْسَ، رَبَّ النَّاسِ، وَاشْفِ، أَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ',
    transliteration: 'Adh-hibi-l-ba\'sa, Rabba-n-nās, washfi, anta-sh-shāfī, lā shifā\'a illā shifā\'uk',
    translation: 'Ôte la souffrance, Seigneur des hommes, guéris — Tu es le Guérisseur —, il n\'y a de guérison que la Tienne.',
    source: 'Bukhari 5743',
  },
  {
    id: '49', category: 'maladie', situation: 'Face à une épreuve difficile',
    arabic: 'إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ، اللَّهُمَّ أْجُرْنِي فِي مُصِيبَتِي وَأَخْلِفْ لِي خَيْرًا مِنْهَا',
    transliteration: 'Innā lillāhi wa innā ilayhi rāji\'ūn. Allāhumma-jurnī fī muṣībatī wa akhlif lī khayran minhā',
    translation: 'Nous sommes à Allah et vers Lui nous retournons. Ô Allah, récompense-moi dans mon épreuve et donne-moi quelque chose de meilleur.',
    source: 'Muslim 918',
  },
  {
    id: '50', category: 'maladie', situation: 'Patience dans l\'épreuve',
    arabic: 'اللَّهُمَّ لَا تَجْعَلِ الدُّنْيَا أَكْبَرَ هَمِّنَا، وَلَا مَبْلَغَ عِلْمِنَا',
    transliteration: 'Allāhumma lā taj\'ali-d-dunyā akbara hamminā, wa lā mablagha \'ilminā',
    translation: 'Ô Allah, ne fais pas que la vie de ce monde soit notre plus grande préoccupation ni l\'étendue de notre savoir.',
    source: 'Tirmidhi 3502',
  },
  // ── Travail & rizq (subsistance) ───────────────────────────────────────────
  {
    id: '51', category: 'travail', situation: 'Pour une subsistance abondante et bénie',
    arabic: 'اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ',
    transliteration: 'Allāhumma-kfinī bi-ḥalālika \'an ḥarāmik, wa aghninī bi-faḍlika \'amman siwāk',
    translation: 'Ô Allah, rends-moi suffisant par Ton licite en me dispensant du défendu, et enrichis-moi par Ta grâce sans que j\'aie besoin d\'un autre que Toi.',
    source: 'Tirmidhi 3563',
  },
  {
    id: '52', category: 'travail', situation: 'Du\'a contre les dettes',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَمِنَ الْعَجْزِ وَالْكَسَلِ، وَمِنَ الْجُبْنِ وَالْبُخْلِ، وَمِنَ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ',
    transliteration: 'Allāhumma innī a\'ūdhu bika mina-l-hammi wa-l-ḥazani, wa mina-l-\'ajzi wa-l-kasali, wa mina-l-jubni wa-l-bukhli, wa min ghalabati-d-dayni wa qahri-r-rijāl',
    translation: 'Ô Allah, je cherche refuge auprès de Toi contre l\'inquiétude et la tristesse, la faiblesse et la paresse, la lâcheté et l\'avarice, l\'accablement des dettes et la domination des hommes.',
    source: 'Bukhari 2893',
  },
  // ── Général supplémentaires ────────────────────────────────────────────────
  {
    id: '53', category: 'general', situation: 'La meilleure des supplications',
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    transliteration: 'Rabbanā ātinā fi-d-dunyā ḥasanatan wa fi-l-ākhirati ḥasanatan wa qinā \'adhāba-n-nār',
    translation: 'Notre Seigneur, donne-nous le bien en ce monde et le bien dans l\'au-delà, et préserve-nous du châtiment du Feu.',
    source: 'Coran 2:201',
  },
  {
    id: '54', category: 'general', situation: 'Amour d\'Allah et du Prophète ﷺ',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ حُبَّكَ وَحُبَّ مَنْ يُحِبُّكَ وَحُبَّ عَمَلٍ يُقَرِّبُنِي إِلَى حُبِّكَ',
    transliteration: 'Allāhumma innī as\'aluka ḥubbaka wa ḥubba man yuḥibbuka wa ḥubba \'amalin yuqarribunī ilā ḥubbik',
    translation: 'Ô Allah, je Te demande Ton amour, l\'amour de celui qui T\'aime et l\'amour de tout acte qui me rapproche de Ton amour.',
    source: 'Tirmidhi 3490',
  },
  {
    id: '55', category: 'general', situation: 'Pour le Paradis',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ',
    transliteration: 'Allāhumma innī as\'aluka-l-jannata wa a\'ūdhu bika mina-n-nār',
    translation: 'Ô Allah, je Te demande le Paradis et je cherche refuge auprès de Toi contre le Feu.',
    source: 'Abu Dawud 792',
  },
  {
    id: '56', category: 'general', situation: 'Après la prière',
    arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
    transliteration: 'Allāhumma a\'innī \'alā dhikrika wa shukrika wa ḥusni \'ibādatik',
    translation: 'Ô Allah, aide-moi à T\'invoquer, à Te remercier et à T\'adorer convenablement.',
    source: 'Abu Dawud 1522',
  },
  {
    id: '57', category: 'general', situation: 'Du\'a de Moïse ﷺ',
    arabic: 'رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ',
    transliteration: 'Rabbi innī limā anzalta ilayya min khayrin faqīr',
    translation: 'Seigneur, j\'ai vraiment besoin du bien que Tu feras descendre sur moi.',
    source: 'Coran 28:24',
  },
  {
    id: '58', category: 'mosque', situation: 'Du\'a de l\'appel à la prière (après l\'Adhan)',
    arabic: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ',
    transliteration: 'Allāhumma Rabba hādhihi-d-da\'wati-t-tāmmati wa-ṣ-ṣalāti-l-qā\'ima, āti Muḥammadan-il-wasīlata wa-l-faḍīlata',
    translation: 'Ô Allah, Seigneur de cet appel parfait et de la prière imminente, accorde à Muḥammad la Wasīla et la faveur.',
    source: 'Bukhari 614',
  },
  {
    id: '59', category: 'repas', situation: 'Si on oublie de dire Bismillah',
    arabic: 'بِسْمِ اللَّهِ أَوَّلَهُ وَآخِرَهُ',
    transliteration: 'Bismillāhi awwalahu wa ākhirahu',
    translation: 'Au nom d\'Allah, au début et à la fin (à dire si on a oublié de dire Bismillah en commençant).',
    source: 'Abu Dawud 3767',
  },
  {
    id: '60', category: 'pluie', situation: 'Quand il y a du tonnerre',
    arabic: 'سُبْحَانَ الَّذِي يُسَبِّحُ الرَّعْدُ بِحَمْدِهِ وَالْمَلَائِكَةُ مِنْ خِيفَتِهِ',
    transliteration: 'Subḥāna-lladhī yusabbiḥu-r-ra\'du bi-ḥamdihī wa-l-malā\'ikatu min khīfatih',
    translation: 'Gloire à Celui dont le tonnerre célèbre la louange et les anges aussi, par crainte de Lui.',
    source: 'Muwatta 551',
  },
];

const FAVORITES_KEY = 'oumoul_dua_favorites';

// ─── Screen ───────────────────────────────────────────────────────────────────

export function DuaScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavOnly, setShowFavOnly] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(FAVORITES_KEY).then((v) => {
      if (v) setFavorites(new Set(JSON.parse(v)));
    });
  }, []);

  const toggleFav = useCallback(async (id: string) => {
    void awardEvent('dua_used');
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      SecureStore.setItemAsync(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let list = DUAS;
    if (activeCategory !== 'all') list = list.filter((d) => d.category === activeCategory);
    if (showFavOnly) list = list.filter((d) => favorites.has(d.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) => d.situation.toLowerCase().includes(q) || d.translation.toLowerCase().includes(q) || d.transliteration.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, showFavOnly, search, favorites]);

  const shareDua = useCallback(async (dua: Dua) => {
    await Share.share({
      message: `${dua.situation}\n\n${dua.arabic}\n\n${dua.transliteration}\n\n${dua.translation}\n\n(Source: ${dua.source})`,
    });
  }, []);

  return (
    <View style={[d.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={d.header}>
        <BackButton onPress={onBack} />
        <Text style={d.headerTitle}>Du'as & Invocations</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <HelpTip screenName="Du'as" tips={[
            { icon: 'book', title: '22 invocations', description: 'Collection de duas pour différentes situations de la vie quotidienne.' },
            { icon: 'search', title: 'Recherche', description: 'Trouve facilement une invocation par mot-clé ou catégorie.' },
            { icon: 'star', title: 'Favoris', description: 'Marque tes duas préférées pour y accéder rapidement.' },
            { icon: 'share-social', title: 'Partage', description: 'Partage les duas avec tes proches.' },
          ]} />
          <TouchableOpacity
            style={[d.favToggle, showFavOnly && { backgroundColor: '#FFC107' }]}
            onPress={() => setShowFavOnly((v) => !v)}
          >
            <Ionicons name={showFavOnly ? 'star' : 'star-outline'} size={18} color={showFavOnly ? '#fff' : palette.textSoft} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={d.searchBox}>
        <Ionicons name="search" size={15} color={palette.textSoft} />
        <TextInput
          style={d.searchInput}
          placeholder="Rechercher une invocation..."
          placeholderTextColor={palette.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={palette.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        style={d.catList}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[d.catChip, activeCategory === item.id && d.catChipActive]}
            onPress={() => setActiveCategory(item.id)}
          >
            <Ionicons name={item.icon} size={13} color={activeCategory === item.id ? '#fff' : palette.textSoft} />
            <Text style={[d.catChipText, activeCategory === item.id && { color: '#fff' }]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Count */}
      <Text style={d.countText}>{filtered.length} du'a(s)</Text>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={d.emptyBox}>
            <Ionicons name="book-outline" size={48} color={palette.muted} />
            <Text style={d.emptyTitle}>Aucune invocation trouvée</Text>
            <Text style={d.emptyText}>Essaie une autre recherche ou catégorie</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;
          const isFav = favorites.has(item.id);
          return (
            <TouchableOpacity
              style={[d.card, isExpanded && d.cardActive]}
              onPress={() => setExpandedId(isExpanded ? null : item.id)}
              activeOpacity={0.8}
            >
              <View style={d.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={d.situation}>{item.situation}</Text>
                  <Text style={d.source}>{item.source}</Text>
                </View>
                <View style={d.cardActions}>
                  <TouchableOpacity onPress={() => void toggleFav(item.id)}>
                    <Ionicons name={isFav ? 'star' : 'star-outline'} size={18} color={isFav ? '#FFC107' : palette.muted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => void shareDua(item)}>
                    <Ionicons name="share-social-outline" size={18} color={palette.muted} />
                  </TouchableOpacity>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.muted} />
                </View>
              </View>

              {/* Arabic always visible */}
              <Text style={d.arabic}>{item.arabic}</Text>

              {isExpanded && (
                <>
                  <Text style={d.transliteration}>{item.transliteration}</Text>
                  <View style={d.divider} />
                  <Text style={d.translation}>{item.translation}</Text>
                </>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const d = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  favToggle: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, backgroundColor: palette.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: palette.border, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: palette.text },
  catList: { maxHeight: 44, marginBottom: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  catChipActive: { backgroundColor: palette.primaryDark, borderColor: palette.primaryDark },
  catChipText: { fontSize: 12, fontWeight: '600', color: palette.textSoft },
  countText: { fontSize: 12, color: palette.muted, paddingHorizontal: 20, marginBottom: 8 },
  card: { backgroundColor: palette.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: palette.border },
  cardActive: { borderColor: palette.primaryDark, borderWidth: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  situation: { fontSize: 14, fontWeight: '700', color: palette.text },
  source: { fontSize: 11, color: palette.muted, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  arabic: { fontSize: 22, fontFamily: 'Amiri-Regular', color: palette.arabic, textAlign: 'right', lineHeight: 38 },
  transliteration: { fontSize: 13, fontStyle: 'italic', color: palette.textSoft, marginTop: 10, lineHeight: 20 },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: 10 },
  translation: { fontSize: 14, color: palette.text, lineHeight: 22 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: palette.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: palette.textSoft, marginTop: 4 },
});
