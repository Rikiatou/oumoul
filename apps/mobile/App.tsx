/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import { StatusBar } from "expo-status-bar";
import React, {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { appMetadata } from "@oumoul/config";
import { colors as _colors } from "@oumoul/ui";
import type { AuthUser, RegisterPayload } from "@oumoul/api";
import { useAuth, AuthProvider } from "./src/context/auth-context";
import {
  LocationProvider,
  useLocationContext,
} from "./src/context/location-context";
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
import { DhikrScreen } from "./src/screens/DhikrMain";
import { PersonalGoalsScreen } from "./src/screens/personal-goals";
import { QiblaScreen } from "./src/screens/qibla";
import { HijriCalendarScreen } from "./src/screens/hijri-calendar";
import { PrayerSettingsScreen } from "./src/screens/prayer-settings";
import { WelcomeScreen } from "./src/screens/welcome";
import { WelcomeLandingScreen } from "./src/screens/welcome-landing";
import { PrayerTrackingScreen } from "./src/screens/prayer-tracking";
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
import { HalalMapScreen } from "./src/screens/halal-map";
import { DuaScreen } from "./src/screens/dua-screen";
import { IhsanModeScreen } from "./src/screens/ihsan-mode";
import { TravelCompanionScreen } from "./src/screens/travel-companion";
import { ShareCardScreen } from "./src/screens/share-card";
import { RecitationCheckerScreen } from "./src/screens/recitation-checker";
import { CommunityScreen } from "./src/screens/community-screen";
import { KidsModuleScreen } from "./src/screens/kids-module";
import { HifzScreen } from "./src/screens/hifz-screen";
import { MoodGuidanceScreen } from "./src/screens/mood-guidance";
import { FeminineHubScreen } from "./src/screens/feminine-hub";
import { setupDailyReminders } from "./src/notifications/daily-reminders";
import * as Notifications from "expo-notifications";
import { useRTL } from "./src/hooks/use-rtl";

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
  // Password validation errors
  if (
    m.includes("password") &&
    (m.includes("longer") || m.includes("short") || m.includes("least"))
  )
    return "Le mot de passe doit contenir au moins 8 caractères.";
  if (m.includes("password") && m.includes("minuscule"))
    return "Le mot de passe doit contenir au moins une lettre minuscule.";
  if (m.includes("password") && m.includes("majuscule"))
    return "Le mot de passe doit contenir au moins une lettre majuscule.";
  if (m.includes("password") && m.includes("chiffre"))
    return "Le mot de passe doit contenir au moins un chiffre.";
  // Email errors
  if (
    m.includes("email already") ||
    m.includes("conflict") ||
    m.includes("already exists") ||
    m.includes("déjà utilisé")
  )
    return "Cet email est déjà utilisé.";
  if (m.includes("invalid") && m.includes("email"))
    return "Adresse email invalide.";
  // Auth errors
  if (
    m.includes("invalid credentials") ||
    m.includes("unauthorized") ||
    m.includes("identifiants") ||
    m.includes("incorrect") ||
    m.includes("wrong password") ||
    m.includes("401")
  )
    return "Email ou mot de passe incorrect.";
  if (
    m.includes("not verified") ||
    m.includes("non vérifié") ||
    m.includes("verify") ||
    m.includes("403")
  )
    return "Email non vérifié. Vérifie ta boîte mail.";
  if (
    m.includes("not found") ||
    m.includes("404") ||
    m.includes("no account") ||
    m.includes("introuvable")
  )
    return "Aucun compte trouvé avec cet email.";
  // Rate limiting and network errors
  if (m.includes("too many") || m.includes("rate limit") || m.includes("429"))
    return "Trop de tentatives. Réessaie dans quelques minutes.";
  if (
    m.includes("network") ||
    m.includes("fetch") ||
    m.includes("failed") ||
    m.includes("load") ||
    m.includes("connect") ||
    m.includes("timeout")
  )
    return "Erreur réseau. Vérifie ta connexion internet.";
  // Other errors
  if (m.includes("expired")) return "Code expiré. Demande un nouveau code.";
  if (m.includes("server") || m.includes("500") || m.includes("internal"))
    return "Erreur serveur. Réessaie dans quelques instants.";
  return "Une erreur est survenue. Réessaie.";
}

