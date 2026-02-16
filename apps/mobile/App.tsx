import { StatusBar } from "expo-status-bar";
import React, { Component, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
import { useForm } from "./src/hooks/use-form";
import { authApi, API_URL } from "./src/api";
import { DashboardScreen } from "./src/screens/dashboard";
import { TafsirScreen } from "./src/screens/tafsir";
import { ImaneQuranScreen } from "./src/screens/imane-quran";
import { ImaneProgramScreen } from "./src/screens/imane-program";
import { ImaneCycleScreen } from "./src/screens/imane-cycle";
import { ImaneRamadanScreen } from "./src/screens/imane-ramadan";
import { DhikrScreen } from "./src/screens/dhikr";
import { QiblaScreen } from "./src/screens/qibla";
import { HijriCalendarScreen } from "./src/screens/hijri-calendar";
import { PrayerSettingsScreen } from "./src/screens/prayer-settings";
import { WelcomeScreen } from "./src/screens/welcome";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const C = {
  bg: "#FAF5EF",
  card: "#FFFFFF",
  cardBorder: "rgba(0,0,0,0.06)",
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  accent: colors.accent,
  text: colors.neutral900,
  textSoft: "rgba(26,26,26,0.55)",
  textOnPrimary: "#FFFFFF",
  inputBg: "rgba(0,0,0,0.04)",
  inputBorder: "rgba(0,0,0,0.10)",
  tabBar: "#FFFFFF",
  tabInactive: "rgba(26,26,26,0.35)",
  error: "#D32F2F",
  errorBg: "#FFEBEE",
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <ErrorBoundary>
          <RootSwitch />
        </ErrorBoundary>
      </AuthProvider>
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
  const [welcomeDone, setWelcomeDone] = useState(false);

  if (loading) {
    return (
      <View style={[a.center, { flex: 1, backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.primaryDark} />
        <Text style={{ color: C.textSoft, marginTop: 12, fontSize: 14 }}>Chargement...</Text>
      </View>
    );
  }

  if (pendingVerificationEmail) {
    return <VerifyEmailScreen email={pendingVerificationEmail} />;
  }

  if (!user && !welcomeDone) {
    return <WelcomeScreen onFinish={() => setWelcomeDone(true)} />;
  }

  if (!user) {
    return <AuthFlow />;
  }

  return <MainApp user={user} />;
}

function MainApp({ user }: { user: AuthUser }) {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.tabBar,
            borderTopColor: C.cardBorder,
            borderTopWidth: 1,
            height: Platform.OS === "ios" ? 88 : 64,
            paddingBottom: Platform.OS === "ios" ? 28 : 8,
            paddingTop: 8,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          },
          tabBarActiveTintColor: C.primaryDark,
          tabBarInactiveTintColor: C.tabInactive,
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
  );
}

function HomeStack({ user }: { user: AuthUser }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen">
        {(props) => <HomeScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen name="Dashboard" options={{ animation: "slide_from_right" }}>
        {(props) => <DashboardScreen user={user} />}
      </Stack.Screen>
      <Stack.Screen name="PrayerSettings" options={{ animation: "slide_from_right" }}>
        {(props) => <PrayerSettingsScreen user={user} onBack={() => props.navigation.goBack()} />}
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
      <Stack.Screen name="ImaneCycle" options={{ animation: "slide_from_right" }}>
        {(props) => <ImaneCycleScreen user={user} onBack={() => props.navigation.goBack()} />}
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
    </Stack.Navigator>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Bonne nuit";
  if (h < 12) return "Sabah al-khayr";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function getHijriLabel(): string {
  try {
    const fmt = new Intl.DateTimeFormat("fr-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return fmt.format(new Date());
  } catch {
    return "";
  }
}

type ModuleCard = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
};

function HomeScreen({ navigation, user }: { navigation: any; user: AuthUser }) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const greeting = useMemo(() => getGreeting(), []);
  const hijri = useMemo(() => getHijriLabel(), []);

  const onLogout = useCallback(async () => {
    setLogoutBusy(true);
    try { await logout(); } finally { setLogoutBusy(false); }
  }, [logout]);

  const modules: ModuleCard[] = [
    { key: "dashboard", label: "Tableau de bord", icon: "stats-chart", color: "#E8D5E0", onPress: () => navigation.navigate("Dashboard") },
    { key: "prayer", label: "Prière", icon: "time", color: "#D5E8D5", onPress: () => navigation.navigate("PrayerSettings") },
    { key: "quran", label: "Coran", icon: "book", color: "#D5D8E8", onPress: () => navigation.getParent()?.navigate("Coran") },
    { key: "dhikr", label: "Dhikr", icon: "heart", color: "#E8E0D5", onPress: () => navigation.getParent()?.navigate("Dhikr") },
    { key: "ramadan", label: "Ramadan", icon: "moon", color: "#D5E0E8", onPress: () => navigation.getParent()?.navigate("Ramadan") },
    { key: "calendar", label: "Calendrier", icon: "calendar", color: "#E8D5D5", onPress: () => navigation.getParent()?.navigate("Plus", { screen: "HijriCalendar" }) },
    { key: "qibla", label: "Qibla", icon: "compass", color: "#D5E8E0", onPress: () => navigation.getParent()?.navigate("Plus", { screen: "Qibla" }) },
    { key: "program", label: "Programme", icon: "checkbox", color: "#E0D5E8", onPress: () => navigation.getParent()?.navigate("Plus", { screen: "ImaneProgram" }) },
  ];

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting}</Text>
            <Text style={s.userName}>{user.firstName || user.email}</Text>
            {hijri ? <Text style={s.hijriLabel}>{hijri}</Text> : null}
          </View>
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={() => void onLogout()}
            disabled={logoutBusy}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={C.primaryDark} />
          </TouchableOpacity>
        </View>

        <View style={s.heroCard}>
          <Text style={s.heroEmoji}>{"  "}</Text>
          <Text style={s.heroTitle}>Bismillah</Text>
          <Text style={s.heroSub}>Que cette journée soit remplie de baraka et de sérénité.</Text>
        </View>

        <Text style={s.sectionTitle}>Modules</Text>
        <View style={s.grid}>
          {modules.map((m) => (
            <TouchableOpacity key={m.key} style={[s.moduleCard, { backgroundColor: m.color }]} onPress={m.onPress} activeOpacity={0.75}>
              <View style={s.moduleIconWrap}>
                <Ionicons name={m.icon} size={24} color={C.primaryDark} />
              </View>
              <Text style={s.moduleLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function MoreScreen({ navigation, user }: { navigation: any; user: AuthUser }) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const items: Array<{ key: string; label: string; icon: keyof typeof Ionicons.glyphMap; screen: string }> = [
    { key: "cal", label: "Calendrier Hijri", icon: "calendar", screen: "HijriCalendar" },
    { key: "qibla", label: "Direction Qibla", icon: "compass", screen: "Qibla" },
    { key: "prog", label: "Programme Imane", icon: "checkbox", screen: "ImaneProgram" },
    { key: "prayer", label: "Réglages prière", icon: "settings", screen: "PrayerSettingsMore" },
  ];

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.sectionTitle, { marginTop: 16 }]}>Plus</Text>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={s.listItem}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <View style={s.listIconWrap}>
              <Ionicons name={item.icon} size={20} color={C.primaryDark} />
            </View>
            <Text style={s.listLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={C.tabInactive} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[s.listItem, { marginTop: 24, borderColor: "#FFCDD2" }]}
          onPress={() => void logout()}
          activeOpacity={0.7}
        >
          <View style={[s.listIconWrap, { backgroundColor: "#FFEBEE" }]}>
            <Ionicons name="log-out-outline" size={20} color={C.error} />
          </View>
          <Text style={[s.listLabel, { color: C.error }]}>Se déconnecter</Text>
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
    Alert.alert("DEBUG", `URL: ${API_URL}\nEmail: ${form.email.trim()}`);
    try {
      await login(form.email.trim(), form.password);
      Alert.alert("LOGIN OK", "Connexion réussie!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert("LOGIN ERROR", msg || "(empty error message)");
      if (msg.toLowerCase().includes("not verified") || msg.toLowerCase().includes("non vérifié")) {
        setError("Email non vérifié. Veuillez vérifier votre boîte mail.");
      } else {
        setError(msg || "Erreur inconnue");
      }
    }
  }, [login, form]);

  return (
    <AuthLayout title="Connexion" subtitle="Accède à ton espace spirituel" mode="login" onSwitch={onSwitch}>
      <Text style={{ fontSize: 9, color: "#999", marginBottom: 8 }}>API: {API_URL}</Text>
      {error ? <Text style={auth.error}>{error}</Text> : null}
      <AuthInput placeholder="Email" value={form.email} onChangeText={(v) => updateField("email", v)} keyboardType="email-address" autoCapitalize="none" />
      <AuthInput placeholder="Mot de passe" value={form.password} onChangeText={(v) => updateField("password", v)} secureTextEntry />
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
    Alert.alert("DEBUG REGISTER", `URL: ${API_URL}\nEmail: ${form.email.trim()}`);
    try {
      await register({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), password: form.password, locale: form.locale });
      Alert.alert("REGISTER OK", "Inscription réussie! Vérifie ton email.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert("REGISTER ERROR", msg || "(empty error message)");
      setError(msg || "Erreur inconnue");
    }
  }, [register, form]);

  return (
    <AuthLayout title="Inscription" subtitle="Commence ton parcours spirituel" mode="register" onSwitch={onSwitch}>
      {error ? <Text style={auth.error}>{error}</Text> : null}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AuthInput placeholder="Prénom" value={form.firstName} onChangeText={(v) => updateField("firstName", v)} />
        </View>
        <View style={{ flex: 1 }}>
          <AuthInput placeholder="Nom" value={form.lastName} onChangeText={(v) => updateField("lastName", v)} />
        </View>
      </View>
      <AuthInput placeholder="Email" value={form.email} onChangeText={(v) => updateField("email", v)} keyboardType="email-address" autoCapitalize="none" />
      <AuthInput placeholder="Mot de passe" value={form.password} onChangeText={(v) => updateField("password", v)} secureTextEntry />
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
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
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
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }, [onSwitch, password, token]);

  return (
    <AuthLayout title="Nouveau mot de passe" subtitle="Colle le token et choisis un nouveau mot de passe" mode="login" onSwitch={onSwitch}>
      {error ? <Text style={auth.error}>{error}</Text> : null}
      <AuthInput placeholder="Token" value={token} onChangeText={setToken} autoCapitalize="none" />
      <AuthInput placeholder="Nouveau mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
      {done ? (
        <Text style={{ color: C.text, marginTop: 16 }}>Mot de passe mis à jour !</Text>
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
          <View style={auth.logoCircle}>
            <Text style={{ fontSize: 28 }}>{"  "}</Text>
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

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 20 * 2 - 12) / 2;

const a = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 24 },
  greeting: { fontSize: 14, color: C.textSoft, fontWeight: "500" },
  userName: { fontSize: 24, color: C.text, fontWeight: "700", marginTop: 2 },
  hijriLabel: { fontSize: 12, color: C.textSoft, marginTop: 4 },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  heroCard: {
    backgroundColor: C.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
  },
  heroEmoji: { fontSize: 32, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: "700", color: C.text },
  heroSub: { fontSize: 14, color: "rgba(26,26,26,0.65)", marginTop: 6, lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  moduleCard: {
    width: CARD_W,
    borderRadius: 16,
    padding: 20,
    minHeight: 110,
    justifyContent: "space-between",
  },
  moduleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  moduleLabel: { fontSize: 14, fontWeight: "600", color: C.text },
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
    color: C.error,
    backgroundColor: C.errorBg,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    marginBottom: 8,
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
