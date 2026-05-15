import { useState, useCallback, useRef } from 'react';
import * as Speech from 'expo-speech';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/theme-context';

const { width: SCREEN_W } = Dimensions.get('window');

function speak(text: string, lang = 'ar-SA') {
  Speech.stop();
  Speech.speak(text, { language: lang, rate: 0.75, pitch: 1.0 });
}

// ── Arabic Alphabet Data ──────────────────────────────────────────────────────
const ARABIC_LETTERS = [
  { letter: 'ا', name: 'Alif', example: 'أسد', emoji: '🦁', transliteration: 'a' },
  { letter: 'ب', name: 'Ba', example: 'باب', emoji: '🚪', transliteration: 'b' },
  { letter: 'ت', name: 'Ta', example: 'تفاحة', emoji: '🍎', transliteration: 't' },
  { letter: 'ث', name: 'Tha', example: 'ثعلب', emoji: '🦊', transliteration: 'th' },
  { letter: 'ج', name: 'Jim', example: 'جمل', emoji: '🐪', transliteration: 'j' },
  { letter: 'ح', name: 'Ha', example: 'حصان', emoji: '🐴', transliteration: 'ħ' },
  { letter: 'خ', name: 'Kha', example: 'خروف', emoji: '🐑', transliteration: 'kh' },
  { letter: 'د', name: 'Dal', example: 'دجاج', emoji: '🐔', transliteration: 'd' },
  { letter: 'ذ', name: 'Dhal', example: 'ذئب', emoji: '🐺', transliteration: 'dh' },
  { letter: 'ر', name: 'Ra', example: 'رمان', emoji: '🍎', transliteration: 'r' },
  { letter: 'ز', name: 'Zay', example: 'زرافة', emoji: '🦒', transliteration: 'z' },
  { letter: 'س', name: 'Sin', example: 'سمكة', emoji: '🐟', transliteration: 's' },
  { letter: 'ش', name: 'Shin', example: 'شمس', emoji: '☀️', transliteration: 'sh' },
  { letter: 'ص', name: 'Sad', example: 'صقر', emoji: '🦅', transliteration: 'ṣ' },
  { letter: 'ض', name: 'Dad', example: 'ضفدع', emoji: '🐸', transliteration: 'ḍ' },
  { letter: 'ط', name: 'Ta', example: 'طاووس', emoji: '🦚', transliteration: 'ṭ' },
  { letter: 'ظ', name: 'Dha', example: 'ظبي', emoji: '🦌', transliteration: 'ẓ' },
  { letter: 'ع', name: 'Ain', example: 'عنب', emoji: '🍇', transliteration: 'ʿ' },
  { letter: 'غ', name: 'Ghain', example: 'غزال', emoji: '🦌', transliteration: 'gh' },
  { letter: 'ف', name: 'Fa', example: 'فراشة', emoji: '🦋', transliteration: 'f' },
  { letter: 'ق', name: 'Qaf', example: 'قمر', emoji: '🌙', transliteration: 'q' },
  { letter: 'ك', name: 'Kaf', example: 'كتاب', emoji: '📚', transliteration: 'k' },
  { letter: 'ل', name: 'Lam', example: 'ليمون', emoji: '🍋', transliteration: 'l' },
  { letter: 'م', name: 'Mim', example: 'مسجد', emoji: '🕌', transliteration: 'm' },
  { letter: 'ن', name: 'Nun', example: 'نجمة', emoji: '⭐', transliteration: 'n' },
  { letter: 'ه', name: 'Ha', example: 'هلال', emoji: '🌙', transliteration: 'h' },
  { letter: 'و', name: 'Waw', example: 'وردة', emoji: '🌹', transliteration: 'w' },
  { letter: 'ي', name: 'Ya', example: 'يد', emoji: '✋', transliteration: 'y' },
];