export default function App() {
  const [fontsLoaded] = useFonts({
    "Amiri-Regular": require("./assets/fonts/Amiri-Regular.ttf"),
    "Amiri-Bold": require("./assets/fonts/Amiri-Bold.ttf"),
    "AmiriQuran-Regular": require("./assets/fonts/AmiriQuran-Regular.ttf"),
    "NotoNaskhArabic-Regular": require("./assets/fonts/NotoNaskhArabic-Regular.ttf"),
    "NotoNaskhArabic-Bold": require("./assets/fonts/NotoNaskhArabic-Bold.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <View
            style={{
              flex: 1,
              backgroundColor: C.bg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
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

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: C.bg,
            padding: 24,
            justifyContent: "center",
          }}
        >
          <Text style={{ color: C.error, fontWeight: "700", fontSize: 18 }}>
            Erreur application
          </Text>
          <Text style={{ color: C.text, marginTop: 12, lineHeight: 22 }}>
            {this.state.error.message}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const NOTIF_SETUP_KEY = "oumoul_notif_setup_done";

function RootSwitch() {
  const {
    user,
    loading,
    pendingVerificationEmail: _pendingVerificationEmail,
    authToast,
    clearAuthToast,
  } = useAuth();
  useRTL(user?.locale);
  const [welcomeStep, setWelcomeStep] = useState<"slides" | "landing" | "done">(
    "slides",
  );
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Whether user has ever logged in before (skip welcome/auth on return)
  const [hasEverLoggedIn, setHasEverLoggedIn] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: check if a cached session exists → skip welcome slides
  useEffect(() => {
    SecureStore.getItemAsync("oumoul_cached_user")
      .then((val: string | null) => {
        if (val) setHasEverLoggedIn(true);
      })
      .catch(() => {})
      .finally(() => setSessionChecked(true));
  }, []);

  // Auto-setup daily reminders: request permission on first launch, reschedule on every launch
  useEffect(() => {
    async function initNotifications() {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        if (existing === "granted") {
          // Already granted — reschedule reminders silently on every app open
          await setupDailyReminders();
          return;
        }
        // First time: check if we already asked before
        const alreadyAsked = await SecureStore.getItemAsync(NOTIF_SETUP_KEY);
        if (alreadyAsked) return; // User denied before, don't ask again
        // Request permission
        const { status } = await Notifications.requestPermissionsAsync();
        await SecureStore.setItemAsync(NOTIF_SETUP_KEY, "asked");
        if (status === "granted") {
          await setupDailyReminders();
        }
      } catch {
        // Never block app launch for notification errors
      }
    }
    void initNotifications();
  }, []);

  // Check if user has seen onboarding
  useEffect(() => {
    if (user) {
      SecureStore.getItemAsync("oumoul_onboarding_done")
        .then((val: string | null) => {
          if (!val) setShowOnboarding(true);
        })
        .catch(() => {});
    }
  }, [user]);

  const finishOnboarding = useCallback(() => {
    setShowOnboarding(false);
    SecureStore.setItemAsync("oumoul_onboarding_done", "true").catch(() => {});
  }, []);

  useEffect(() => {
    if (!authToast) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      clearAuthToast();
    }, 3000);
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [authToast, clearAuthToast]);

  const content = useMemo(() => {
    // Wait for both auth context and session check before rendering
    if (loading || !sessionChecked) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: C.bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color={C.primaryDark} />
          <Text style={{ color: C.textSoft, marginTop: 12, fontSize: 14 }}>
            Chargement...
          </Text>
        </View>
      );
    }

    // User is authenticated — show app
    if (user) {
      if (showOnboarding) {
        return <OnboardingTourScreen onFinish={finishOnboarding} />;
      }
      return <MainApp user={user} />;
    }

    // Returning user: has session cached but auth context not yet resolved (e.g. slow network)
    // Already handled in auth-context by restoring cachedUser — this is a fallback loading state
    if (hasEverLoggedIn) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: C.bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color={C.primaryDark} />
          <Text style={{ color: C.textSoft, marginTop: 12, fontSize: 14 }}>
            Reconnexion...
          </Text>
        </View>
      );
    }

    // First-time user: show welcome slides → landing → auth
    if (welcomeStep === "slides") {
      return <WelcomeScreen onFinish={() => setWelcomeStep("landing")} />;
    }

    if (welcomeStep === "landing") {
      return (
        <WelcomeLandingScreen onGetStarted={() => setWelcomeStep("done")} />
      );
    }

    return <AuthFlow />;
  }, [
    finishOnboarding,
    hasEverLoggedIn,
    loading,
    sessionChecked,
    showOnboarding,
    user,
    welcomeStep,
  ]);

  return (
    <View style={{ flex: 1 }}>
      {content}
      {authToast ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => clearAuthToast()}
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            bottom: 16,
            backgroundColor: "#1A2332",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 13, textAlign: "center" }}>
            {authToast}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
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
              height: Platform.OS === "ios" ? 88 : 60 + bottomInset,
              paddingBottom: Platform.OS === "ios" ? 28 : bottomInset + 6,
              paddingTop: 8,
              elevation: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            },
            tabBarActiveTintColor: p.primaryDark,
            tabBarInactiveTintColor: p.tabInactive,
            tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginTop: 2 },
            tabBarIcon: ({ color, size }) => {
              const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                Accueil: "home",
                Prière: "time",
                Coran: "book",
                Apprendre: "school",
                Plus: "grid-outline",
              };
              const name = icons[route.name] ?? "ellipse";
              return <Ionicons name={name} size={size - 2} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Accueil">
            {() => <HomeStack user={user} />}
          </Tab.Screen>
          <Tab.Screen name="Prière">
            {() => <PrayerStack user={user} />}
          </Tab.Screen>
          <Tab.Screen name="Coran">
            {() => <QuranStack user={user} />}
          </Tab.Screen>
          <Tab.Screen
            name="Apprendre"
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                e.preventDefault();
                navigation.navigate("Apprendre", { screen: "LearnHub" });
              },
            })}
          >
            {() => <LearnStack user={user} />}
          </Tab.Screen>
          <Tab.Screen name="Plus">
            {() => <SettingsStack user={user} />}
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
      <Stack.Screen
        name="ImaneCycle"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <ImaneCycleScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// ─── Prayer Stack ─────────────────────────────────────────────────────────────
