import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { palette } from '../theme';

interface ModuleInfo {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  screen: string;
  category: string;
  shortDesc: string;
  longDesc: string;
  features: string[];
}

const MODULE_CATEGORIES = [
  'Prière & Adoration',
  'Coran & Apprentissage',
  'Spiritualité & Dhikr',
  'Vie Musulmane',
  'Outils & Réglages',
] as const;

const MODULES: ModuleInfo[] = [
  // ── Prière & Adoration ──
  {
    id: 'dashboard',
    name: 'Dashboard Moderne IA',
    icon: 'home',
    color: '#10B981',
    screen: 'HomeScreen',
    category: 'Prière & Adoration',
    shortDesc: 'Tableau de bord intelligent avec IA et design moderne',
    longDesc: 'Le dashboard moderne utilise l\'IA pour analyser tes patterns et personnaliser ton expérience. Il affiche les priorités du jour, une vue d\'ensemble avec grid 2x2, des accès rapides, et s\'adapte à ton usage. Le design émeraude+rose offre une expérience visuelle exceptionnelle.',
    features: [
      '🧠 IA adaptative selon tes patterns d\'usage',
      '📊 Vue d\'ensemble moderne (grid 2x2)',
      '🎯 Priorités intelligentes (Ramadan, Imane, prières)',
      '🎨 Design émeraude+rose avec micro-interactions',
      '👆 Swipe gestures fluides sur les cards',
      '📱 Accès rapides personnalisés',
      '🔔 Notifications contextuelles et émotionnelles',
      '🌙 Dark mode toggle instantané',
    ],
  },
  {
    id: 'prayer-tracking',
    name: 'Suivi des prières',
    icon: 'checkmark-done',
    color: '#388E3C',
    screen: 'PrayerTracking',
    category: 'Prière & Adoration',
    shortDesc: 'Enregistre et suis tes 5 prières quotidiennes',
    longDesc: 'Enregistre chaque prière comme « à l\'heure », « en retard » ou « manquée ». Visualise tes statistiques sur la journée, la semaine ou le mois. Tes données sont sauvegardées localement et persistent entre les sessions.',
    features: [
      'Enregistrement par prière (Fajr → Isha)',
      '3 statuts : à l\'heure, en retard, manquée',
      'Vue jour / semaine / mois',
      'Statistiques et pourcentages',
      'Données persistantes (SecureStore)',
    ],
  },
  {
    id: 'prayer-settings',
    name: 'Réglages prière',
    icon: 'settings',
    color: '#607D8B',
    screen: 'PrayerSettingsMore',
    category: 'Prière & Adoration',
    shortDesc: 'Configure la méthode de calcul et le madhab',
    longDesc: 'Choisis ta méthode de calcul des horaires de prière (MWL, ISNA, Egypte, Umm al-Qura, etc.) et ton madhab (Hanafi ou Shafi\'i) pour un calcul précis de l\'Asr.',
    features: [
      'Méthodes de calcul multiples',
      'Choix du madhab (Hanafi / Shafi\'i)',
      'Détection automatique de la position',
    ],
  },
  {
    id: 'mosque-finder',
    name: 'Mosquées à proximité',
    icon: 'business',
    color: '#5D4037',
    screen: 'MosqueFinder',
    category: 'Prière & Adoration',
    shortDesc: 'Trouve les mosquées proches de toi',
    longDesc: 'Utilise ta position GPS pour afficher les mosquées à proximité. Filtre par équipements (parking, espace femmes, cours) et obtiens les horaires de prière et l\'itinéraire.',
    features: [
      'Géolocalisation automatique',
      'Recherche par nom',
      'Filtres par équipements',
      'Horaires de prière de la mosquée',
      'Navigation vers la mosquée',
    ],
  },
  {
    id: 'qibla',
    name: 'Direction Qibla',
    icon: 'compass',
    color: '#00796B',
    screen: 'Qibla',
    category: 'Prière & Adoration',
    shortDesc: 'Boussole pointant vers la Kaaba',
    longDesc: 'Utilise le capteur magnétique de ton téléphone pour indiquer la direction exacte de la Qibla depuis ta position actuelle.',
    features: [
      'Boussole en temps réel',
      'Calcul basé sur ta position GPS',
      'Affichage de la distance vers la Mecque',
    ],
  },

  // ── Coran & Apprentissage ──
  {
    id: 'imane-quran',
    name: 'Lire le Coran',
    icon: 'book',
    color: '#1565C0',
    screen: '__CORAN_TAB__',
    category: 'Coran & Apprentissage',
    shortDesc: 'Lis le Coran avec traduction et tafsir',
    longDesc: 'Parcours les 114 sourates avec le texte arabe, la traduction (français ou anglais), et le tafsir verset par verset. Ajuste la taille de la police, écoute l\'audio, et marque ta dernière lecture.',
    features: [
      '114 sourates complètes',
      'Traduction français / anglais',
      'Tafsir (exégèse) par verset',
      'Audio avec récitateur',
      'Signets et dernière lecture sauvegardée',
      'Recherche de sourates',
      '5 tailles de police',
    ],
  },
  {
    id: 'quran-audio',
    name: 'Écouter le Coran',
    icon: 'musical-notes',
    color: '#7B1FA2',
    screen: 'QuranAudio',
    category: 'Coran & Apprentissage',
    shortDesc: 'Écoute les sourates avec différents récitateurs',
    longDesc: 'Choisis parmi plusieurs récitateurs célèbres et écoute n\'importe quelle sourate. Contrôle la lecture (play, pause, stop) directement depuis l\'app.',
    features: [
      'Plusieurs récitateurs',
      'Lecture par sourate',
      'Contrôles audio (play/pause/stop)',
      'Affichage du récitateur actuel',
    ],
  },
  {
    id: 'quran-words',
    name: '400 Mots Coraniques - Maîtrise ULTRA',
    icon: 'language',
    color: '#FF9800',
    screen: 'QuranWords',
    category: 'Coran & Apprentissage',
    shortDesc: 'Mémorisation contextuelle et gamification avancée',
    longDesc: 'Système ULTRA de maîtrise des 400 mots coraniques les plus fréquents. Mémorisation contextuelle selon les moments de la journée, gamification avec quêtes et achievements, et IA adaptative qui optimise ton apprentissage selon tes patterns personnels.',
    features: [
      '🧠 Mémorisation contextuelle (prière, transport, attente)',
      '🎮 Gamification avec quêtes quotidiennes/hebdomadaires',
      '🏆 15+ achievements épiques et légendaires',
      '🎯 Power-ups intelligents (double points, protection)',
      '📊 Analyse des patterns d\'apprentissage',
      '🔔 Notifications adaptatives selon contexte',
      '📈 Système de niveaux et progression',
      '🌍 Leaderboard communautaire',
    ],
  },
  {
    id: 'tafsir',
    name: 'Tafsir',
    icon: 'document-text',
    color: '#4E342E',
    screen: 'Tafsir',
    category: 'Coran & Apprentissage',
    shortDesc: 'Exégèse et explication des versets',
    longDesc: 'Accède au tafsir (explication détaillée) de chaque verset du Coran pour mieux comprendre le sens et le contexte de la révélation.',
    features: [
      'Tafsir par sourate et verset',
      'Explication en français',
      'Contexte de révélation',
    ],
  },

  // ── Spiritualité & Dhikr ──
  {
    id: 'tasbih',
    name: 'Tasbih (Compteur)',
    icon: 'radio-button-on',
    color: '#C62828',
    screen: 'Tasbih',
    category: 'Spiritualité & Dhikr',
    shortDesc: 'Compteur de dhikr avec vibration et séries',
    longDesc: 'Choisis parmi les dhikrs prédéfinis (SubhanAllah, Alhamdulillah, Allahu Akbar, etc.) ou crée tes propres dhikrs. Compte avec un tap, reçois une vibration à chaque tap, et suis tes séries quotidiennes.',
    features: [
      'Dhikrs prédéfinis (SubhanAllah, etc.)',
      'Création de dhikrs personnalisés',
      'Compteur avec animation de pulsation',
      'Vibration à chaque tap',
      'Barre de progression',
      'Historique des sessions',
      'Suivi de séries (streaks)',
      'Données persistantes',
    ],
  },
  {
    id: 'allah-names',
    name: '99 Noms d\'Allah - Système ULTRA',
    icon: 'heart',
    color: '#E91E63',
    screen: 'AllahNames',
    category: 'Spiritualité & Dhikr',
    shortDesc: 'Mémorisation intelligente avec algorithm Ebbinghaus',
    longDesc: 'Système ULTRA de mémorisation des 99 noms d\'Allah utilisant l\'algorithm Ebbinghaus personnalisé. Rappels intelligents selon contexte (prière, transport), techniques mnémoniques multiples (visuelles, auditives, kinesthésiques), et analyse de performance pour optimiser ton apprentissage.',
    features: [
      '🧠 Algorithm Ebbinghaus personnalisé',
      '📱 Rappels contextuels (prière, transport, attente)',
      '🎨 Techniques mnémoniques multiples',
      '📊 Analyse de performance et adaptation',
      '🎯 Plan d\'apprentissage quotidien personnalisé',
      '🔔 Notifications espacées intelligentes',
      '📈 Tracking de progression par difficulté',
      '🧮 Prédiction de performance basée sur l\'historique',
    ],
  },
  {
    id: 'dhikr',
    name: 'Dhikr & Invocations',
    icon: 'leaf',
    color: '#2E7D32',
    screen: 'DhikrMain',
    category: 'Spiritualité & Dhikr',
    shortDesc: 'Invocations quotidiennes et rappels',
    longDesc: 'Accède à une collection d\'invocations (adhkar) pour le matin, le soir, après la prière, et d\'autres occasions. Enregistre tes sessions de dhikr.',
    features: [
      'Catégories d\'invocations',
      'Adhkar du matin et du soir',
      'Invocations après la prière',
      'Enregistrement des sessions',
    ],
  },
  {
    id: 'hadith-daily',
    name: 'Hadith du jour',
    icon: 'book',
    color: '#4527A0',
    screen: 'HadithDaily',
    category: 'Spiritualité & Dhikr',
    shortDesc: 'Un hadith par jour avec thèmes et favoris',
    longDesc: 'Découvre un hadith différent chaque jour. Filtre par thème (foi, prière, charité, patience, savoir, famille, bonnes manières). Ajoute tes hadiths préférés aux favoris et partage-les.',
    features: [
      'Hadith du jour automatique',
      '7 thèmes de filtrage',
      'Favoris persistants',
      'Partage via les réseaux sociaux',
      'Texte arabe + traduction',
      'Référence (collection + numéro)',
    ],
  },

  // ── Vie Musulmane ──
  {
    id: 'imane-ramadan',
    name: 'Ramadan',
    icon: 'moon',
    color: '#F57C00',
    screen: 'ImaneRamadan',
    category: 'Vie Musulmane',
    shortDesc: 'Suivi du jeûne, rattrapage et rappels push',
    longDesc: 'Suis ton jeûne jour par jour pendant le Ramadan avec 4 statuts (jeûné, raté, exemptée, rattrapé). Suivi du cycle féminin avec auto-exemption. Après le Ramadan, consulte ton bilan complet et génère un programme de rattrapage des jours manqués avec des rappels push.',
    features: [
      'Calcul dynamique des dates de Ramadan',
      'Carte rapide « as-tu jeûné ? » chaque jour',
      '4 statuts de jeûne : jeûné, raté, exemptée, rattrapé',
      'Suivi du cycle féminin avec auto-exemption',
      'Calendrier visuel avec légende couleur',
      'Statistiques : jours jeûnés, ratés, exemptions, rattrapés',
      'Compteur de jours à rattraper',
      'Rappel quotidien de jeûne (push notification)',
      'Bilan de fin de Ramadan avec récapitulatif',
      'Programme de rattrapage (lundis & jeudis ou personnalisé)',
      'Rappels push pour chaque jour de rattrapage',
      'Plan de rattrapage sauvegardé localement',
      'Notes par jour (maladie, voyage, etc.)',
      'Compte à rebours avant Ramadan',
      'Rappels Suhoor et Iftar',
    ],
  },
  {
    id: 'imane-cycle',
    name: 'Suivi du cycle',
    icon: 'heart-circle',
    color: '#AD1457',
    screen: 'ImaneCycle',
    category: 'Vie Musulmane',
    shortDesc: 'Suivi du cycle féminin et impact sur les actes d\'adoration',
    longDesc: 'Enregistre ton cycle menstruel (règles, spotting, postpartum, pureté) et vois automatiquement l\'impact sur tes prières et ton jeûne. Les jours d\'exemption sont marqués automatiquement dans le Ramadan.',
    features: [
      '4 statuts : pure, règles, spotting, postpartum',
      'Calendrier visuel du cycle',
      'Intégration automatique avec le Ramadan',
      'Exemption de prière et jeûne automatique',
      'Historique persistant',
    ],
  },
  {
    id: 'hijri-calendar',
    name: 'Calendrier Hijri',
    icon: 'calendar',
    color: '#00838F',
    screen: 'HijriCalendar',
    category: 'Vie Musulmane',
    shortDesc: 'Dates islamiques et conversion Hijri/Grégorien',
    longDesc: 'Consulte la date Hijri du jour et convertis entre les calendriers Hijri et Grégorien. Identifie les mois sacrés et les dates importantes.',
    features: [
      'Date Hijri du jour',
      'Conversion Hijri ↔ Grégorien',
      'Mois sacrés identifiés',
      'Dates importantes de l\'Islam',
    ],
  },
  {
    id: 'zakat-calculator',
    name: 'Calculateur Zakat',
    icon: 'calculator',
    color: '#1B5E20',
    screen: 'ZakatCalculator',
    category: 'Vie Musulmane',
    shortDesc: 'Calcule la zakat sur tes biens',
    longDesc: 'Entre tes actifs (épargne, or, argent, investissements, commerce, immobilier) et tes dettes. L\'app calcule automatiquement le Nisab et la zakat due (2.5%). Supporte 5 devises.',
    features: [
      '6 catégories d\'actifs',
      '5 devises (FCFA, EUR, USD, GBP, MAD)',
      'Calcul automatique du Nisab',
      'Déduction des dettes',
      'Résultat clair avec statut',
    ],
  },
  {
    id: 'eid-greetings',
    name: 'Cartes de vœux',
    icon: 'gift',
    color: '#AD1457',
    screen: 'EidGreetings',
    category: 'Vie Musulmane',
    shortDesc: 'Partage des cartes de vœux pour l\'Aïd',
    longDesc: 'Choisis parmi 8 cartes de vœux pour l\'Aïd al-Fitr, l\'Aïd al-Adha, le Ramadan et d\'autres occasions. Ajoute un message personnalisé et partage via WhatsApp, SMS ou réseaux sociaux.',
    features: [
      '8 cartes de vœux',
      'Filtre par occasion',
      'Message personnalisé',
      'Partage natif (WhatsApp, SMS, etc.)',
    ],
  },
  {
    id: 'imane-program',
    name: 'Programme Imane IA - Adaptatif',
    icon: 'checkbox',
    color: '#283593',
    screen: 'ImaneProgram',
    category: 'Vie Musulmane',
    shortDesc: 'Programme intelligent qui s\'adapte à ta progression',
    longDesc: 'Programme Imane IA qui analyse ta performance en temps réel et adapte automatiquement la difficulté. 15 tâches quotidiennes intelligentes qui évoluent selon tes capacités, avec suggestions de rattrapage et optimisation basée sur l\'IA.',
    features: [
      '🤖 IA adaptative selon ta performance réelle',
      '📊 Analyse en temps réel des tâches complétées',
      '🎯 15 tâches quotidiennes intelligentes',
      '📈 Difficulté auto-ajustée (facile → difficile)',
      '💡 Suggestions de rattrapage personnalisées',
      '🔥 Streak tracking avec bonus IA',
      '📈 Performance prediction et optimisation',
      '🎯 Objectifs adaptatifs basés sur l\'historique',
    ],
  },

  // ── Outils & Réglages ──
  {
    id: 'global-search',
    name: 'Recherche globale',
    icon: 'search',
    color: '#37474F',
    screen: 'GlobalSearch',
    category: 'Outils & Réglages',
    shortDesc: 'Cherche dans toute l\'app',
    longDesc: 'Recherche instantanée dans toutes les fonctionnalités, les 99 noms d\'Allah et les 400 mots du Coran. Les résultats sont classés par pertinence avec navigation directe.',
    features: [
      'Recherche dans toutes les fonctionnalités',
      'Recherche dans les 99 noms d\'Allah',
      'Recherche dans le vocabulaire coranique',
      'Classement par pertinence',
      'Accès rapide aux fonctionnalités',
    ],
  },
  {
    id: 'gamification',
    name: 'Gamification',
    icon: 'trophy',
    color: '#FF6B35',
    screen: 'Gamification',
    category: 'Outils & Réglages',
    shortDesc: 'Système de gamification avec achievements et quêtes',
    longDesc: 'Système de gamification avec 15+ achievements épiques et légendaires, quêtes dynamiques quotidiennes/hebdomadaires, power-ups intelligents, leaderboard mondial, et events spéciaux (Ramadan, Eid, Jumuah).',
    features: [
      '15+ achievements épiques et légendaires',
      'Quêtes dynamiques quotidiennes/hebdomadaires',
      'Power-ups intelligents (double points, protection)',
      'Leaderboard mondial et communautaire',
      'Events spéciaux (Ramadan, Eid, Jumuah)',
      'Système de niveaux et progression',
      'Récompenses automatiques et streaks',
      'Features sociales (partage, aide)',
    ],
  },
  {
    id: 'ai-system',
    name: 'Système IA',
    icon: 'sparkles',
    color: '#9333EA',
    screen: 'AISystem',
    category: 'Outils & Réglages',
    shortDesc: 'IA adaptative qui analyse et optimise ton apprentissage',
    longDesc: 'Système qui analyse tes patterns d\'apprentissage, prédit ta performance, s\'adapte à ton état émotionnel et environnemental, et génère des rappels ultra-personnalisés selon contexte, heure, et météo.',
    features: [
      'Analyse des patterns d\'apprentissage',
      'Prédiction de performance basée sur l\'historique',
      'Analyse émotionnelle adaptative',
      'Conscience contextuelle (lieu, activité, météo)',
      'Rappels ultra-personnalisés',
      'Recommandations d\'apprentissage IA',
      'Optimisation automatique des sessions',
      'Adaptation continue selon ton évolution',
    ],
  },
  {
    id: 'share-system',
    name: 'Partage Social & WhatsApp',
    icon: 'share-social',
    color: '#25D366',
    screen: 'ShareSystem',
    category: 'Outils & Réglages',
    shortDesc: 'Partage WhatsApp et features sociales intégrées',
    longDesc: 'Partagez facilement vos hadiths, douas, versets et progression via WhatsApp avec intégration native. Features sociales pour inspirer votre communauté.',
    features: [
      'Partage WhatsApp natif pour hadiths',
      'Partage progression et achievements',
      'Partage douas et versets du Coran',
      'Leaderboard communautaire',
      'Aide et motivation sociale',
      'Analytics d\'usage et patterns',
      'Suggestions intelligentes de partage',
      'Liens de partage personnalisés',
    ],
  },
];