// ── Prophets Stories ──────────────────────────────────────────────────────────
const PROPHETS = [
  {
    name: 'Adam ﷤', emoji: '🌿', short: 'Le premier homme créé par Allah', color: '#1A7F64',
    story: [
      '🌱 Allah créa Adam avec de la terre et lui souffla la vie.',
      '👼 Les anges se prosternèrent devant Adam sur ordre d\'Allah.',
      '😈 Iblis (Shaytan) refusa de se prosterner par orgueil.',
      '🏡 Adam et Hawa (Ève) vécurent au Paradis.',
      '🍎 Shaytan les trompa et ils mangèrent du fruit interdit.',
      '🌍 Allah les envoya sur Terre, mais Il leur pardonna.',
      '🙏 Adam est le premier prophète et premier homme.',
      '📖 Sa leçon : repens-toi toujours, Allah pardonne !',
    ],
  },
  {
    name: 'Nouh ﷤', emoji: '🚢', short: 'Le prophète qui construisit l\'arche', color: '#2563EB',
    story: [
      '⏳ Nouh prêcha son peuple pendant 950 ans !',
      '🚫 Son peuple refusait de croire en Allah.',
      '⚠️ Allah ordonna à Nouh de construire une grande arche.',
      '🐘 Il fit monter une paire de chaque animal.',
      '🌊 Un déluge immense recouvrit toute la Terre.',
      '🕊️ Une colombe lui apporta une feuille d\'olivier : la paix.',
      '☀️ Les eaux se retirèrent et la vie recommença.',
      '📖 Sa leçon : la patience et la foi en Allah paient toujours.',
    ],
  },
  {
    name: 'Ibrahim ﷤', emoji: '🔥', short: 'Le Khalilullah, ami d\'Allah', color: '#D97706',
    story: [
      '🌟 Ibrahim est appelé "Khalilullah" — l\'Ami d\'Allah.',
      '🪨 Il brisa les idoles de son peuple pour leur montrer la vérité.',
      '🔥 Son peuple le jeta dans un immense feu.',
      '❄️ Allah ordonna au feu d\'être frais et sûr pour Ibrahim !',
      '🌙 Ibrahim reçut la vision de sacrifier son fils Ismaïl.',
      '🐑 Allah envoya un bélier à la place — c\'est l\'Aïd al-Adha !',
      '🕋 Ibrahim et son fils Ismaïl construisirent la Kaaba à La Mecque.',
      '📖 Sa leçon : fais confiance à Allah dans toutes les épreuves.',
    ],
  },
  {
    name: 'Moussa ﷤', emoji: '🪄', short: 'Le prophète qui parla à Allah', color: '#7C3AED',
    story: [
      '👶 Moussa bébé fut mis dans un panier sur le Nil pour le protéger.',
      '👸 La femme de Pharaon le trouva et l\'adopta.',
      '🌿 Allah lui parla dans un buisson ardent sur le mont Sinaï.',
      '🪄 Allah lui donna le bâton magique comme miracle.',
      '🐍 Son bâton se transforma en serpent devant Pharaon.',
      '🌊 Moussa sépara la mer Rouge pour sauver les Bani Israïl.',
      '📜 Allah révéla la Torah à Moussa.',
      '📖 Sa leçon : Allah est toujours avec ceux qui obéissent à Lui.',
    ],
  },
  {
    name: 'Issa ﷤', emoji: '✨', short: 'Le prophète né d\'une vierge', color: '#0891B2',
    story: [
      '✨ Issa (Jésus) naquit miraculeusement de Maryam sans père.',
      '👶 Bébé, il parla dans le berceau pour défendre sa mère.',
      '🩺 Il guérissait les malades et redonnait la vue aux aveugles.',
      '🐦 Il créait des oiseaux d\'argile et leur soufflait la vie.',
      '📖 Allah lui révéla l\'Injil (l\'Évangile).',
      '☁️ Allah éleva Issa au ciel — il n\'est pas mort sur la croix.',
      '🕊️ Issa reviendra avant la fin des temps.',
      '📖 Sa leçon : les miracles viennent d\'Allah seul.',
    ],
  },
  {
    name: 'Muhammad ﷺ', emoji: '🕌', short: 'Le dernier et plus grand des prophètes', color: '#059669',
    story: [
      '🌟 Muhammad ﷺ naquit à La Mecque, en l\'an de l\'Éléphant.',
      '💎 On l\'appelait "Al-Amine" : le Digne de confiance.',
      '📖 À 40 ans, l\'ange Jibril lui apporta le 1er verset du Coran.',
      '🌙 Le voyage nocturne (Isra & Mi\'raj) : il monta jusqu\'au ciel.',
      '🕋 Il fit la Hijra de La Mecque à Médine.',
      '☮️ Il conquit La Mecque sans violence.',
      '🌍 Il est le dernier prophète, envoyé pour toute l\'humanité.',
      '📖 Sa leçon : suis le Coran et la Sunna — c\'est la voie du bonheur.',
    ],
  },
];