function PrayerStack({ user }: { user: AuthUser }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PrayerHub">
        {(props) => (
          <PrayerHubScreen navigation={props.navigation} user={user} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="PrayerSettings"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <PrayerSettingsScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="PrayerTracking"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <PrayerTrackingScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Qibla" options={{ animation: "slide_from_right" }}>
        {(props) => (
          <QiblaScreen user={user} onBack={() => props.navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="MosqueFinder"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <MosqueFinderScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="TravelCompanion"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <TravelCompanionScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ZakatCalculator"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <ZakatCalculatorScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="HalalMap" options={{ animation: "slide_from_right" }}>
        {(props) => (
          <HalalMapScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// ─── Learn Stack ──────────────────────────────────────────────────────────────
function LearnStack({ user }: { user: AuthUser }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LearnHub">
        {(props) => (
          <LearnHubScreen navigation={props.navigation} user={user} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="HadithDaily"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <HadithDailyScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="AllahNames"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <AllahNamesScreen
            user={user}
            onBack={() => props.navigation.goBack()}
            initialNameId={(props.route.params as any)?.initialNameId}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Tasbih" options={{ animation: "slide_from_right" }}>
        {(props) => (
          <TasbihScreen user={user} onBack={() => props.navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="DhikrMain"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <DhikrScreen user={user} onBack={() => props.navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="PersonalGoals"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <PersonalGoalsScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Dua" options={{ animation: "slide_from_right" }}>
        {(props) => (
          <DuaScreen user={user} onBack={() => props.navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="IhsanMode"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <IhsanModeScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Gamification"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <GamificationScreen onBack={() => props.navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="AISystem" options={{ animation: "slide_from_right" }}>
        {(props) => <AISystemScreen onBack={() => props.navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen
        name="Community"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <CommunityScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ImaneRamadan"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <ImaneRamadanScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="RamadanCatchup"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <RamadanCatchupScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ImaneProgram"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <ImaneProgramScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="EidGreetings"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <EidGreetingsScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ShareCard"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <ShareCardScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ShareSystem"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <ShareSystemScreen onBack={() => props.navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="KidsModule"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <KidsModuleScreen onBack={() => props.navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="Hifz" options={{ animation: "slide_from_right" }}>
        {(props) => (
          <HifzScreen user={user} onBack={() => props.navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="MoodGuidance"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <MoodGuidanceScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="FeminineHub"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <FeminineHubScreen
            onBack={() => props.navigation.goBack()}
            onOpenCycle={() => {
              props.navigation.goBack();
              props.navigation
                .getParent()
                ?.navigate("Accueil", { screen: "ImaneCycle" });
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// ─── Settings Stack (Plus) ───────────────────────────────────────────────────
function SettingsStack({ user }: { user: AuthUser }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsHub">
        {(props) => (
          <SettingsScreen navigation={props.navigation} user={user} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="PrayerSettingsMore"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <PrayerSettingsScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="HijriCalendar"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <HijriCalendarScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="GlobalSearch"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <GlobalSearchScreen
            user={user}
            onBack={() => props.navigation.goBack()}
            onNavigate={(screen: string) => {
              const parentNav = props.navigation.getParent();
              if (screen === "__CORAN_TAB__")
                parentNav?.navigate("Coran", { screen: "ImaneQuran" });
              else if (screen === "ImaneRamadan")
                parentNav?.navigate("Apprendre", { screen: "ImaneRamadan" });
              else if (screen === "ImaneCycle")
                parentNav?.navigate("Accueil", { screen: "ImaneCycle" });
              else if (screen === "AISystem")
                parentNav?.navigate("Apprendre", { screen: "AISystem" });
              else (props.navigation as any).navigate(screen);
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="AppGuide" options={{ animation: "slide_from_right" }}>
        {(props) => (
          <AppGuideScreen
            user={user}
            onBack={() => props.navigation.goBack()}
            onNavigate={(screen: string) => {
              const parentNav = props.navigation.getParent();
              if (screen === "__CORAN_TAB__")
                parentNav?.navigate("Coran", { screen: "ImaneQuran" });
              else if (screen === "ImaneRamadan")
                parentNav?.navigate("Apprendre", { screen: "ImaneRamadan" });
              else if (screen === "Gamification")
                parentNav?.navigate("Apprendre", { screen: "Gamification" });
              else if (screen === "AISystem")
                parentNav?.navigate("Apprendre", { screen: "AISystem" });
              else (props.navigation as any).navigate(screen);
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="DarkMode" options={{ animation: "slide_from_right" }}>
        {(props) => <DarkModeScreen onBack={() => props.navigation.goBack()} />}
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
      <Stack.Screen
        name="QuranWords"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <QuranWordsScreen
            user={user}
            onBack={() => props.navigation.goBack()}
            initialWordId={(props.route.params as any)?.initialWordId}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="RecitationChecker"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <RecitationCheckerScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function QuranStack({ user }: { user: AuthUser }) {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="ImaneQuran"
    >
      <Stack.Screen name="ImaneQuran">
        {(props) => (
          <ImaneQuranScreen
            user={user}
            onBack={() => props.navigation.goBack()}
            onOpenTafsir={(surahId, ayah, locale) =>
              props.navigation.navigate(
                "Tafsir" as never,
                { surahId, ayah, locale, autoLoad: true } as never,
              )
            }
            onOpenWords={() => props.navigation.navigate("QuranWords" as never)}
            onOpenRecitation={() =>
              props.navigation.navigate("RecitationChecker" as never)
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Tafsir" options={{ animation: "slide_from_right" }}>
        {(props) => (
          <TafsirScreen
            user={user}
            onBackToDashboard={() => props.navigation.goBack()}
            initialSelection={(props.route.params as any) ?? null}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="QuranWords"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <QuranWordsScreen
            user={user}
            onBack={() => props.navigation.goBack()}
            initialWordId={(props.route.params as any)?.initialWordId}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="RecitationChecker"
        options={{ animation: "slide_from_right" }}
      >
        {(props) => (
          <RecitationCheckerScreen
            user={user}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Hifz" options={{ animation: "slide_from_right" }}>
        {(props) => (
          <HifzScreen user={user} onBack={() => props.navigation.goBack()} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// ─── Prayer Hub ───────────────────────────────────────────────────────────────
function PrayerHubScreen({ navigation }: { navigation: any; user: AuthUser }) {
  const insets = useSafeAreaInsets();
  const { palette: p } = useTheme();

  type HubItem = {
    key: string;
    label: string;
    sub: string;
    icon: keyof typeof Ionicons.glyphMap;
    screen: string;
    color: string;
  };
  const items: HubItem[] = [
    {
      key: "tracking",
      label: "Suivi des prières",
      sub: "Enregistre tes 5 prières",
      icon: "checkmark-circle",
      screen: "PrayerTracking",
      color: "#1A7F64",
    },
    {
      key: "qibla",
      label: "Direction Qibla",
      sub: "Boussole vers La Mecque",
      icon: "compass",
      screen: "Qibla",
      color: "#2563EB",
    },
    {
      key: "mosque",
      label: "Mosquées à proximité",
      sub: "Trouver une mosquée",
      icon: "business",
      screen: "MosqueFinder",
      color: "#7C3AED",
    },
    {
      key: "halal",
      label: "Carte Halal",
      sub: "Restaurants & lieux halal",
      icon: "map",
      screen: "HalalMap",
      color: "#D97706",
    },
    {
      key: "travel",
      label: "Compagnon de voyage",
      sub: "Musafir, Qasr & Jam",
      icon: "airplane",
      screen: "TravelCompanion",
      color: "#0891B2",
    },
    {
      key: "zakat",
      label: "Calculateur Zakat",
      sub: "Calcule ta Zakat",
      icon: "calculator",
      screen: "ZakatCalculator",
      color: "#059669",
    },
    {
      key: "settings",
      label: "Réglages prière",
      sub: "Horaires & notifications Adhan",
      icon: "settings",
      screen: "PrayerSettings",
      color: "#6B7280",
    },
  ];

  return (
    <View style={[s.screen, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: p.text }}>
          🕌 Prière
        </Text>
        <Text style={{ fontSize: 13, color: p.textSoft, marginTop: 4 }}>
          Horaires, suivi et direction de la Qibla
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              s.hubCard,
              { backgroundColor: p.card, borderColor: p.border },
            ]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.75}
          >
            <View
              style={[s.hubIconWrap, { backgroundColor: item.color + "18" }]}
            >
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.hubLabel, { color: p.text }]}>{item.label}</Text>
              <Text style={[s.hubSub, { color: p.textSoft }]}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={p.tabInactive} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Learn Hub ────────────────────────────────────────────────────────────────
function LearnHubScreen({ navigation }: { navigation: any; user: AuthUser }) {
  const insets = useSafeAreaInsets();
  const { palette: p } = useTheme();

  type HubItem = {
    key: string;
    label: string;
    sub: string;
    icon: keyof typeof Ionicons.glyphMap;
    screen: string;
    color: string;
  };
  const sections: Array<{ title: string; items: HubItem[] }> = [
    {
      title: "📿 Spiritualité quotidienne",
      items: [
        {
          key: "goals",
          label: "Mes Objectifs",
          sub: "Objectifs islamiques + rappels personnalisés",
          icon: "flag",
          screen: "PersonalGoals",
          color: "#E67E22",
        },
        {
          key: "dhikr",
          label: "Dhikr & Tasbih",
          sub: "Invocations et compteur",
          icon: "radio",
          screen: "DhikrMain",
          color: "#1A7F64",
        },
        {
          key: "dua",
          label: "Du'as & Invocations",
          sub: "Par situation et contexte",
          icon: "hand-left",
          screen: "Dua",
          color: "#7C3AED",
        },
        {
          key: "tasbih",
          label: "Tasbih numérique",
          sub: "Compteur de dhikr",
          icon: "repeat",
          screen: "Tasbih",
          color: "#0891B2",
        },
        {
          key: "ihsan",
          label: "Mode Ihsan",
          sub: "Score spirituel journalier",
          icon: "star",
          screen: "IhsanMode",
          color: "#D97706",
        },
      ],
    },
    {
      title: "📚 Connaissance islamique",
      items: [
        {
          key: "hadith",
          label: "Hadith du jour",
          sub: "Un hadith authentique chaque jour",
          icon: "book",
          screen: "HadithDaily",
          color: "#1A7F64",
        },
        {
          key: "allahNames",
          label: "99 Noms d'Allah",
          sub: "Mémorise les attributs divins",
          icon: "heart",
          screen: "AllahNames",
          color: "#EC4899",
        },
        {
          key: "ai",
          label: "Assistant IA islamique",
          sub: "Répond à tes questions",
          icon: "sparkles",
          screen: "AISystem",
          color: "#6366F1",
        },
      ],
    },
    {
      title: "🌙 Ramadan & Calendrier",
      items: [
        {
          key: "ramadan",
          label: "Ramadan",
          sub: "Suivi du jeûne et suhoor",
          icon: "moon",
          screen: "ImaneRamadan",
          color: "#1A7F64",
        },
        {
          key: "prog",
          label: "Programme Imane",
          sub: "Plan spirituel personnalisé",
          icon: "checkbox",
          screen: "ImaneProgram",
          color: "#2563EB",
        },
        {
          key: "eid",
          label: "Cartes de vœux Aïd",
          sub: "Partager la joie de l'Aïd",
          icon: "gift",
          screen: "EidGreetings",
          color: "#D97706",
        },
      ],
    },
    {
      title: "📜 Hifz & Coran",
      items: [
        {
          key: "quran",
          label: "Lire le Coran",
          sub: "Sourates avec traduction",
          icon: "book",
          screen: "__CORAN_TAB__",
          color: "#1A7F64",
        },
        {
          key: "hifz",
          label: "Hifz — Mémorisation",
          sub: "Répétition espacée intelligente",
          icon: "library",
          screen: "Hifz",
          color: "#2563EB",
        },
        {
          key: "mood",
          label: "Guidance selon ton humeur",
          sub: "Versets & du'as selon ton état",
          icon: "heart-half",
          screen: "MoodGuidance",
          color: "#EC4899",
        },
      ],
    },
    {
      title: "🌸 Espace Sœurs",
      items: [
        {
          key: "feminine",
          label: "Espace Sœurs",
          sub: "Cycle, fiqh féminin & du'as",
          icon: "flower",
          screen: "FeminineHub",
          color: "#EC4899",
        },
      ],
    },
    {
      title: "👶 Enfants",
      items: [
        {
          key: "kids",
          label: "Module Enfants",
          sub: "Alphabet arabe, prophètes, du'as",
          icon: "happy",
          screen: "KidsModule",
          color: "#EC4899",
        },
      ],
    },
    {
      title: "🏆 Progression & Communauté",
      items: [
        {
          key: "gamification",
          label: "Mes récompenses",
          sub: "XP, badges et achievements",
          icon: "trophy",
          screen: "Gamification",
          color: "#D97706",
        },
        {
          key: "community",
          label: "Communauté",
          sub: "Posts, défis et partages",
          icon: "people",
          screen: "Community",
          color: "#EC4899",
        },
        {
          key: "sharecard",
          label: "Partager une citation",
          sub: "Génère une carte islamique",
          icon: "share-social",
          screen: "ShareCard",
          color: "#6366F1",
        },
      ],
    },
  ];

  return (
    <View style={[s.screen, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: p.text }}>
          📚 Apprendre
        </Text>
        <Text style={{ fontSize: 13, color: p.textSoft, marginTop: 4 }}>
          Spiritualité, connaissance et progression
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={[s.sectionTitle, { color: p.text, marginTop: 16 }]}>
              {section.title}
            </Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  s.hubCard,
                  { backgroundColor: p.card, borderColor: p.border },
                ]}
                onPress={() => {
                  if (item.screen === "__CORAN_TAB__") {
                    const parentNav = navigation.getParent();
                    parentNav?.navigate("Coran", { screen: "ImaneQuran" });
                    return;
                  }
                  navigation.navigate(item.screen);
                }}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    s.hubIconWrap,
                    { backgroundColor: item.color + "18" },
                  ]}
                >
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.hubLabel, { color: p.text }]}>
                    {item.label}
                  </Text>
                  <Text style={[s.hubSub, { color: p.textSoft }]}>
                    {item.sub}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={p.tabInactive}
                />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Settings Screen (Plus) ───────────────────────────────────────────────────
function SettingsScreen({
  navigation,
  user,
}: {
  navigation: any;
  user: AuthUser;
}) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { location: detectedLoc } = useLocationContext();
  const { isDark, toggleTheme, palette: p } = useTheme();

  const cityLabel =
    detectedLoc.city && detectedLoc.country
      ? `${detectedLoc.city}, ${detectedLoc.country}`
      : (detectedLoc.city ?? "GPS actif");

  type SettingItem = {
    key: string;
    label: string;
    sub: string;
    icon: keyof typeof Ionicons.glyphMap;
    screen: string;
  };
  const settingsItems: SettingItem[] = [
    {
      key: "prayer",
      label: "Réglages prière",
      sub: "Méthode de calcul & Adhan",
      icon: "time-outline",
      screen: "PrayerSettingsMore",
    },
    {
      key: "calendar",
      label: "Calendrier Hijri",
      sub: "Dates islamiques",
      icon: "calendar-outline",
      screen: "HijriCalendar",
    },
    {
      key: "search",
      label: "Recherche globale",
      sub: "Chercher dans toute l'app",
      icon: "search-outline",
      screen: "GlobalSearch",
    },
    {
      key: "guide",
      label: "Guide de l'app",
      sub: "Découvrir toutes les fonctions",
      icon: "help-circle-outline",
      screen: "AppGuide",
    },
    {
      key: "darkmode",
      label: "Thème & Apparence",
      sub: "Clair, sombre, couleurs",
      icon: "color-palette-outline",
      screen: "DarkMode",
    },
  ];
  const legalItems: SettingItem[] = [
    {
      key: "about",
      label: "À propos",
      sub: appMetadata.name,
      icon: "information-circle-outline",
      screen: "About",
    },
    {
      key: "privacy",
      label: "Confidentialité",
      sub: "Politique de confidentialité",
      icon: "lock-closed-outline",
      screen: "Privacy",
    },
    {
      key: "terms",
      label: "Conditions d'utilisation",
      sub: "CGU de l'application",
      icon: "document-text-outline",
      screen: "Terms",
    },
  ];

  return (
    <View style={[s.screen, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: p.text }}>
          ⚙️ Réglages
        </Text>
        <Text style={{ fontSize: 13, color: p.textSoft, marginTop: 4 }}>
          {user.email}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Location */}
        <View
          style={[
            s.hubCard,
            {
              backgroundColor: "rgba(26,127,100,0.06)",
              borderColor: p.border,
              marginTop: 8,
            },
          ]}
        >
          <View
            style={[
              s.hubIconWrap,
              { backgroundColor: "rgba(26,127,100,0.12)" },
            ]}
          >
            <Ionicons name="location" size={24} color={p.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.hubLabel, { color: p.text }]}>{cityLabel}</Text>
            <Text style={[s.hubSub, { color: p.textSoft }]}>
              Position GPS automatique
            </Text>
          </View>
        </View>

        {/* Dark mode toggle */}
        <Text style={[s.sectionTitle, { color: p.text, marginTop: 20 }]}>
          Apparence
        </Text>
        <View
          style={[
            s.hubCard,
            { backgroundColor: p.card, borderColor: p.border },
          ]}
        >
          <View
            style={[
              s.hubIconWrap,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(26,127,100,0.08)",
              },
            ]}
          >
            <Ionicons
              name={isDark ? "moon" : "sunny"}
              size={24}
              color={p.primaryDark}
            />
          </View>
          <Text style={[s.hubLabel, { flex: 1, color: p.text }]}>
            Mode sombre
          </Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: "#E0E0E0", true: p.primaryDark }}
            thumbColor="#fff"
          />
        </View>

        <Text style={[s.sectionTitle, { color: p.text, marginTop: 20 }]}>
          Paramètres
        </Text>
        {settingsItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              s.hubCard,
              { backgroundColor: p.card, borderColor: p.border },
            ]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.75}
          >
            <View style={[s.hubIconWrap, { backgroundColor: p.accentLight }]}>
              <Ionicons name={item.icon} size={24} color={p.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.hubLabel, { color: p.text }]}>{item.label}</Text>
              <Text style={[s.hubSub, { color: p.textSoft }]}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={p.tabInactive} />
          </TouchableOpacity>
        ))}

        <Text style={[s.sectionTitle, { color: p.text, marginTop: 20 }]}>
          Légal
        </Text>
        {legalItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              s.hubCard,
              { backgroundColor: p.card, borderColor: p.border },
            ]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.75}
          >
            <View style={[s.hubIconWrap, { backgroundColor: p.accentLight }]}>
              <Ionicons name={item.icon} size={24} color={p.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.hubLabel, { color: p.text }]}>{item.label}</Text>
              <Text style={[s.hubSub, { color: p.textSoft }]}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={p.tabInactive} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[
            s.hubCard,
            { marginTop: 24, borderColor: "#FFCDD2", backgroundColor: p.card },
          ]}
          onPress={() => void logout()}
          activeOpacity={0.7}
        >
          <View style={[s.hubIconWrap, { backgroundColor: "#FFEBEE" }]}>
            <Ionicons name="log-out-outline" size={24} color={p.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.hubLabel, { color: p.error }]}>Se déconnecter</Text>
            <Text style={[s.hubSub, { color: p.textSoft }]}>{user.email}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function HomeScreen({ navigation, user }: { navigation: any; user: AuthUser }) {
  return (
    <ModernDashboard
      user={user}
      locale="fr"
      onSearch={() =>
        navigation
          .getParent()
          ?.navigate("Plus", {
            screen: "SettingsHub",
            params: { openSearch: true },
          })
      }
    />
  );
}

function AuthFlow() {
  const [mode, setMode] = useState<
    "login" | "register" | "forgot" | "forgot-otp" | "forgot-new" | "reset"
  >("login");
  const [resetEmail, setResetEmail] = useState("");

  if (mode === "forgot")
    return (
      <ForgotPasswordScreen onSwitch={setMode} onEmailSent={setResetEmail} />
    );
  if (mode === "forgot-otp")
    return <ForgotPasswordOtpScreen onSwitch={setMode} email={resetEmail} />;
  if (mode === "forgot-new")
    return <ForgotPasswordNewScreen onSwitch={setMode} email={resetEmail} />;
  if (mode === "reset") return <ResetPasswordScreen onSwitch={setMode} />;
  return mode === "login" ? (
    <LoginScreen onSwitch={setMode} />
  ) : (
    <RegisterScreen onSwitch={setMode} />
  );
}

function _VerifyEmailScreen({ email }: { email: string }) {
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
    } catch {
      /* resend failure ignored */
    }
  }, [resendVerification, email]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 24,
        }}
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

          {error ? (
            <Text style={[auth.error, { marginTop: 16 }]}>{error}</Text>
          ) : null}

          <AuthInput
            placeholder="Code à 6 chiffres"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          <TouchableOpacity
            style={[
              auth.btn,
              (loading || code.trim().length !== 6) && { opacity: 0.6 },
            ]}
            disabled={loading || code.trim().length !== 6}
            onPress={() => void handleVerify()}
          >
            <Text style={auth.btnText}>
              {loading ? "Vérification..." : "Vérifier"}
            </Text>
          </TouchableOpacity>

          <View style={{ marginTop: 20, alignItems: "center", gap: 12 }}>
            {resent ? (
              <Text
                style={{
                  color: C.primaryDark,
                  fontWeight: "600",
                  fontSize: 14,
                }}
              >
                Code renvoyé !
              </Text>
            ) : (
              <TouchableOpacity onPress={() => void handleResend()}>
                <Text style={auth.link}>Renvoyer le code</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => void logout()}>
              <Text style={[auth.link, { color: C.textSoft }]}>
                Retour à la connexion
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LoginScreen({
  onSwitch,
}: {
  onSwitch: (next: "login" | "register" | "forgot" | "reset") => void;
}) {
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
    <AuthLayout
      title="Connexion"
      subtitle="Accède à ton espace spirituel"
      mode="login"
      onSwitch={onSwitch}
    >
      {error ? (
        <View
          style={[
            auth.errorBox,
            { backgroundColor: "#fee2e2", borderLeftColor: "#ef4444" },
          ]}
        >
          <Ionicons
            name="alert-circle"
            size={16}
            color="#ef4444"
            style={{ marginRight: 8 }}
          />
          <Text style={[auth.error, { color: "#991b1b", flex: 1 }]}>
            {error}
          </Text>
        </View>
      ) : null}
      <AuthInput
        placeholder="Email"
        value={form.email}
        onChangeText={(v) => updateField("email", v)}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <PasswordInput
        placeholder="Mot de passe"
        value={form.password}
        onChangeText={(v) => updateField("password", v)}
      />
      <TouchableOpacity
        style={{ alignSelf: "flex-end", marginTop: 8 }}
        onPress={() => onSwitch("forgot")}
      >
        <Text style={auth.link}>Mot de passe oublié ?</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[auth.btn, loading && { opacity: 0.6 }]}
        disabled={loading}
        onPress={() => void handleSubmit()}
      >
        <Text style={auth.btnText}>
          {loading ? "Connexion..." : "Se connecter"}
        </Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

function RegisterScreen({
  onSwitch,
}: {
  onSwitch: (next: "login" | "register" | "forgot" | "reset") => void;
}) {
  const { register, loading } = useAuth();
  const [form, updateField] = useForm<RegisterPayload>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    locale: "fr",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setError(null);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        locale: form.locale,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(translateError(msg) || "Erreur d'inscription");
    }
  }, [register, form]);

  return (
    <AuthLayout
      title="Inscription"
      subtitle="Commence ton parcours spirituel"
      mode="register"
      onSwitch={onSwitch}
    >
      {error ? (
        <View
          style={[
            auth.errorBox,
            { backgroundColor: "#fee2e2", borderLeftColor: "#ef4444" },
          ]}
        >
          <Ionicons
            name="alert-circle"
            size={16}
            color="#ef4444"
            style={{ marginRight: 8 }}
          />
          <Text style={[auth.error, { color: "#991b1b", flex: 1 }]}>
            {error}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AuthInput
            placeholder="Prénom"
            value={form.firstName}
            onChangeText={(v) => updateField("firstName", v)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AuthInput
            placeholder="Nom"
            value={form.lastName}
            onChangeText={(v) => updateField("lastName", v)}
          />
        </View>
      </View>
      <AuthInput
        placeholder="Email"
        value={form.email}
        onChangeText={(v) => updateField("email", v)}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <PasswordInput
        placeholder="Mot de passe"
        value={form.password}
        onChangeText={(v) => updateField("password", v)}
      />
      <View
        style={{
          backgroundColor: "#f8fafc",
          padding: 12,
          borderRadius: 8,
          marginTop: 8,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: "#64748b",
            marginBottom: 4,
            fontWeight: "600",
          }}
        >
          Le mot de passe doit contenir :
        </Text>
        <Text style={{ fontSize: 11, color: "#94a3b8" }}>
          • Au moins 8 caractères
        </Text>
        <Text style={{ fontSize: 11, color: "#94a3b8" }}>
          • Au moins 1 lettre majuscule (A-Z)
        </Text>
        <Text style={{ fontSize: 11, color: "#94a3b8" }}>
          • Au moins 1 lettre minuscule (a-z)
        </Text>
        <Text style={{ fontSize: 11, color: "#94a3b8" }}>
          • Au moins 1 chiffre (0-9)
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        {locales.map((opt) => {
          const active = form.locale === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                auth.langChip,
                active && {
                  backgroundColor: C.primaryDark,
                  borderColor: C.primaryDark,
                },
              ]}
              onPress={() => updateField("locale", opt.value)}
            >
              <Text style={[auth.langText, active && { color: "#FFF" }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={[auth.btn, loading && { opacity: 0.6 }]}
        disabled={loading}
        onPress={() => void handleSubmit()}
      >
        <Text style={auth.btnText}>
          {loading ? "Inscription..." : "Créer mon compte"}
        </Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

function ForgotPasswordScreen({
  onSwitch,
  onEmailSent,
}: {
  onSwitch: (
    next:
      | "login"
      | "register"
      | "forgot"
      | "forgot-otp"
      | "forgot-new"
      | "reset",
  ) => void;
  onEmailSent: (email: string) => void;
}) {
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
      onEmailSent(email.trim());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(translateError(msg) || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }, [email, onEmailSent]);

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Entre ton email pour recevoir un code"
      mode="login"
      onSwitch={onSwitch}
    >
      {error ? (
        <View
          style={[
            auth.errorBox,
            { backgroundColor: "#fee2e2", borderLeftColor: "#ef4444" },
          ]}
        >
          <Ionicons
            name="alert-circle"
            size={16}
            color="#ef4444"
            style={{ marginRight: 8 }}
          />
          <Text style={[auth.error, { color: "#991b1b", flex: 1 }]}>
            {error}
          </Text>
        </View>
      ) : null}
      <AuthInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {done ? (
        <View style={{ marginTop: 16, gap: 12, alignItems: "center" }}>
          <View
            style={[
              {
                backgroundColor: "#dcfce7",
                borderLeftColor: "#22c55e",
                padding: 12,
                borderRadius: 8,
                width: "100%",
              },
            ]}
          >
            <Text
              style={{
                color: "#166534",
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              Code envoyé !
            </Text>
            <Text
              style={{
                color: "#166534",
                marginTop: 4,
                textAlign: "center",
                fontSize: 13,
              }}
            >
              Vérifie tes emails pour le code à 6 chiffres.
            </Text>
          </View>
          <TouchableOpacity
            style={[auth.btn, { marginTop: 8 }]}
            onPress={() => onSwitch("forgot-otp")}
          >
            <Text style={auth.btnText}>Entrer le code</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onSwitch("login")}>
            <Text style={auth.link}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ marginTop: 16, gap: 12 }}>
          <TouchableOpacity
            style={[auth.btn, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={() => void handleSubmit()}
          >
            <Text style={auth.btnText}>
              {loading ? "Envoi..." : "Envoyer le code"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ alignSelf: "center" }}
            onPress={() => onSwitch("login")}
          >
            <Text style={auth.link}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}
    </AuthLayout>
  );
}

function ForgotPasswordOtpScreen({
  onSwitch,
  email,
}: {
  onSwitch: (
    next:
      | "login"
      | "register"
      | "forgot"
      | "forgot-otp"
      | "forgot-new"
      | "reset",
  ) => void;
  email: string;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(translateError(msg) || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleContinue = useCallback(() => {
    if (code.trim().length !== 6) return;
    onSwitch("forgot-new");
  }, [code, onSwitch]);

  return (
    <AuthLayout
      title="Vérification"
      subtitle={`Entre le code à 6 chiffres envoyé à ${email}`}
      mode="login"
      onSwitch={onSwitch}
    >
      {error ? (
        <View
          style={[
            auth.errorBox,
            { backgroundColor: "#fee2e2", borderLeftColor: "#ef4444" },
          ]}
        >
          <Ionicons
            name="alert-circle"
            size={16}
            color="#ef4444"
            style={{ marginRight: 8 }}
          />
          <Text style={[auth.error, { color: "#991b1b", flex: 1 }]}>
            {error}
          </Text>
        </View>
      ) : null}
      <AuthInput
        placeholder="Code à 6 chiffres"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />
      <View style={{ marginTop: 16, gap: 12 }}>
        <TouchableOpacity
          style={[auth.btn, code.trim().length !== 6 && { opacity: 0.6 }]}
          disabled={code.trim().length !== 6}
          onPress={() => void handleContinue()}
        >
          <Text style={auth.btnText}>Continuer</Text>
        </TouchableOpacity>
        {resent ? (
          <Text
            style={{
              color: C.primaryDark,
              fontWeight: "600",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            Code renvoyé !
          </Text>
        ) : (
          <TouchableOpacity
            onPress={() => void handleSubmit()}
            disabled={loading}
          >
            <Text style={[auth.link, loading && { opacity: 0.6 }]}>
              {loading ? "Envoi..." : "Renvoyer le code"}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{ alignSelf: "center" }}
          onPress={() => onSwitch("login")}
        >
          <Text style={auth.link}>Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
}

function ForgotPasswordNewScreen({
  onSwitch,
  email,
}: {
  onSwitch: (
    next:
      | "login"
      | "register"
      | "forgot"
      | "forgot-otp"
      | "forgot-new"
      | "reset",
  ) => void;
  email: string;
}) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({ email, code, password });
      setDone(true);
      setTimeout(() => onSwitch("login"), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(translateError(msg) || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }, [email, code, password, confirmPassword, onSwitch]);

  return (
    <AuthLayout
      title="Nouveau mot de passe"
      subtitle="Choisis un nouveau mot de passe sécurisé"
      mode="login"
      onSwitch={onSwitch}
    >
      {error ? (
        <View
          style={[
            auth.errorBox,
            { backgroundColor: "#fee2e2", borderLeftColor: "#ef4444" },
          ]}
        >
          <Ionicons
            name="alert-circle"
            size={16}
            color="#ef4444"
            style={{ marginRight: 8 }}
          />
          <Text style={[auth.error, { color: "#991b1b", flex: 1 }]}>
            {error}
          </Text>
        </View>
      ) : null}
      <AuthInput
        placeholder="Code à 6 chiffres"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />
      <PasswordInput
        placeholder="Nouveau mot de passe"
        value={password}
        onChangeText={setPassword}
      />
      <PasswordInput
        placeholder="Confirmer le mot de passe"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <View
        style={{
          backgroundColor: "#f8fafc",
          padding: 12,
          borderRadius: 8,
          marginTop: 8,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: "#64748b",
            marginBottom: 4,
            fontWeight: "600",
          }}
        >
          Le mot de passe doit contenir :
        </Text>
        <Text style={{ fontSize: 11, color: "#94a3b8" }}>
          • Au moins 8 caractères
        </Text>
        <Text style={{ fontSize: 11, color: "#94a3b8" }}>
          • Au moins 1 lettre majuscule (A-Z)
        </Text>
        <Text style={{ fontSize: 11, color: "#94a3b8" }}>
          • Au moins 1 lettre minuscule (a-z)
        </Text>
        <Text style={{ fontSize: 11, color: "#94a3b8" }}>
          • Au moins 1 chiffre (0-9)
        </Text>
      </View>
      {done ? (
        <View
          style={[
            {
              backgroundColor: "#dcfce7",
              borderLeftColor: "#22c55e",
              padding: 12,
              borderRadius: 8,
              marginTop: 16,
            },
          ]}
        >
          <Ionicons
            name="checkmark-circle"
            size={16}
            color="#22c55e"
            style={{ marginRight: 8 }}
          />
          <Text style={{ color: "#166534", fontWeight: "600" }}>
            Mot de passe mis à jour avec succès !
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 16, gap: 12 }}>
          <TouchableOpacity
            style={[
              auth.btn,
              (loading ||
                !code.trim() ||
                password.length < 8 ||
                !confirmPassword) && { opacity: 0.6 },
            ]}
            disabled={
              loading || !code.trim() || password.length < 8 || !confirmPassword
            }
            onPress={() => void handleSubmit()}
          >
            <Text style={auth.btnText}>
              {loading ? "Validation..." : "Mettre à jour"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ alignSelf: "center" }}
            onPress={() => onSwitch("login")}
          >
            <Text style={auth.link}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}
    </AuthLayout>
  );
}

function ResetPasswordScreen({
  onSwitch,
}: {
  onSwitch: (
    next:
      | "login"
      | "register"
      | "forgot"
      | "forgot-otp"
      | "forgot-new"
      | "reset",
  ) => void;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({
        email: email.trim(),
        code: code.trim(),
        password,
      });
      setDone(true);
      setTimeout(() => onSwitch("login"), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(translateError(msg) || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }, [onSwitch, email, code, password]);

  return (
    <AuthLayout
      title="Nouveau mot de passe"
      subtitle="Entre ton email, le code et ton nouveau mot de passe"
      mode="login"
      onSwitch={onSwitch}
    >
      {error ? (
        <View
          style={[
            auth.errorBox,
            { backgroundColor: "#fee2e2", borderLeftColor: "#ef4444" },
          ]}
        >
          <Ionicons
            name="alert-circle"
            size={16}
            color="#ef4444"
            style={{ marginRight: 8 }}
          />
          <Text style={[auth.error, { color: "#991b1b", flex: 1 }]}>
            {error}
          </Text>
        </View>
      ) : null}
      <AuthInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <AuthInput
        placeholder="Code à 6 chiffres"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      <PasswordInput
        placeholder="Nouveau mot de passe"
        value={password}
        onChangeText={setPassword}
      />
      {done ? (
        <View
          style={[
            {
              backgroundColor: "#dcfce7",
              borderLeftColor: "#22c55e",
              padding: 12,
              borderRadius: 8,
              marginTop: 16,
            },
          ]}
        >
          <Ionicons
            name="checkmark-circle"
            size={16}
            color="#22c55e"
            style={{ marginRight: 8 }}
          />
          <Text style={{ color: "#166534", fontWeight: "600" }}>
            Mot de passe mis à jour avec succès !
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 16, gap: 12 }}>
          <TouchableOpacity
            style={[
              auth.btn,
              (loading ||
                !email.trim() ||
                !code.trim() ||
                password.length < 8) && { opacity: 0.6 },
            ]}
            disabled={
              loading || !email.trim() || !code.trim() || password.length < 8
            }
            onPress={() => void handleSubmit()}
          >
            <Text style={auth.btnText}>
              {loading ? "Validation..." : "Mettre à jour"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ alignSelf: "center" }}
            onPress={() => onSwitch("login")}
          >
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

function PasswordInput(
  props: Omit<React.ComponentProps<typeof TextInput>, "secureTextEntry">,
) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <View style={{ position: "relative" }}>
      <TextInput
        {...props}
        secureTextEntry={!showPassword}
        placeholderTextColor={C.tabInactive}
        style={[auth.input, { paddingRight: 50 }]}
      />
      <TouchableOpacity
        style={{
          position: "absolute",
          right: 16,
          top: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={() => setShowPassword(!showPassword)}
      >
        <Ionicons
          name={showPassword ? "eye-off" : "eye"}
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View style={auth.loginImageContainer}>
            <Image
              source={require("./assets/loginimage.png")}
              style={auth.loginImage}
              resizeMode="cover"
            />
          </View>
          <Text style={auth.appName}>{appMetadata.name}</Text>
        </View>

        <View style={auth.card}>
          <View style={auth.tabRow}>
            <TouchableOpacity
              style={[auth.tab, mode === "login" && auth.tabActive]}
              onPress={() => onSwitch("login")}
            >
              <Text
                style={[auth.tabText, mode === "login" && auth.tabTextActive]}
              >
                Connexion
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[auth.tab, mode === "register" && auth.tabActive]}
              onPress={() => onSwitch("register")}
            >
              <Text
                style={[
                  auth.tabText,
                  mode === "register" && auth.tabTextActive,
                ]}
              >
                Inscription
              </Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    marginBottom: 16,
  },
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
  hubCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginBottom: 10,
  },
  hubIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  hubLabel: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 2 },
  hubSub: { fontSize: 12, color: C.textSoft },
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
