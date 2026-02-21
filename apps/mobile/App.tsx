import { StatusBar } from "expo-status-bar";
import React, { Component, useCallback, useEffect, useMemo, useState } from "react";
import { useFonts } from "expo-font";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { appMetadata } from "@oumoul/config";
import { colors } from "@oumoul/ui";
import type { AuthUser, RegisterPayload } from "@oumoul/api";
import { useAuth, AuthProvider } from "./src/context/auth-context";
import { LocationProvider, useLocationContext } from "./src/context/location-context";
import { ThemeProvider, useTheme } from "./src/context/theme-context";
import { palette } from "./src/theme";
import * as SecureStore from "expo-secure-store";
import { useForm } from "./src/hooks/use-form";
import { authApi } from "./src/api";
import { ModernDashboard } from "./src/screens/dashboard/ModernDashboard";
import { TafsirScreen } from "./src/screens/tafsir";
import { ImaneQuranScreen } from "./src/screens/imane-quran";
import { ImaneProgramScreen } from "./src/screens/imane-program";
import { ImaneCycleScreen } from "./src/screens/imane-cycle";
import { ImaneRamadanScreen } from "./src/screens/imane-ramadan";
import { RamadanCatchupScreen } from "./src/screens/ramadan-catchup";
import { DhikrScreen } from "./src/screens/dhikr";
import { QiblaScreen } from "./src/screens/qibla";
import { HijriCalendarScreen } from "./src/screens/hijri-calendar";
import { PrayerSettingsScreen } from "./src/screens/prayer-settings";
import { WelcomeScreen } from "./src/screens/welcome";
import { WelcomeLandingScreen } from "./src/screens/welcome-landing";
import { PrayerTrackingScreen } from "./src/screens/prayer-tracking";
import { QuranAudioScreen } from "./src/screens/quran-audio";
import { AllahNamesScreen } from "./src/screens/allah-names";
import { TasbihScreen } from "./src/screens/tasbih";
import { MosqueFinderScreen } from "./src/screens/mosque-finder";
import { HadithDailyScreen } from "./src/screens/hadith-daily";
import { OnboardingTourScreen } from "./src/screens/onboarding-tour";
import { ZakatCalculatorScreen } from "./src/screens/zakat-calculator";
import { EidGreetingsScreen } from "./src/screens/eid-greetings";
import { QuranWordsScreen } from "./src/screens/quran-words";
import { GlobalSearchScreen } from "./src/screens/global-search";
import { AppGuideScreen } from "./src/screens/app-guide";
import { AboutScreen } from "./src/screens/AboutScreen";
import { PrivacyScreen } from "./src/screens/PrivacyScreen";
import { TermsScreen } from "./src/screens/TermsScreen";
import { GamificationScreen } from "./src/screens/GamificationScreen";
import { AISystemScreen } from "./src/screens/AISystemScreen";
import { ShareSystemScreen } from "./src/screens/ShareSystemScreen";
import { DarkModeScreen } from "./src/screens/DarkModeScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const C = {
  bg: palette.bg,
  card: palette.card,
  cardBorder: palette.border,
  primary: palette.primary,
  primaryDark: palette.primaryDark,
  accent: palette.accent,
  text: palette.text,
  textSoft: palette.textSoft,
  textOnPrimary: palette.textOnPrimary,
  inputBg: palette.inputBg,
  inputBorder: palette.inputBorder,
  tabBar: palette.tabBar,
  tabInactive: palette.tabInactive,
  error: palette.error,
  errorBg: palette.errorBg,
};

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("password") && (m.includes("longer") || m.includes("short") || m.includes("least")))
    return "Le mot de passe doit contenir au moins 8 caractères.";
  if (m.includes("email already") || m.includes("conflict") || m.includes("already exists") || m.includes("déjà utilisé"))
    return "Cet email est déjà utilisé.";
  if (m.includes("invalid credentials") || m.includes("unauthorized") || m.includes("identifiants") || m.includes("incorrect") || m.includes("wrong password") || m.includes("401"))
    return "Email ou mot de passe incorrect.";
  if (m.includes("not verified") || m.includes("non vérifié") || m.includes("verify") || m.includes("403"))
    return "Email non vérifié. Vérifie ta boîte mail.";
  if (m.includes("not found") || m.includes("404") || m.includes("no account") || m.includes("introuvable"))
    return "Aucun compte trouvé avec cet email.";
  if (m.includes("invalid") && m.includes("email"))
    return "Adresse email invalide.";
  if (m.includes("too many") || m.includes("rate limit") || m.includes("429"))
    return "Trop de tentatives. Réessaie dans quelques minutes.";
  if (m.includes("network") || m.includes("fetch") || m.includes("failed") || m.includes("load") || m.includes("connect") || m.includes("timeout"))
    return "Erreur réseau. Vérifie ta connexion internet.";
  if (m.includes("expired"))
    return "Code expiré. Demande un nouveau code.";
  if (m.includes("server") || m.includes("500") || m.includes("internal"))
    return "Erreur serveur. Réessaie dans quelques instants.";
  return "Une erreur est survenue. Réessaie.";
}

