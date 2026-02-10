import { StatusBar } from "expo-status-bar";
import React, { Component, useCallback, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { appMetadata } from "@oumoul/config";
import { colors } from "@oumoul/ui";
import type { RegisterPayload } from "@oumoul/api";
import { useAuth, AuthProvider } from "./src/context/auth-context";
import { useForm } from "./src/hooks/use-form";
import { authApi } from "./src/api";
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

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <ErrorBoundary>
        <RootSwitch />
      </ErrorBoundary>
    </AuthProvider>
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
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.primary, padding: 16 }}>
          <Text style={{ color: colors.neutral100, fontWeight: "800", fontSize: 18 }}>Erreur application</Text>
          <Text style={{ color: colors.neutral100, marginTop: 12 }}>{this.state.error.message}</Text>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

function RootSwitch() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<
    | "dashboard"
    | "tafsir"
    | "imane-quran"
    | "imane-program"
    | "imane-ramadan"
    | "imane-cycle"
    | "dhikr"
    | "qibla"
    | "hijri-calendar"
    | "prayer-settings"
  >("dashboard");

  const debugLine = loading ? "loading" : user ? "user" : "guest";

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-primary items-center justify-center">
        <Text style={{ position: "absolute", top: 12, left: 12, color: colors.neutral100 }}>debug: {debugLine}</Text>
        <ActivityIndicator size="large" color={colors.neutral100} />
        <Text className="text-neutral-100 mt-sm">Chargement…</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <>
        <SafeAreaView style={{ position: "absolute", top: 0, left: 0, right: 0, padding: 8, backgroundColor: "rgba(0,0,0,0.2)" }}>
          <Text style={{ color: colors.neutral100 }}>debug: {debugLine}</Text>
        </SafeAreaView>
        <AuthFlow />
      </>
    );
  }

  if (view === "tafsir") {
    return <TafsirScreen user={user} onBackToDashboard={() => setView("dashboard")} />;
  }

  if (view === "imane-quran") {
    return <ImaneQuranScreen user={user} onBack={() => setView("dashboard")} />;
  }

  if (view === "imane-program") {
    return <ImaneProgramScreen user={user} onBack={() => setView("dashboard")} />;
  }

  if (view === "imane-ramadan") {
    return <ImaneRamadanScreen user={user} onBack={() => setView("dashboard")} />;
  }

  if (view === "imane-cycle") {
    return <ImaneCycleScreen user={user} onBack={() => setView("dashboard")} />;
  }

  if (view === "dhikr") {
    return <DhikrScreen user={user} onBack={() => setView("dashboard")} />;
  }

  if (view === "qibla") {
    return <QiblaScreen user={user} onBack={() => setView("dashboard")} />;
  }

  if (view === "hijri-calendar") {
    return <HijriCalendarScreen user={user} onBack={() => setView("dashboard")} />;
  }

  if (view === "prayer-settings") {
    return <PrayerSettingsScreen user={user} onBack={() => setView("dashboard")} />;
  }

  return (
    <>
      <DashboardScreen user={user} />
      {/* Simple floating buttons to open Tafsir, Coran, Programme Imane, Cycle ou Dhikr depuis le tableau de bord */}
      <SafeAreaView
        pointerEvents="box-none"
        style={{ position: "absolute", bottom: 24, right: 24, flexDirection: "column", gap: 8 }}
      >
        <TouchableOpacity
          className="bg-neutral-100 rounded-full px-md py-xs mb-xs"
          onPress={() => setView("tafsir")}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Tafsir</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-neutral-100 rounded-full px-md py-xs"
          onPress={() => setView("imane-quran")}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Coran</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-neutral-100 rounded-full px-md py-xs mt-xs"
          onPress={() => setView("imane-program")}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Imane</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-neutral-100 rounded-full px-md py-xs mt-xs"
          onPress={() => setView("imane-ramadan")}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Ramadan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-neutral-100 rounded-full px-md py-xs mt-xs"
          onPress={() => setView("imane-cycle")}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Cycle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-neutral-100 rounded-full px-md py-xs mt-xs"
          onPress={() => setView("dhikr")}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Dhikr</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-neutral-100 rounded-full px-md py-xs mt-xs"
          onPress={() => setView("qibla")}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Qibla</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-neutral-100 rounded-full px-md py-xs mt-xs"
          onPress={() => setView("prayer-settings")}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Prière</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-neutral-100 rounded-full px-md py-xs mt-xs"
          onPress={() => setView("hijri-calendar")}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Calendrier</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

function AuthFlow() {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");

  if (mode === "forgot") {
    return <ForgotPasswordScreen onSwitch={setMode} />;
  }

  if (mode === "reset") {
    return <ResetPasswordScreen onSwitch={setMode} />;
  }

  return mode === "login" ? <LoginScreen onSwitch={setMode} /> : <RegisterScreen onSwitch={setMode} />;
}

function LoginScreen({
  onSwitch,
}: {
  onSwitch: (next: "login" | "register" | "forgot" | "reset") => void;
}) {
  const { login, loading } = useAuth();
  const [form, updateField] = useForm({ email: "", password: "" });
  const handleSubmit = useCallback(async () => {
    await login(form.email.trim(), form.password);
  }, [login, form]);

  return (
    <AuthLayout
      title="Connexion"
      description="Rejoins ton tableau de bord pour suivre prières, jeûnes et rappels."
      mode="login"
      onSwitch={onSwitch}
    >
      <TextInput
        className="w-full bg-white/10 text-neutral-100 rounded-lg px-md py-sm mt-sm"
        placeholder="toi@example.com"
        placeholderTextColor="rgba(255,255,255,0.6)"
        keyboardType="email-address"
        autoCapitalize="none"
        value={form.email}
        style={{
          color: colors.neutral100,
          backgroundColor: "rgba(255,255,255,0.12)",
          borderColor: "rgba(255,255,255,0.22)",
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
        onChangeText={(value) => updateField("email", value)}
      />
      <TextInput
        className="w-full bg-white/10 text-neutral-100 rounded-lg px-md py-sm mt-sm"
        placeholder="Mot de passe"
        placeholderTextColor="rgba(255,255,255,0.6)"
        secureTextEntry
        value={form.password}
        style={{
          color: colors.neutral100,
          backgroundColor: "rgba(255,255,255,0.12)",
          borderColor: "rgba(255,255,255,0.22)",
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
        onChangeText={(value) => updateField("password", value)}
      />
      <TouchableOpacity
        className="mt-sm self-end"
        onPress={() => onSwitch("forgot")}
      >
        <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "600", textDecorationLine: "underline" }}>
          Mot de passe oublié ?
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="w-full mt-lg bg-neutral-100 rounded-lg py-sm items-center"
        disabled={loading}
        onPress={() => void handleSubmit()}
      >
        <Text style={{ color: colors.primary, fontWeight: "700" }}>{loading ? "Connexion…" : "Se connecter"}</Text>
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

  const handleSubmit = useCallback(async () => {
    await register({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
      locale: form.locale,
    });
  }, [register, form]);

  return (
    <AuthLayout
      title="Créer un compte"
      description="Commence ton parcours avec Oumoul : rappels personnalisés et suivi Ramadân."
      mode="register"
      onSwitch={onSwitch}
    >
      <View className="flex-row gap-sm">
        <TextInput
          className="flex-1 bg-white/10 text-neutral-100 rounded-lg px-md py-sm mt-sm"
          placeholder="Prénom"
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={form.firstName}
          style={{
            color: colors.neutral100,
            backgroundColor: "rgba(255,255,255,0.12)",
            borderColor: "rgba(255,255,255,0.22)",
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
          onChangeText={(value) => updateField("firstName", value)}
        />
        <TextInput
          className="flex-1 bg-white/10 text-neutral-100 rounded-lg px-md py-sm mt-sm"
          placeholder="Nom"
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={form.lastName}
          style={{
            color: colors.neutral100,
            backgroundColor: "rgba(255,255,255,0.12)",
            borderColor: "rgba(255,255,255,0.22)",
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
          onChangeText={(value) => updateField("lastName", value)}
        />
      </View>
      <TextInput
        className="w-full bg-white/10 text-neutral-100 rounded-lg px-md py-sm mt-sm"
        placeholder="toi@example.com"
        placeholderTextColor="rgba(255,255,255,0.6)"
        keyboardType="email-address"
        autoCapitalize="none"
        value={form.email}
        style={{
          color: colors.neutral100,
          backgroundColor: "rgba(255,255,255,0.12)",
          borderColor: "rgba(255,255,255,0.22)",
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
        onChangeText={(value) => updateField("email", value)}
      />
      <TextInput
        className="w-full bg-white/10 text-neutral-100 rounded-lg px-md py-sm mt-sm"
        placeholder="Mot de passe"
        placeholderTextColor="rgba(255,255,255,0.6)"
        secureTextEntry
        value={form.password}
        style={{
          color: colors.neutral100,
          backgroundColor: "rgba(255,255,255,0.12)",
          borderColor: "rgba(255,255,255,0.22)",
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
        onChangeText={(value) => updateField("password", value)}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-md">
        {locales.map((option) => (
          <TouchableOpacity
            key={option.value}
            className={`px-md py-sm rounded-md mr-sm border ${
              form.locale === option.value ? "bg-neutral-100 border-transparent" : "border-white/40"
            }`}
            onPress={() => updateField("locale", option.value)}
          >
            <Text
              style={{
                color: form.locale === option.value ? colors.primary : colors.neutral100,
                fontWeight: "600",
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity
        className="w-full mt-lg bg-neutral-100 rounded-lg py-sm items-center"
        disabled={loading}
        onPress={() => void handleSubmit()}
      >
        <Text style={{ color: colors.primary, fontWeight: "700" }}>{loading ? "Inscription…" : "Créer mon compte"}</Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

function ForgotPasswordScreen({
  onSwitch,
}: {
  onSwitch: (next: "login" | "register" | "forgot" | "reset") => void;
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [email]);

  return (
    <AuthLayout
      title="Mot de passe oublié"
      description="Entre ton email. En dev, le lien apparaît dans les logs du backend."
      mode="login"
      onSwitch={onSwitch}
    >
      <TextInput
        className="w-full bg-white/10 text-neutral-100 rounded-lg px-md py-sm mt-sm"
        placeholder="toi@example.com"
        placeholderTextColor="rgba(255,255,255,0.6)"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        style={{
          color: colors.neutral100,
          backgroundColor: "rgba(255,255,255,0.12)",
          borderColor: "rgba(255,255,255,0.22)",
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
        onChangeText={setEmail}
      />

      {error && <Text style={{ color: "#FFD6D6", marginTop: 12 }}>{error}</Text>}

      {done ? (
        <View className="mt-lg">
          <Text style={{ color: "rgba(255,255,255,0.9)", lineHeight: 20 }}>
            Si un compte existe, un lien a été généré.
          </Text>
          <TouchableOpacity className="mt-md" onPress={() => onSwitch("reset")}> 
            <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700", textDecorationLine: "underline" }}>
              J'ai un token / lien
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="mt-md" onPress={() => onSwitch("login")}>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "700", textDecorationLine: "underline" }}>
              Retour à la connexion
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="mt-lg">
          <TouchableOpacity
            className="w-full bg-neutral-100 rounded-lg py-sm items-center"
            disabled={loading}
            onPress={() => void handleSubmit()}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>{loading ? "Envoi…" : "Envoyer"}</Text>
          </TouchableOpacity>
          <TouchableOpacity className="mt-md self-center" onPress={() => onSwitch("login")}>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "600", textDecorationLine: "underline" }}>
              Retour
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </AuthLayout>
  );
}

function ResetPasswordScreen({
  onSwitch,
}: {
  onSwitch: (next: "login" | "register" | "forgot" | "reset") => void;
}) {
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
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [onSwitch, password, token]);

  return (
    <AuthLayout
      title="Nouveau mot de passe"
      description="Colle le token reçu dans le lien, puis choisis un nouveau mot de passe."
      mode="login"
      onSwitch={onSwitch}
    >
      <TextInput
        className="w-full bg-white/10 text-neutral-100 rounded-lg px-md py-sm mt-sm"
        placeholder="Token"
        placeholderTextColor="rgba(255,255,255,0.6)"
        autoCapitalize="none"
        value={token}
        style={{
          color: colors.neutral100,
          backgroundColor: "rgba(255,255,255,0.12)",
          borderColor: "rgba(255,255,255,0.22)",
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
        onChangeText={setToken}
      />
      <TextInput
        className="w-full bg-white/10 text-neutral-100 rounded-lg px-md py-sm mt-sm"
        placeholder="Nouveau mot de passe"
        placeholderTextColor="rgba(255,255,255,0.6)"
        secureTextEntry
        value={password}
        style={{
          color: colors.neutral100,
          backgroundColor: "rgba(255,255,255,0.12)",
          borderColor: "rgba(255,255,255,0.22)",
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
        onChangeText={setPassword}
      />

      {error && <Text style={{ color: "#FFD6D6", marginTop: 12 }}>{error}</Text>}

      {done ? (
        <Text style={{ color: "rgba(255,255,255,0.9)", marginTop: 16 }}>Mot de passe mis à jour…</Text>
      ) : (
        <View className="mt-lg">
          <TouchableOpacity
            className="w-full bg-neutral-100 rounded-lg py-sm items-center"
            disabled={loading || !token.trim() || password.length < 8}
            onPress={() => void handleSubmit()}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>{loading ? "Validation…" : "Mettre à jour"}</Text>
          </TouchableOpacity>
          <TouchableOpacity className="mt-md self-center" onPress={() => onSwitch("login")}>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "600", textDecorationLine: "underline" }}>
              Retour
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </AuthLayout>
  );
}

function AuthLayout({
  children,
  title,
  description,
  mode,
  onSwitch,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  mode: "login" | "register";
  onSwitch: (next: "login" | "register") => void;
}) {
  return (
    <SafeAreaView className="flex-1 bg-primary" style={{ backgroundColor: colors.primary }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-lg py-2xl">
        <View className="flex-1 items-center justify-center">
          <View
            className="w-full max-w-xl bg-white/10 rounded-2xl p-6"
            style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
          >
            <Text className="text-neutral-100 text-xs tracking-[4px] uppercase">{appMetadata.name}</Text>
            <Text className="text-neutral-100 text-3xl font-bold leading-tight mt-sm">{title}</Text>
            <Text className="text-neutral-100/80 text-base leading-6 mt-sm">{description}</Text>
            <View className="flex-row gap-sm mt-md">
              <TouchableOpacity
                className={`flex-1 rounded-md py-sm ${
                  mode === "login" ? "bg-neutral-100" : "border border-white/40"
                }`}
                onPress={() => onSwitch("login")}
              >
                <Text
                  className="text-center font-semibold"
                  style={{ color: mode === "login" ? colors.primary : colors.neutral100 }}
                >
                  Connexion
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-md py-sm ${
                  mode === "register" ? "bg-neutral-100" : "border border-white/40"
                }`}
                onPress={() => onSwitch("register")}
              >
                <Text
                  className="text-center font-semibold"
                  style={{ color: mode === "register" ? colors.primary : colors.neutral100 }}
                >
                  Inscription
                </Text>
              </TouchableOpacity>
            </View>
            <View className="mt-lg">{children}</View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const locales: Array<{ value: RegisterPayload["locale"]; label: string }> = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];