export function AppGuideScreen({ user, onBack, onNavigate }: { user: AuthUser; onBack: () => void; onNavigate: (screen: string) => void }) {
  const insets = useSafeAreaInsets();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Enhanced navigation handler for screens in different stacks
  const handleNavigate = (screenName: string) => {
    onNavigate(screenName);
  };

  const filteredModules = selectedCategory
    ? MODULES.filter((m) => m.category === selectedCategory)
    : MODULES;

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <View style={[st.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={st.header}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>Guide de l'app</Text>
          <Text style={st.headerSub}>{MODULES.length} modules disponibles</Text>
        </View>
        <Ionicons name="help-circle" size={24} color={palette.primaryDark} />
      </View>

      {/* Intro banner */}
      <View style={st.banner}>
        <Ionicons name="sparkles" size={20} color="#fff" />
        <Text style={st.bannerText}>
          Bienvenue dans Oumoul ! Découvre ci-dessous toutes les fonctionnalités de l'app. Appuie sur un module pour en savoir plus.
        </Text>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chipScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        <TouchableOpacity
          style={[st.chip, !selectedCategory && st.chipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[st.chipText, !selectedCategory && st.chipTextActive]}>Tous ({MODULES.length})</Text>
        </TouchableOpacity>
        {MODULE_CATEGORIES.map((cat) => {
          const count = MODULES.filter((m) => m.category === cat).length;
          const isActive = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[st.chip, isActive && st.chipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[st.chipText, isActive && st.chipTextActive]}>{cat} ({count})</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Module list */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {filteredModules.map((mod) => {
          const isExpanded = expandedId === mod.id;
          return (
            <View key={mod.id} style={st.moduleCard}>
              <TouchableOpacity
                style={st.moduleHeader}
                onPress={() => toggleExpand(mod.id)}
                activeOpacity={0.7}
              >
                <View style={[st.moduleIcon, { backgroundColor: mod.color + '18' }]}>
                  <Ionicons name={mod.icon} size={22} color={mod.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.moduleName}>{mod.name}</Text>
                  <Text style={st.moduleShort}>{mod.shortDesc}</Text>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.muted} />
              </TouchableOpacity>

              {isExpanded && (
                <View style={st.moduleBody}>
                  <Text style={st.moduleLong}>{mod.longDesc}</Text>

                  <Text style={st.featuresTitle}>Fonctionnalités :</Text>
                  {mod.features.map((feat, i) => (
                    <View key={i} style={st.featureRow}>
                      <Ionicons name="checkmark-circle" size={14} color={mod.color} />
                      <Text style={st.featureText}>{feat}</Text>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={[st.goBtn, { backgroundColor: mod.color }]}
                    onPress={() => handleNavigate(mod.screen)}
                    activeOpacity={0.8}
                  >
                    <Text style={st.goBtnText}>Ouvrir {mod.name}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: palette.text },
  headerSub: { fontSize: 12, color: palette.muted, marginTop: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.primaryDark, marginHorizontal: 16, borderRadius: 12, padding: 14, gap: 10, marginBottom: 12 },
  bannerText: { flex: 1, fontSize: 13, color: '#fff', lineHeight: 18 },
  chipScroll: { maxHeight: 44, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  chipActive: { backgroundColor: palette.primaryDark, borderColor: palette.primaryDark },
  chipText: { fontSize: 12, color: palette.text, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  moduleCard: { backgroundColor: palette.card, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  moduleIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  moduleName: { fontSize: 15, fontWeight: '700', color: palette.text },
  moduleShort: { fontSize: 12, color: palette.muted, marginTop: 2 },
  moduleBody: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 12 },
  moduleLong: { fontSize: 13, color: palette.text, lineHeight: 20, marginBottom: 12 },
  featuresTitle: { fontSize: 12, fontWeight: '700', color: palette.text, marginBottom: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  featureText: { fontSize: 12, color: palette.muted, flex: 1 },
  goBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, marginTop: 12, gap: 8 },
  goBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