export default function App() {
  const [fontsLoaded] = useFonts({
    "Amiri-Regular": require("./assets/fonts/Amiri-Regular.ttf"),
    "Amiri-Bold": require("./assets/fonts/Amiri-Bold.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color={C.primaryDark} />
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <ErrorBoundary>
            <RootSwitch />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: "center" }}>
          <Text style={{ color: C.error, fontWeight: "700", fontSize: 18 }}>Erreur application</Text>
          <Text style={{ color: C.text, marginTop: 12, lineHeight: 22 }}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function RootSwitch() {
  const { user, loading, pendingVerificationEmail } = useAuth();
  const [welcomeStep, setWelcomeStep] = useState<"slides" | "landing" | "done">("slides");
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user has seen onboarding
  useEffect(() => {
    if (user) {
      SecureStore.getItemAsync("oumoul_onboarding_done").then((val: string | null) => {
        if (!val) setShowOnboarding(true);
      }).catch(() => {});
    }
  }, [user]);

  const finishOnboarding = useCallback(() => {
    setShowOnboarding(false);
    SecureStore.setItemAsync("oumoul_onboarding_done", "true").catch(() => {});
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={C.primaryDark} />
        <Text style={{ color: C.textSoft, marginTop: 12, fontSize: 14 }}>Chargement...</Text>
      </View>
    );
  }

  if (pendingVerificationEmail) {
    return <VerifyEmailScreen email={pendingVerificationEmail} />;
  }

  if (!user && welcomeStep === "slides") {
    return <WelcomeScreen onFinish={() => setWelcomeStep("landing")} />;
  }

  if (!user && welcomeStep === "landing") {
    return <WelcomeLandingScreen onGetStarted={() => setWelcomeStep("done")} />;
  }

  if (!user) {
    return <AuthFlow />;
  }

  if (showOnboarding) {
    return <OnboardingTourScreen onFinish={finishOnboarding} />;
  }

  return <MainApp user={user} />;
}

function MainApp({ user }: { user: AuthUser }) {
  const { palette: p } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  return (
    <LocationProvider>
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: p.tabBar,
            borderTopColor: p.border,
            borderTopWidth: 1,
            height: Platform.OS === "ios" ? 88 : 56 + bottomInset,
            paddingBottom: Platform.OS === "ios" ? 28 : bottomInset + 4,
            paddingTop: 8,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          },
          tabBarActiveTintColor: p.primaryDark,
          tabBarInactiveTintColor: p.tabInactive,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
          tabBarIcon: ({ color, size }) => {
            const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
              Accueil: "home",
              Coran: "book",
              Dhikr: "heart",
              Ramadan: "moon",
              Plus: "grid",
            };
            const name = icons[route.name] ?? "ellipse";
            return <Ionicons name={name} size={size - 2} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Accueil">
          {() => <HomeStack user={user} />}
        </Tab.Screen>
        <Tab.Screen name="Coran">
          {() => <QuranStack user={user} />}
        </Tab.Screen>
        <Tab.Screen name="Dhikr">
          {() => <DhikrStack user={user} />}
        </Tab.Screen>
        <Tab.Screen name="Ramadan">
          {() => <RamadanStack user={user} />}
        </Tab.Screen>
        <Tab.Screen name="Plus">
          {() => <MoreStack user={user} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
    </LocationProvider>
  );
}

function HomeStack({ user }: { user: AuthUser }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen">
        {(props) => <HomeScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen name="ImaneCycle" options={{ animation: "slide_from_right" }}>
        {(props) => <ImaneCycleScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function QuranStack({ user }: { user: AuthUser }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ImaneQuran">
        {(props) => <ImaneQuranScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Tafsir" options={{ animation: "slide_from_right" }}>
        {(props) => <TafsirScreen user={user} onBackToDashboard={() => props.navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function DhikrStack({ user }: { user: AuthUser }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DhikrMain">
        {(props) => <DhikrScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function RamadanStack({ user }: { user: AuthUser }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ImaneRamadan">
        {(props) => <ImaneRamadanScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="RamadanCatchup" options={{ animation: "slide_from_right" }}>
        {(props) => <RamadanCatchupScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}


function MoreStack({ user }: { user: AuthUser }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMenu">
        {(props) => <MoreScreen navigation={props.navigation} user={user} />}
      </Stack.Screen>
      <Stack.Screen name="HijriCalendar" options={{ animation: "slide_from_right" }}>
        {(props) => <HijriCalendarScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Qibla" options={{ animation: "slide_from_right" }}>
        {(props) => <QiblaScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="ImaneProgram" options={{ animation: "slide_from_right" }}>
        {(props) => <ImaneProgramScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="PrayerSettingsMore" options={{ animation: "slide_from_right" }}>
        {(props) => <PrayerSettingsScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="PrayerTracking" options={{ animation: "slide_from_right" }}>
        {(props) => <PrayerTrackingScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="QuranAudio" options={{ animation: "slide_from_right" }}>
        {(props) => <QuranAudioScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="AllahNames" options={{ animation: "slide_from_right" }}>
        {(props) => <AllahNamesScreen user={user} onBack={() => props.navigation.goBack()} initialNameId={(props.route.params as any)?.initialNameId} />}
      </Stack.Screen>
      <Stack.Screen name="Tasbih" options={{ animation: "slide_from_right" }}>
        {(props) => <TasbihScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="MosqueFinder" options={{ animation: "slide_from_right" }}>
        {(props) => <MosqueFinderScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="HadithDaily" options={{ animation: "slide_from_right" }}>
        {(props) => <HadithDailyScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="ZakatCalculator" options={{ animation: "slide_from_right" }}>
        {(props) => <ZakatCalculatorScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="EidGreetings" options={{ animation: "slide_from_right" }}>
        {(props) => <EidGreetingsScreen user={user} onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="QuranWords" options={{ animation: "slide_from_right" }}>
        {(props) => <QuranWordsScreen user={user} onBack={() => props.navigation.goBack()} initialWordId={(props.route.params as any)?.initialWordId} />}
      </Stack.Screen>
      <Stack.Screen name="GlobalSearch" options={{ animation: "slide_from_right" }}>
        {(props) => <GlobalSearchScreen user={user} onBack={() => props.navigation.goBack()} onNavigate={(screen: string) => {
          const parentNav = props.navigation.getParent();
          if (screen === '__CORAN_TAB__') {
            parentNav?.navigate('Coran');
          } else if (screen === 'ImaneRamadan') {
            parentNav?.navigate('Ramadan');
          } else if (screen === 'ImaneCycle') {
            parentNav?.navigate('Accueil', { screen: 'ImaneCycle' });
          } else {
            (props.navigation as any).navigate(screen);
          }
        }} />}
      </Stack.Screen>
      <Stack.Screen name="AppGuide" options={{ animation: "slide_from_right" }}>
        {(props) => <AppGuideScreen user={user} onBack={() => props.navigation.goBack()} onNavigate={(screen: string) => {
              // Handle navigation to different tabs and screens
          const parentNav = props.navigation.getParent();
          if (screen === '__CORAN_TAB__') {
            parentNav?.navigate('Coran');
          } else if (screen === 'ImaneRamadan') {
            parentNav?.navigate('Ramadan');
          } else if (screen === 'ImaneCycle') {
            parentNav?.navigate('Accueil', { screen: 'ImaneCycle' });
          } else if (screen === 'Gamification') {
            parentNav?.navigate('Plus', { screen: 'Gamification' });
          } else {
            (props.navigation as any).navigate(screen);
          }
        }} />}
      </Stack.Screen>
            <Stack.Screen name="About" options={{ animation: "slide_from_right" }}>
        {(props) => <AboutScreen onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Privacy" options={{ animation: "slide_from_right" }}>
        {(props) => <PrivacyScreen onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Terms" options={{ animation: "slide_from_right" }}>
        {(props) => <TermsScreen onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Gamification" options={{ animation: "slide_from_right" }}>
        {(props) => <GamificationScreen onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="AISystem" options={{ animation: "slide_from_right" }}>
        {(props) => <AISystemScreen onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="ShareSystem" options={{ animation: "slide_from_right" }}>
        {(props) => <ShareSystemScreen onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="DarkMode" options={{ animation: "slide_from_right" }}>
        {(props) => <DarkModeScreen onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function HomeScreen({ navigation, user }: { navigation: any; user: AuthUser }) {
  return <ModernDashboard user={user} onSearch={() => navigation.getParent()?.navigate("Plus", { screen: "GlobalSearch" })} />;
}

function MoreScreen({ navigation, user }: { navigation: any; user: AuthUser }) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { location: detectedLoc } = useLocationContext();
  const { isDark, toggleTheme, palette: p } = useTheme();

  const categories = {
  "📖 Spirituel": [
    { key: "allahNames", label: "99 Noms d'Allah", icon: "heart" as keyof typeof Ionicons.glyphMap, screen: "AllahNames" },
    { key: "tasbih", label: "Tasbih", icon: "radio" as keyof typeof Ionicons.glyphMap, screen: "Tasbih" },
    { key: "hadith", label: "Hadith du jour", icon: "book" as keyof typeof Ionicons.glyphMap, screen: "HadithDaily" },
  ],
  "📅 Suivi": [
    { key: "prayerTrack", label: "Suivi des prières", icon: "checkmark" as keyof typeof Ionicons.glyphMap, screen: "PrayerTracking" },
    { key: "prog", label: "Programme Imane", icon: "checkbox" as keyof typeof Ionicons.glyphMap, screen: "ImaneProgram" },
  ],
  "🌙 Ramadan": [
    { key: "ramadan", label: "Ramadan", icon: "moon" as keyof typeof Ionicons.glyphMap, screen: "ImaneRamadan" },
    { key: "eid", label: "Cartes de vœux", icon: "gift" as keyof typeof Ionicons.glyphMap, screen: "EidGreetings" },
  ],
  "👩‍🦰 Cycle": [
    { key: "cycle", label: "Suivi du cycle", icon: "heart" as keyof typeof Ionicons.glyphMap, screen: "ImaneCycle" },
  ],
  "📖 Coran": [
    { key: "quranAudio", label: "Écouter le Coran", icon: "musical-note" as keyof typeof Ionicons.glyphMap, screen: "QuranAudio" },
    { key: "quranWords", label: "Vocabulaire du Coran", icon: "language" as keyof typeof Ionicons.glyphMap, screen: "QuranWords" },
  ],
  "🕌 Prière": [
    { key: "mosque", label: "Mosquées à proximité", icon: "business" as keyof typeof Ionicons.glyphMap, screen: "MosqueFinder" },
    { key: "qibla", label: "Direction Qibla", icon: "compass" as keyof typeof Ionicons.glyphMap, screen: "Qibla" },
    { key: "zakat", label: "Calculateur Zakat", icon: "calculator" as keyof typeof Ionicons.glyphMap, screen: "ZakatCalculator" },
  ],
  "⚙️ Outils": [
    { key: "search", label: "Recherche globale", icon: "search" as keyof typeof Ionicons.glyphMap, screen: "GlobalSearch" },
    { key: "cal", label: "Calendrier Hijri", icon: "calendar" as keyof typeof Ionicons.glyphMap, screen: "HijriCalendar" },
    { key: "guide", label: "Guide de l'app", icon: "help-circle-outline" as keyof typeof Ionicons.glyphMap, screen: "AppGuide" },
    { key: "darkmode", label: "Thème & Apparence", icon: "moon" as keyof typeof Ionicons.glyphMap, screen: "DarkMode" },
  ],
  "🚀 ULTRA Features": [
    { key: "gamification", label: "Gamification", icon: "trophy" as keyof typeof Ionicons.glyphMap, screen: "Gamification" },
    { key: "ai", label: "Système IA", icon: "sparkles" as keyof typeof Ionicons.glyphMap, screen: "AISystem" },
    { key: "share", label: "Partage", icon: "share-social" as keyof typeof Ionicons.glyphMap, screen: "ShareSystem" },
  ],
  "📄 Légal": [
    { key: "about", label: "À Propos", icon: "business" as keyof typeof Ionicons.glyphMap, screen: "About" },
    { key: "privacy", label: "Confidentialité", icon: "lock-closed" as keyof typeof Ionicons.glyphMap, screen: "Privacy" },
    { key: "terms", label: "Conditions", icon: "document-text" as keyof typeof Ionicons.glyphMap, screen: "Terms" },
  ],
  };

  const settingsItems: Array<{ key: string; label: string; icon: keyof typeof Ionicons.glyphMap; screen: string }> = [
    { key: "prayer", label: "Réglages prière", icon: "settings", screen: "PrayerSettingsMore" },
  ];

  const cityLabel = detectedLoc.city && detectedLoc.country
    ? `${detectedLoc.city}, ${detectedLoc.country}`
    : detectedLoc.city ?? "GPS actif";

  return (
    <View style={[s.screen, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {Object.entries(categories).map(([category, items]) => (
          <View key={category}>
            <Text style={[s.sectionTitle, { marginTop: 16, color: p.text }]}>{category}</Text>
            {items.map((item) => (
              <TouchableOpacity key={item.key} style={[s.listItem, { backgroundColor: p.card, borderColor: p.border }]} onPress={() => {
                if (item.screen === '__CORAN_TAB__') {
                  navigation.getParent()?.navigate('Coran');
                } else if (item.screen === '__CYCLE_TAB__') {
                  navigation.getParent()?.navigate('Accueil', { screen: 'ImaneCycle' });
                } else if (item.screen === 'ImaneRamadan') {
                  navigation.getParent()?.navigate('Ramadan');
                } else {
                  navigation.navigate(item.screen);
                }
              }} activeOpacity={0.7}>
                <View style={[s.listIconWrap, { backgroundColor: p.accentLight }]}>
                  <Ionicons name={item.icon} size={20} color={p.primaryDark} />
                </View>
                <Text style={[s.listLabel, { color: p.text }]}>{item.label}</Text>
                <Ionicons name="chevron-forward-outline" size={18} color={p.tabInactive} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <Text style={[s.sectionTitle, { marginTop: 20, color: p.text }]}>⚙️ Réglages</Text>
        {settingsItems.map((item) => (
          <TouchableOpacity key={item.key} style={[s.listItem, { backgroundColor: p.card, borderColor: p.border }]} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.7}>
            <View style={[s.listIconWrap, { backgroundColor: p.accentLight }]}>
              <Ionicons name={item.icon} size={20} color={p.primaryDark} />
            </View>
            <Text style={[s.listLabel, { color: p.text }]}>{item.label}</Text>
            <Ionicons name="chevron-forward-outline" size={18} color={p.tabInactive} />
          </TouchableOpacity>
        ))}

        {/* Dark mode toggle */}
        <View style={[s.listItem, { backgroundColor: p.card, borderColor: p.border }]}>
          <View style={[s.listIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(26,127,100,0.08)" }]}>
            <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={p.primaryDark} />
          </View>
          <Text style={[s.listLabel, { flex: 1, color: p.text }]}>Mode sombre</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: "#E0E0E0", true: p.primaryDark }}
            thumbColor="#fff"
          />
        </View>

        {/* Location info */}
        <View style={[s.listItem, { marginTop: 20, backgroundColor: "rgba(26,127,100,0.06)" }]}>
          <View style={[s.listIconWrap, { backgroundColor: "rgba(26,127,100,0.12)" }]}>
            <Ionicons name="location" size={20} color={p.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.listLabel, { color: p.text }]}>{cityLabel}</Text>
            <Text style={{ fontSize: 11, color: p.textSoft, marginTop: 2 }}>Position GPS automatique</Text>
          </View>
        </View>

        {/* About */}
        <Text style={[s.sectionTitle, { marginTop: 20, color: p.text }]}>À propos</Text>
        <View style={[s.listItem, { backgroundColor: p.card, borderColor: p.border }]}>
          <View style={s.listIconWrap}>
            <Ionicons name="information-circle-outline" size={20} color={p.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.listLabel, { color: p.text }]}>{appMetadata.name}</Text>
            <Text style={{ fontSize: 11, color: p.textSoft, marginTop: 2 }}>Version 1.1.0 · {user.email}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.listItem, { marginTop: 24, borderColor: "#FFCDD2" }]}
          onPress={() => void logout()}
          activeOpacity={0.7}
        >
          <View style={[s.listIconWrap, { backgroundColor: "#FFEBEE" }]}>
            <Ionicons name="log-out-outline" size={20} color={p.error} />
          </View>
          <Text style={[s.listLabel, { color: p.error }]}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function AuthFlow() {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");

  if (mode === "forgot") return <ForgotPasswordScreen onSwitch={setMode} />;
  if (mode === "reset") return <ResetPasswordScreen onSwitch={setMode} />;
  return mode === "login" ? <LoginScreen onSwitch={setMode} /> : <RegisterScreen onSwitch={setMode} />;
}

function VerifyEmailScreen({ email }: { email: string }) {
  const { verifyEmail, resendVerification, logout, loading } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const insets = useSafeAreaInsets();

  const handleVerify = useCallback(async () => {
    setError(null);
    try {
      await verifyEmail(email, code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide ou expiré");
    }
  }, [verifyEmail, email, code]);

  const handleResend = useCallback(async () => {
    try {
      await resendVerification(email);
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {}
  }, [resendVerification, email]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View style={auth.logoCircle}>
            <Ionicons name="mail-outline" size={28} color={C.primaryDark} />
          </View>
          <Text style={auth.appName}>Vérification email</Text>
        </View>

        <View style={auth.card}>
          <Text style={auth.title}>Vérifie ton email</Text>
          <Text style={[auth.subtitle, { marginTop: 8 }]}>
            Un code à 6 chiffres a été envoyé à{"\n"}
            <Text style={{ fontWeight: "700", color: C.text }}>{email}</Text>
          </Text>

          {error ? <Text style={[auth.error, { marginTop: 16 }]}>{error}</Text> : null}

          <AuthInput
            placeholder="Code à 6 chiffres"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          <TouchableOpacity
            style={[auth.btn, (loading || code.trim().length !== 6) && { opacity: 0.6 }]}
            disabled={loading || code.trim().length !== 6}
            onPress={() => void handleVerify()}
          >
            <Text style={auth.btnText}>{loading ? "Vérification..." : "Vérifier"}</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 20, alignItems: "center", gap: 12 }}>
            {resent ? (
              <Text style={{ color: C.primaryDark, fontWeight: "600", fontSize: 14 }}>Code renvoyé !</Text>
            ) : (
              <TouchableOpacity onPress={() => void handleResend()}>
                <Text style={auth.link}>Renvoyer le code</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => void logout()}>
              <Text style={[auth.link, { color: C.textSoft }]}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LoginScreen({ onSwitch }: { onSwitch: (next: "login" | "register" | "forgot" | "reset") => void }) {
  const { login, loading } = useAuth();
  const [form, updateField] = useForm({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setError(null);
    try {
      await login(form.email.trim(), form.password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(translateError(msg) || "Erreur de connexion");
    }
  }, [login, form]);

  return (
    <AuthLayout title="Connexion" subtitle="Accède à ton espace spirituel" mode="login" onSwitch={onSwitch}>
      {error ? (
        <View style={[auth.errorBox, { backgroundColor: '#fee2e2', borderLeftColor: '#ef4444' }]}>
          <Ionicons name="alert-circle" size={16} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={[auth.error, { color: '#991b1b', flex: 1 }]}>{error}</Text>
        </View>
      ) : null}
      <AuthInput placeholder="Email" value={form.email} onChangeText={(v) => updateField("email", v)} keyboardType="email-address" autoCapitalize="none" />
      <PasswordInput placeholder="Mot de passe" value={form.password} onChangeText={(v) => updateField("password", v)} />
      <TouchableOpacity style={{ alignSelf: "flex-end", marginTop: 8 }} onPress={() => onSwitch("forgot")}>
        <Text style={auth.link}>Mot de passe oublié ?</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[auth.btn, loading && { opacity: 0.6 }]} disabled={loading} onPress={() => void handleSubmit()}>
        <Text style={auth.btnText}>{loading ? "Connexion..." : "Se connecter"}</Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

function RegisterScreen({ onSwitch }: { onSwitch: (next: "login" | "register" | "forgot" | "reset") => void }) {
  const { register, loading } = useAuth();
  const [form, updateField] = useForm<RegisterPayload>({ firstName: "", lastName: "", email: "", password: "", locale: "fr" });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setError(null);
    try {
      await register({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), password: form.password, locale: form.locale });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(translateError(msg) || "Erreur d'inscription");
    }
  }, [register, form]);

  return (
    <AuthLayout title="Inscription" subtitle="Commence ton parcours spirituel" mode="register" onSwitch={onSwitch}>
      {error ? (
        <View style={[auth.errorBox, { backgroundColor: '#fee2e2', borderLeftColor: '#ef4444' }]}>
          <Ionicons name="alert-circle" size={16} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={[auth.error, { color: '#991b1b', flex: 1 }]}>{error}</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AuthInput placeholder="Prénom" value={form.firstName} onChangeText={(v) => updateField("firstName", v)} />
        </View>
        <View style={{ flex: 1 }}>
          <AuthInput placeholder="Nom" value={form.lastName} onChangeText={(v) => updateField("lastName", v)} />
        </View>
      </View>
      <AuthInput placeholder="Email" value={form.email} onChangeText={(v) => updateField("email", v)} keyboardType="email-address" autoCapitalize="none" />
      <PasswordInput placeholder="Mot de passe" value={form.password} onChangeText={(v) => updateField("password", v)} />
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        {locales.map((opt) => {
          const active = form.locale === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[auth.langChip, active && { backgroundColor: C.primaryDark, borderColor: C.primaryDark }]}
              onPress={() => updateField("locale", opt.value)}
            >
              <Text style={[auth.langText, active && { color: "#FFF" }]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity style={[auth.btn, loading && { opacity: 0.6 }]} disabled={loading} onPress={() => void handleSubmit()}>
        <Text style={auth.btnText}>{loading ? "Inscription..." : "Créer mon compte"}</Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

function ForgotPasswordScreen({ onSwitch }: { onSwitch: (next: "login" | "register" | "forgot" | "reset") => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(translateError(msg) || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }, [email]);

  return (
    <AuthLayout title="Mot de passe oublié" subtitle="Entre ton email pour recevoir un lien" mode="login" onSwitch={onSwitch}>
      {error ? <Text style={auth.error}>{error}</Text> : null}
      <AuthInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      {done ? (
        <View style={{ marginTop: 16, gap: 12 }}>
          <Text style={{ color: C.text, lineHeight: 22 }}>Si un compte existe, un lien a été généré.</Text>
          <TouchableOpacity onPress={() => onSwitch("reset")}>
            <Text style={auth.link}>J'ai un token / lien</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onSwitch("login")}>
            <Text style={auth.link}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ marginTop: 16, gap: 12 }}>
          <TouchableOpacity style={[auth.btn, loading && { opacity: 0.6 }]} disabled={loading} onPress={() => void handleSubmit()}>
            <Text style={auth.btnText}>{loading ? "Envoi..." : "Envoyer"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ alignSelf: "center" }} onPress={() => onSwitch("login")}>
            <Text style={auth.link}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}
    </AuthLayout>
  );
}

function ResetPasswordScreen({ onSwitch }: { onSwitch: (next: "login" | "register" | "forgot" | "reset") => void }) {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({ token: token.trim(), password });
      setDone(true);
      setTimeout(() => onSwitch("login"), 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(translateError(msg) || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }, [onSwitch, password, token]);

  return (
    <AuthLayout title="Nouveau mot de passe" subtitle="Colle le token et choisis un nouveau mot de passe" mode="login" onSwitch={onSwitch}>
      {error ? (
        <View style={[auth.errorBox, { backgroundColor: '#fee2e2', borderLeftColor: '#ef4444' }]}>
          <Ionicons name="alert-circle" size={16} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={[auth.error, { color: '#991b1b', flex: 1 }]}>{error}</Text>
        </View>
      ) : null}
      <AuthInput placeholder="Token" value={token} onChangeText={setToken} autoCapitalize="none" />
      <PasswordInput placeholder="Nouveau mot de passe" value={password} onChangeText={setPassword} />
      {done ? (
        <View style={[{ backgroundColor: '#dcfce7', borderLeftColor: '#22c55e', padding: 12, borderRadius: 8, marginTop: 16 }]}>
          <Ionicons name="checkmark-circle" size={16} color="#22c55e" style={{ marginRight: 8 }} />
          <Text style={{ color: '#166534', fontWeight: '600' }}>Mot de passe mis à jour avec succès !</Text>
        </View>
      ) : (
        <View style={{ marginTop: 16, gap: 12 }}>
          <TouchableOpacity
            style={[auth.btn, (loading || !token.trim() || password.length < 8) && { opacity: 0.6 }]}
            disabled={loading || !token.trim() || password.length < 8}
            onPress={() => void handleSubmit()}
          >
            <Text style={auth.btnText}>{loading ? "Validation..." : "Mettre à jour"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ alignSelf: "center" }} onPress={() => onSwitch("login")}>
            <Text style={auth.link}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}
    </AuthLayout>
  );
}

function AuthInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={C.tabInactive}
      style={[auth.input, props.style]}
    />
  );
}

function PasswordInput(props: Omit<React.ComponentProps<typeof TextInput>, 'secureTextEntry'>) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <View style={{ position: 'relative' }}>
      <TextInput
        {...props}
        secureTextEntry={!showPassword}
        placeholderTextColor={C.tabInactive}
        style={[auth.input, { paddingRight: 50 }]}
      />
      <TouchableOpacity
        style={{ 
          position: 'absolute', 
          right: 16, 
          top: 0, 
          bottom: 0, 
          justifyContent: 'center',
          alignItems: 'center'
        }}
        onPress={() => setShowPassword(!showPassword)}
      >
        <Ionicons 
          name={showPassword ? 'eye-off' : 'eye'} 
          size={20} 
          color={C.tabInactive} 
        />
      </TouchableOpacity>
    </View>
  );
}

function AuthLayout({
  children,
  title,
  subtitle,
  mode,
  onSwitch,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  mode: "login" | "register";
  onSwitch: (next: "login" | "register") => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View style={auth.loginImageContainer}>
            <Image source={require("./assets/loginimage.png")} style={auth.loginImage} resizeMode="cover" />
          </View>
          <Text style={auth.appName}>{appMetadata.name}</Text>
        </View>

        <View style={auth.card}>
          <View style={auth.tabRow}>
            <TouchableOpacity style={[auth.tab, mode === "login" && auth.tabActive]} onPress={() => onSwitch("login")}>
              <Text style={[auth.tabText, mode === "login" && auth.tabTextActive]}>Connexion</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[auth.tab, mode === "register" && auth.tabActive]} onPress={() => onSwitch("register")}>
              <Text style={[auth.tabText, mode === "register" && auth.tabTextActive]}>Inscription</Text>
            </TouchableOpacity>
          </View>

          <Text style={auth.title}>{title}</Text>
          <Text style={auth.subtitle}>{subtitle}</Text>

          <View style={{ marginTop: 20 }}>{children}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const locales: Array<{ value: RegisterPayload["locale"]; label: string }> = [
  { value: "fr", label: "FR" },
  { value: "en", label: "EN" },
  { value: "ar", label: "AR" },
];

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 16 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  listIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3E8EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  listLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: C.text },
});

const auth = StyleSheet.create({
  loginImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 20,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  loginImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  appName: { fontSize: 20, fontWeight: "700", color: C.text, letterSpacing: 1 },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: C.inputBg,
  },
  tabActive: { backgroundColor: C.primaryDark },
  tabText: { fontSize: 14, fontWeight: "600", color: C.textSoft },
  tabTextActive: { color: "#FFF" },
  title: { fontSize: 22, fontWeight: "700", color: C.text },
  subtitle: { fontSize: 14, color: C.textSoft, marginTop: 4, lineHeight: 20 },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: C.text,
    marginTop: 12,
  },
  btn: {
    backgroundColor: C.primaryDark,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  link: { color: C.primaryDark, fontWeight: "600", fontSize: 14 },
  error: {
    fontSize: 13,
    fontWeight: "500",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    overflow: "hidden",
  },
  langChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.inputBorder,
    backgroundColor: C.inputBg,
  },
  langText: { fontSize: 13, fontWeight: "600", color: C.text },
});