// ── Islamic Kids Lessons ──────────────────────────────────────────────────────
const KIDS_LESSONS = [
  {
    title: 'Les 5 piliers', emoji: '🕌', desc: 'Shahada, Salat, Zakat, Sawm, Hajj', color: '#1A7F64', ageGroup: '7+',
    content: [
      { icon: '☝️', subtitle: '1. La Shahada', text: 'Dire : "Il n\'y a de dieu qu\'Allah et Muhammad est Son messager." C\'est la clé de l\'Islam !' },
      { icon: '🤲', subtitle: '2. La Salat (Prière)', text: 'Prier 5 fois par jour : Fajr, Dhuhr, Asr, Maghrib, Isha. C\'est notre conversation directe avec Allah.' },
      { icon: '💰', subtitle: '3. La Zakat (Aumône)', text: 'Donner 2,5% de ses économies aux pauvres chaque année. Partager, c\'est purifier son argent.' },
      { icon: '🌙', subtitle: '4. Le Sawm (Jeûne)', text: 'Jeûner pendant le mois de Ramadan. On ne mange ni boit du lever au coucher du soleil.' },
      { icon: '🕋', subtitle: '5. Le Hajj (Pèlerinage)', text: 'Faire le voyage à La Mecque au moins une fois dans sa vie si on en a la capacité.' },
    ],
  },
  {
    title: 'La Wudou', emoji: '💧', desc: 'Comment faire les ablutions étape par étape', color: '#2563EB', ageGroup: '5+',
    content: [
      { icon: '🙏', subtitle: 'Intention', text: 'Commence par faire l\'intention dans ton cœur de faire le wudou pour Allah.' },
      { icon: '✋', subtitle: '1. Les mains', text: 'Lave tes mains 3 fois jusqu\'aux poignets. Commence par la droite !' },
      { icon: '💧', subtitle: '2. La bouche & le nez', text: 'Rince ta bouche 3 fois. Aspire de l\'eau dans ton nez et souffle 3 fois.' },
      { icon: '😊', subtitle: '3. Le visage', text: 'Lave tout ton visage 3 fois, du front au menton, d\'une oreille à l\'autre.' },
      { icon: '💪', subtitle: '4. Les bras', text: 'Lave ton bras droit jusqu\'au coude 3 fois, puis le gauche 3 fois.' },
      { icon: '👆', subtitle: '5. La tête', text: 'Passe tes mains humides sur ta tête une fois, de l\'avant vers l\'arrière.' },
      { icon: '👂', subtitle: '6. Les oreilles', text: 'Nettoie l\'intérieur et l\'extérieur de tes oreilles avec tes doigts.' },
      { icon: '🦶', subtitle: '7. Les pieds', text: 'Lave le pied droit jusqu\'à la cheville 3 fois, puis le gauche 3 fois.' },
    ],
  },
  {
    title: 'La Salat', emoji: '🤲', desc: 'Les étapes de la prière en images', color: '#7C3AED', ageGroup: '7+',
    content: [
      { icon: '🧹', subtitle: 'Préparation', text: 'Fais le wudou, mets-toi face à la Qibla (direction de La Mecque), pose ton tapis.' },
      { icon: '☝️', subtitle: 'Takbir', text: 'Lève les mains et dis : "Allahu Akbar" — Allah est le Plus Grand !' },
      { icon: '📖', subtitle: 'Al-Fatiha', text: 'Récite la sourate Al-Fatiha. C\'est l\'ouverture du Coran et le pilier de la prière.' },
      { icon: '🙇', subtitle: 'Le Ruku', text: 'Penche-toi en avant, mains sur les genoux, dos droit. Dis "Subhana Rabbiya Al-Azim" 3 fois.' },
      { icon: '🧎', subtitle: 'Le Sujoud', text: 'Mets le front sur le sol. 7 parties du corps touchent le sol. C\'est le moment le plus proche d\'Allah !' },
      { icon: '🙏', subtitle: 'Le Tashahhud', text: 'Assis, récite le Tashahhud : témoignage de foi envers Allah et le Prophète ﷺ.' },
      { icon: '👋', subtitle: 'Le Salam', text: 'Tourne la tête à droite et à gauche en disant "As-Salam alaykum wa rahmatullah".' },
    ],
  },
  {
    title: "Les Du'as simples", emoji: '🌟', desc: 'Invocations du quotidien pour enfants', color: '#D97706', ageGroup: '3+',
    content: [
      { icon: '🍽️', subtitle: 'Avant de manger', text: '"Bismillah" — Au nom d\'Allah. Ne jamais oublier de dire Bismillah avant de manger !' },
      { icon: '✅', subtitle: 'Après avoir mangé', text: '"Al-hamdulillah" — Merci à Allah pour ce repas.' },
      { icon: '😴', subtitle: 'Avant de dormir', text: '"Allahuma bismika amutu wa ahya" — Ô Allah, en Ton nom je meurs et je vis.' },
      { icon: '☀️', subtitle: 'Au réveil', text: '"Al-hamdulillahi alladhi ahyana" — Louange à Allah qui nous a redonné la vie.' },
      { icon: '🚽', subtitle: 'Aux toilettes', text: 'Dis "Bismillah" avant d\'entrer, et "Ghufranaka" (Ton pardon) en sortant.' },
      { icon: '🚗', subtitle: 'Dans un véhicule', text: '"Subhanalladhi sakhkhara lana hadha" — Gloire à Allah qui nous a soumis cela.' },
    ],
  },
  {
    title: 'Les Bonnes manières', emoji: '😊', desc: 'Salam, respect des parents, partage', color: '#EC4899', ageGroup: '3+',
    content: [
      { icon: '👋', subtitle: 'Le Salam', text: 'Toujours dire "Assalamu alaykum" en entrant quelque part. C\'est une dou\'a pour les autres !' },
      { icon: '👨‍👩‍👧', subtitle: 'Respecter ses parents', text: 'Allah dit dans le Coran de respecter ses parents après Lui. Ne dis jamais "ouf" à tes parents !' },
      { icon: '🤝', subtitle: 'La droite en premier', text: 'Mange, bois, donne et prends toujours avec la main droite. C\'est la Sunna du Prophète ﷺ.' },
      { icon: '🤫', subtitle: 'Ne pas mentir', text: 'Le Prophète ﷺ a dit que le mensonge mène au mal. Sois toujours honnête !' },
      { icon: '🎁', subtitle: 'Partager', text: 'Partager avec les autres, c\'est la Sadaqa. Même un sourire est une Sadaqa !' },
      { icon: '🧹', subtitle: 'La propreté', text: '"La propreté fait partie de la foi." Garde ton corps, tes vêtements et ta chambre propres.' },
    ],
  },
  {
    title: 'Ramadan pour enfants', emoji: '🌙', desc: 'Comprendre le Ramadan et ses bénédictions', color: '#6366F1', ageGroup: '7+',
    content: [
      { icon: '🌙', subtitle: 'C\'est quoi le Ramadan ?', text: 'Le Ramadan est le 9ème mois du calendrier islamique. C\'est le mois où le Coran a été révélé !' },
      { icon: '🍽️', subtitle: 'Le jeûne', text: 'On ne mange ni boit du lever (Fajr) au coucher du soleil (Maghrib). On s\'entraîne à la patience.' },
      { icon: '🌅', subtitle: 'Le Suhour', text: 'Le repas avant l\'aube s\'appelle le Suhour. Le Prophète ﷺ a dit qu\'il est béni !' },
      { icon: '🌇', subtitle: 'L\'Iftar', text: 'On rompt le jeûne au coucher du soleil avec une datte et de l\'eau, comme le Prophète ﷺ.' },
      { icon: '⭐', subtitle: 'Laylat al-Qadr', text: 'La nuit du Destin vaut mieux que 1000 mois ! Elle est dans les 10 dernières nuits de Ramadan.' },
      { icon: '🎉', subtitle: 'L\'Aïd al-Fitr', text: 'Après le Ramadan, c\'est l\'Aïd ! On se lève tôt, on prie, on se fait des cadeaux. Aïd Moubarak !' },
    ],
  },
  {
    title: 'Les Anges', emoji: '👼', desc: 'Qui sont les anges et leur rôle', color: '#0891B2', ageGroup: '7+',
    content: [
      { icon: '✨', subtitle: 'Qui sont les anges ?', text: 'Les anges sont créés de lumière. Ils n\'ont ni faim ni fatigue. Ils obéissent toujours à Allah.' },
      { icon: '📖', subtitle: 'Jibril', text: 'L\'ange Jibril (Gabriel) apportait les révélations aux prophètes. Il apporta le Coran à Muhammad ﷺ.' },
      { icon: '💨', subtitle: 'Mikail', text: 'L\'ange Mikail est chargé de la pluie et de la végétation sur Terre.' },
      { icon: '📝', subtitle: 'Raqib & Atid', text: 'Deux anges nous accompagnent toujours : Raqib note les bonnes actions, Atid note les mauvaises.' },
      { icon: '😴', subtitle: 'Israfil', text: 'L\'ange Israfil soufflera dans la trompette pour annoncer la fin des temps.' },
      { icon: '🙏', subtitle: 'Les anges font du Dhikr', text: 'Les anges font constamment Tasbiha : "Subhanallah". Ils prient pour les croyants.' },
    ],
  },
  {
    title: 'Le Paradis', emoji: '🌺', desc: 'Les belles descriptions du Jannah', color: '#059669', ageGroup: '5+',
    content: [
      { icon: '🌟', subtitle: 'C\'est quoi le Jannah ?', text: 'Le Jannah (Paradis) est la plus belle récompense qu\'Allah prépare pour les croyants obéissants.' },
      { icon: '🏡', subtitle: 'Les palais', text: 'Au Paradis, il y a des palais de perles, d\'or et d\'argent. Tout ce qu\'on désire apparaît !' },
      { icon: '🍇', subtitle: 'Les fruits', text: 'Des fruits qu\'on n\'a jamais goûtés sur Terre. Des rivières de lait, de miel et d\'eau pure !' },
      { icon: '😊', subtitle: 'Pas de tristesse', text: 'Au Paradis, personne n\'est triste, malade ou fatigué. Tout le monde est heureux pour toujours.' },
      { icon: '🤲', subtitle: 'Voir Allah', text: 'La plus grande joie au Paradis : voir Allah ! Ce sera le plus beau moment de la vie éternelle.' },
      { icon: '💫', subtitle: 'Comment y aller ?', text: 'En croyant en Allah, en priant, en étant gentil et en obéissant à Allah et au Prophète ﷺ.' },
    ],
  },
];

// ── Kid Duas ─────────────────────────────────────────────────────────────────
const KIDS_DUAS = [
  { title: 'Avant de manger', arabic: 'بِسْمِ اللَّهِ', transliteration: 'Bismillah', french: 'Au nom d\'Allah', emoji: '🍽️' },
  { title: 'Après avoir mangé', arabic: 'الْحَمْدُ لِلَّهِ', transliteration: 'Al-ḥamdu lillāh', french: 'Louange à Allah', emoji: '✅' },
  { title: 'En entrant chez soi', arabic: 'بِسْمِ اللَّهِ وَلَجْنَا', transliteration: 'Bismillahi walajna', french: 'Au nom d\'Allah nous entrons', emoji: '🏠' },
  { title: 'Avant de dormir', arabic: 'اللَّهُمَّ بِاسْمِكَ أَمُوتُ وَأَحْيَا', transliteration: 'Allāhumma bismika amūtu wa aḥyā', french: 'Ô Allah en Ton nom je meurs et je vis', emoji: '😴' },
  { title: 'Au réveil', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا', transliteration: 'Al-ḥamdu lillāhil-ladhī aḥyānā', french: 'Louange à Allah qui nous a redonné vie', emoji: '☀️' },
  { title: 'En sortant de chez soi', arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ', transliteration: 'Bismillāhi tawakkaltu ʿalallāh', french: 'Au nom d\'Allah, je me confie à Allah', emoji: '🚪' },
];

type Tab = 'alphabet' | 'prophets' | 'lessons' | 'duas';
type Prophet = typeof PROPHETS[0];
type Lesson = typeof KIDS_LESSONS[0];

export function KidsModuleScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { palette: p } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('alphabet');
  const [selectedLetter, setSelectedLetter] = useState<typeof ARABIC_LETTERS[0] | null>(null);
  const [selectedProphet, setSelectedProphet] = useState<Prophet | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizChosen, setQuizChosen] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const starAnim = useRef(new Animated.Value(0)).current;

  const playWithFeedback = useCallback((id: string, text: string, lang = 'ar-SA') => {
    setPlayingId(id);
    speak(text, lang);
    setTimeout(() => setPlayingId(null), 2000);
  }, []);

  const showStarReward = useCallback(() => {
    starAnim.setValue(0);
    Animated.sequence([
      Animated.spring(starAnim, { toValue: 1, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(starAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [starAnim]);

  const tabs: Array<{ key: Tab; label: string; emoji: string }> = [
    { key: 'alphabet', label: 'Alphabet', emoji: 'ا' },
    { key: 'prophets', label: 'Prophètes', emoji: '🌟' },
    { key: 'lessons', label: 'Islam', emoji: '📚' },
    { key: 'duas', label: 'Du\'as', emoji: '🤲' },
  ];

  // ── Quiz helpers ──
  const quizLetter = ARABIC_LETTERS[quizIndex % ARABIC_LETTERS.length];
  const quizOptions = useCallback(() => {
    const correct = quizLetter.name;
    const others = ARABIC_LETTERS
      .filter((l) => l.name !== correct)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((l) => l.name);
    return [...others, correct].sort(() => Math.random() - 0.5);
  }, [quizLetter.name]);

  const handleQuizAnswer = (answer: string) => {
    if (quizAnswered) return;
    setQuizChosen(answer);
    setQuizAnswered(true);
    if (answer === quizLetter.name) {
      setQuizScore((s) => s + 1);
      Vibration.vibrate(80);
      showStarReward();
      speak(quizLetter.letter);
    } else {
      Vibration.vibrate([0, 60, 60, 60]);
    }
  };

  const nextQuizQuestion = () => {
    setQuizIndex((i) => i + 1);
    setQuizAnswered(false);
    setQuizChosen(null);
  };

  return (
    <View style={[k.screen, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      {/* Header */}
      <View style={k.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={p.primaryDark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[k.headerTitle, { color: p.text }]}>👶 Module Enfants</Text>
          <Text style={[k.headerSub, { color: p.textSoft }]}>Apprends l'Islam en s'amusant</Text>
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={k.tabBar} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingRight: 8 }}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[k.tab, activeTab === tab.key && { backgroundColor: p.primaryDark }]}
            onPress={() => { setActiveTab(tab.key); setSelectedLetter(null); setSelectedProphet(null); setSelectedLesson(null); setQuizMode(false); }}
            activeOpacity={0.75}
          >
            <Text style={k.tabEmoji}>{tab.emoji}</Text>
            <Text style={[k.tabLabel, activeTab === tab.key && { color: '#fff' }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── ALPHABET TAB ── */}
      {activeTab === 'alphabet' && !selectedLetter && !quizMode && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 12 }}>
            <Text style={[k.sectionTitle, { color: p.text }]}>Alphabet Arabe</Text>
            <TouchableOpacity
              style={[k.quizBtn, { backgroundColor: p.primaryDark }]}
              onPress={() => { setQuizMode(true); setQuizIndex(0); setQuizScore(0); setQuizAnswered(false); setQuizChosen(null); }}
            >
              <Ionicons name="game-controller" size={14} color="#fff" />
              <Text style={k.quizBtnText}>Quiz</Text>
            </TouchableOpacity>
          </View>
          <View style={k.alphabetGrid}>
            {ARABIC_LETTERS.map((item) => (
              <TouchableOpacity
                key={item.letter}
                style={[k.letterCard, { backgroundColor: p.card, borderColor: playingId === item.letter ? p.primaryDark : p.border }]}
                onPress={() => setSelectedLetter(item)}
                onLongPress={() => playWithFeedback(item.letter, item.letter)}
                activeOpacity={0.75}
              >
                <Text style={k.letterEmoji}>{item.emoji}</Text>
                <Text style={[k.letterBig, { color: p.primaryDark }]}>{item.letter}</Text>
                <Text style={[k.letterName, { color: p.text }]}>{item.name}</Text>
                {playingId === item.letter && (
                  <Ionicons name="volume-high" size={12} color={p.primaryDark} style={{ marginTop: 2 }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[k.hintText, { color: p.textSoft }]}>💡 Appuie long sur une lettre pour l'entendre</Text>
        </ScrollView>
      )}

      {/* ── LETTER DETAIL ── */}
      {activeTab === 'alphabet' && selectedLetter && (
        <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setSelectedLetter(null)} style={{ alignSelf: 'flex-start', marginBottom: 16 }}>
            <Text style={[k.backLink, { color: p.primaryDark }]}>← Retour</Text>
          </TouchableOpacity>
          <View style={[k.letterDetail, { backgroundColor: p.card }]}>
            <Text style={k.detailEmoji}>{selectedLetter.emoji}</Text>
            <Text style={[k.detailLetter, { color: p.primaryDark }]}>{selectedLetter.letter}</Text>
            <Text style={[k.detailName, { color: p.text }]}>{selectedLetter.name}</Text>
            <Text style={[k.detailTranslit, { color: p.textSoft }]}>/{selectedLetter.transliteration}/</Text>

            {/* Audio button */}
            <TouchableOpacity
              style={[k.audioBtn, { backgroundColor: playingId === selectedLetter.letter ? '#D1FAE5' : p.primaryDark + '18', borderColor: p.primaryDark }]}
              onPress={() => playWithFeedback(selectedLetter.letter, selectedLetter.letter)}
              activeOpacity={0.8}
            >
              <Ionicons name={playingId === selectedLetter.letter ? 'volume-high' : 'play-circle'} size={22} color={p.primaryDark} />
              <Text style={[k.audioBtnText, { color: p.primaryDark }]}>
                {playingId === selectedLetter.letter ? 'Écoute...' : 'Écouter la lettre'}
              </Text>
            </TouchableOpacity>

            <View style={[k.exampleBox, { backgroundColor: p.bgAlt ?? p.bg, borderColor: p.border }]}>
              <Text style={[k.exampleArabic, { color: p.text }]}>{selectedLetter.example}</Text>
              <Text style={k.exampleEmoji}>{selectedLetter.emoji}</Text>
              <TouchableOpacity
                style={[k.audioBtn, { backgroundColor: p.primaryDark + '18', borderColor: p.primaryDark, marginTop: 8 }]}
                onPress={() => playWithFeedback(`ex-${selectedLetter.letter}`, selectedLetter.example)}
              >
                <Ionicons name="volume-medium" size={18} color={p.primaryDark} />
                <Text style={[k.audioBtnText, { color: p.primaryDark }]}>Écouter l'exemple</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── QUIZ MODE ── */}
      {activeTab === 'alphabet' && quizMode && (
        <ScrollView
          contentContainerStyle={{ padding: 20, alignItems: 'center', paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[k.quizScore, { color: p.primaryDark }]}>Score : {quizScore} / {quizIndex}</Text>
          <View style={[k.quizCard, { backgroundColor: p.card, width: SCREEN_W - 40 }]}>
            <Text style={[k.quizLetter, { color: p.primaryDark }]}>{quizLetter.letter}</Text>
            <Text style={k.quizEmoji}>{quizLetter.emoji}</Text>
            <Text style={[k.quizQuestion, { color: p.textSoft }]}>Quelle est cette lettre ?</Text>
          </View>
          <View style={[k.quizOptions, { width: SCREEN_W - 40 }]}>
            {quizOptions().map((opt) => {
              const isCorrect = opt === quizLetter.name;
              const isChosen = opt === quizChosen;
              let bg = p.card;
              if (quizAnswered && isCorrect) bg = '#D1FAE5';
              if (quizAnswered && isChosen && !isCorrect) bg = '#FEE2E2';
              return (
                <TouchableOpacity
                  key={opt}
                  style={[k.quizOption, { backgroundColor: bg, borderColor: p.border }]}
                  onPress={() => handleQuizAnswer(opt)}
                  activeOpacity={0.75}
                >
                  <Text style={[k.quizOptionText, { color: p.text }]}>{opt}</Text>
                  {quizAnswered && isCorrect && <Ionicons name="checkmark-circle" size={20} color="#059669" />}
                  {quizAnswered && isChosen && !isCorrect && <Ionicons name="close-circle" size={20} color="#DC2626" />}
                </TouchableOpacity>
              );
            })}
          </View>
          <Animated.Text style={[
            k.starReward,
            { opacity: starAnim, transform: [{ scale: starAnim }, { translateY: starAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) }] },
          ]}>⭐ Bravo !</Animated.Text>
          {quizAnswered && (
            <TouchableOpacity style={[k.nextBtn, { backgroundColor: p.primaryDark }]} onPress={nextQuizQuestion}>
              <Text style={k.nextBtnText}>Question suivante →</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setQuizMode(false)} style={{ marginTop: 16, marginBottom: 8 }}>
            <Text style={[k.backLink, { color: p.textSoft }]}>Arrêter le quiz</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── PROPHETS LIST ── */}
      {activeTab === 'prophets' && !selectedProphet && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={[k.sectionTitle, { color: p.text, marginBottom: 12 }]}>Les Prophètes d'Allah</Text>
          {PROPHETS.map((prophet) => (
            <TouchableOpacity
              key={prophet.name}
              style={[k.prophetCard, { backgroundColor: p.card, borderColor: p.border }]}
              onPress={() => setSelectedProphet(prophet)}
              activeOpacity={0.75}
            >
              <View style={[k.prophetIcon, { backgroundColor: prophet.color + '22' }]}>
                <Text style={k.prophetEmoji}>{prophet.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[k.prophetName, { color: p.text }]}>{prophet.name}</Text>
                <Text style={[k.prophetDesc, { color: p.textSoft }]}>{prophet.short}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={p.muted ?? p.textSoft} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── PROPHET DETAIL ── */}
      {activeTab === 'prophets' && selectedProphet && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setSelectedProphet(null)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 6 }}>
            <Ionicons name="chevron-back" size={18} color={p.primaryDark} />
            <Text style={[k.backLink, { color: p.primaryDark }]}>Tous les prophètes</Text>
          </TouchableOpacity>
          <View style={[k.detailHeader, { backgroundColor: selectedProphet.color + '18', borderColor: selectedProphet.color + '44' }]}>
            <Text style={{ fontSize: 56 }}>{selectedProphet.emoji}</Text>
            <Text style={[k.detailName, { color: selectedProphet.color, marginTop: 8 }]}>{selectedProphet.name}</Text>
            <Text style={[k.detailShort, { color: p.textSoft }]}>{selectedProphet.short}</Text>
          </View>
          <Text style={[k.storyTitle, { color: p.text }]}>Son histoire</Text>
          {selectedProphet.story.map((line, i) => (
            <View key={i} style={[k.storyItem, { backgroundColor: p.card, borderColor: p.border }]}>
              <Text style={[k.storyText, { color: p.text }]}>{line}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── LESSONS LIST ── */}
      {activeTab === 'lessons' && !selectedLesson && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={[k.sectionTitle, { color: p.text, marginBottom: 12 }]}>Apprendre l'Islam</Text>
          {KIDS_LESSONS.map((lesson) => (
            <TouchableOpacity
              key={lesson.title}
              style={[k.lessonCard, { backgroundColor: p.card, borderColor: p.border }]}
              onPress={() => setSelectedLesson(lesson)}
              activeOpacity={0.75}
            >
              <View style={[k.lessonIcon, { backgroundColor: lesson.color + '22' }]}>
                <Text style={k.lessonEmoji}>{lesson.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[k.lessonTitle, { color: p.text }]}>{lesson.title}</Text>
                <Text style={[k.lessonDesc, { color: p.textSoft }]}>{lesson.desc}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[k.ageBadge, { backgroundColor: lesson.color + '22' }]}>
                  <Text style={[k.ageBadgeText, { color: lesson.color }]}>{lesson.ageGroup}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={p.muted ?? p.textSoft} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── LESSON DETAIL ── */}
      {activeTab === 'lessons' && selectedLesson && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setSelectedLesson(null)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 6 }}>
            <Ionicons name="chevron-back" size={18} color={p.primaryDark} />
            <Text style={[k.backLink, { color: p.primaryDark }]}>Toutes les leçons</Text>
          </TouchableOpacity>
          <View style={[k.detailHeader, { backgroundColor: selectedLesson.color + '18', borderColor: selectedLesson.color + '44' }]}>
            <Text style={{ fontSize: 48 }}>{selectedLesson.emoji}</Text>
            <Text style={[k.detailName, { color: selectedLesson.color, marginTop: 8 }]}>{selectedLesson.title}</Text>
            <View style={[k.ageBadge, { backgroundColor: selectedLesson.color + '30', marginTop: 6 }]}>
              <Text style={[k.ageBadgeText, { color: selectedLesson.color }]}>À partir de {selectedLesson.ageGroup}</Text>
            </View>
          </View>
          {selectedLesson.content.map((item, i) => (
            <View key={i} style={[k.contentItem, { backgroundColor: p.card, borderColor: p.border }]}>
              <Text style={k.contentIcon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[k.contentSubtitle, { color: p.primaryDark }]}>{item.subtitle}</Text>
                <Text style={[k.contentText, { color: p.text }]}>{item.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── DUAS TAB ── */}
      {activeTab === 'duas' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={[k.sectionTitle, { color: p.text, marginBottom: 12 }]}>Du'as pour Enfants</Text>
          {KIDS_DUAS.map((dua) => (
            <View key={dua.title} style={[k.duaCard, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={k.duaHeader}>
                <Text style={k.duaEmoji}>{dua.emoji}</Text>
                <Text style={[k.duaTitle, { color: p.text }]}>{dua.title}</Text>
                <TouchableOpacity
                  style={[k.duaPlayBtn, { backgroundColor: playingId === dua.title ? '#D1FAE5' : p.primaryDark + '15' }]}
                  onPress={() => playWithFeedback(dua.title, dua.arabic)}
                >
                  <Ionicons
                    name={playingId === dua.title ? 'volume-high' : 'play'}
                    size={16}
                    color={p.primaryDark}
                  />
                </TouchableOpacity>
              </View>
              <Text style={[k.duaArabic, { color: p.primaryDark }]}>{dua.arabic}</Text>
              <Text style={[k.duaTranslit, { color: p.textSoft }]}>{dua.transliteration}</Text>
              <Text style={[k.duaFrench, { color: p.text }]}>{dua.french}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const k = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },
  tabBar: { flexShrink: 0, marginBottom: 4 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  tabEmoji: { fontSize: 16 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#555' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  backLink: { fontSize: 14, fontWeight: '600' },

  // Alphabet grid
  alphabetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  letterCard: {
    width: '28%', alignItems: 'center', padding: 12,
    borderRadius: 16, borderWidth: 1, minWidth: 90,
  },
  letterEmoji: { fontSize: 22 },
  letterBig: { fontSize: 32, fontFamily: 'Amiri-Bold', marginTop: 4 },
  letterName: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  // Quiz
  quizBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  quizBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  quizScore: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  quizCard: { width: '100%', alignItems: 'center', padding: 32, borderRadius: 24, marginBottom: 24 },
  quizLetter: { fontSize: 72, fontFamily: 'Amiri-Bold' },
  quizEmoji: { fontSize: 36, marginTop: 8 },
  quizQuestion: { fontSize: 14, marginTop: 8 },
  quizOptions: { width: '100%', gap: 10 },
  quizOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, borderWidth: 1 },
  quizOptionText: { fontSize: 16, fontWeight: '600' },
  nextBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Letter detail
  letterDetail: { width: '100%', alignItems: 'center', borderRadius: 24, padding: 32 },
  detailEmoji: { fontSize: 56 },
  detailLetter: { fontSize: 96, fontFamily: 'Amiri-Bold', marginTop: 8 },
  detailName: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  detailTranslit: { fontSize: 16, marginTop: 4 },
  exampleBox: { marginTop: 24, padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', width: '100%' },
  exampleArabic: { fontSize: 32, fontFamily: 'Amiri-Regular' },
  exampleEmoji: { fontSize: 32, marginTop: 8 },

  // Prophets
  prophetCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  prophetIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  prophetEmoji: { fontSize: 26 },
  prophetName: { fontSize: 15, fontWeight: '700' },
  prophetDesc: { fontSize: 12, marginTop: 3 },

  // Detail shared
  detailHeader: { alignItems: 'center', padding: 24, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  detailShort: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  storyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  storyItem: { flexDirection: 'row', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  storyText: { fontSize: 14, lineHeight: 22, flex: 1 },

  // Lesson content
  contentItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  contentIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  contentSubtitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  contentText: { fontSize: 13, lineHeight: 20 },

  // Lessons
  lessonCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  lessonIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  lessonEmoji: { fontSize: 26 },
  lessonTitle: { fontSize: 15, fontWeight: '700' },
  lessonDesc: { fontSize: 12, marginTop: 3 },
  ageBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  ageBadgeText: { fontSize: 11, fontWeight: '700' },

  // Duas
  duaCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  duaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  duaEmoji: { fontSize: 22 },
  duaTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  duaArabic: { fontSize: 22, fontFamily: 'Amiri-Regular', textAlign: 'right', marginBottom: 6 },
  duaTranslit: { fontSize: 13, fontStyle: 'italic', marginBottom: 4 },
  duaFrench: { fontSize: 13 },
  duaPlayBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Audio & hints
  audioBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginTop: 16 },
  audioBtnText: { fontSize: 14, fontWeight: '600' },
  hintText: { fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 4, fontStyle: 'italic' },
  starReward: { fontSize: 28, position: 'absolute', top: '30%' },
});
