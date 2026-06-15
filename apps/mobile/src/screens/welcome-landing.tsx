import React from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@oumoul/ui";
import * as Location from "expo-location";

const { width, height } = Dimensions.get("window");

interface WelcomeLandingProps {
  onGetStarted: () => void;
}

export function WelcomeLandingScreen({ onGetStarted }: WelcomeLandingProps) {
  return (
    <View style={s.container}>
      <LinearGradient
        colors={["#0D4A3A", "#1a7f64", "#2BA882"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Subtle overlay */}
      <View style={s.patternOverlay} />

      {/* Decorative circles */}
      <View style={[s.circle, { top: -60, right: -40, opacity: 0.08 }]} />
      <View style={[s.circle, { bottom: 120, left: -80, opacity: 0.06, width: 260, height: 260 }]} />
      <View style={[s.circle, { top: height * 0.3, right: -60, opacity: 0.05, width: 180, height: 180 }]} />

      {/* Content */}
      <View style={s.content}>
        {/* Welcome Image */}
        <View style={s.welcomeImageContainer}>
          <Image source={require("../../assets/loginimage.png")} style={s.welcomeImage} resizeMode="cover" />
        </View>

        {/* App name */}
        <Text style={s.appName}>Sirat An-Nour</Text>
        <View style={s.divider} />
        <Text style={s.tagline}>
          Ton compagnon spirituel{"\n"}au quotidien
        </Text>

        {/* Features */}
        <View style={s.features}>
          <FeatureItem icon="🕌" text="Horaires de prière précis" />
          <FeatureItem icon="📖" text="Coran, Tafsir & Recherche" />
          <FeatureItem icon="🌙" text="Suivi Ramadan intelligent" />
          <FeatureItem icon="📿" text="Dhikr & Invocations" />
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={s.bottom}>
        <TouchableOpacity style={s.btn} onPress={async () => {
          try { await Location.requestForegroundPermissionsAsync(); } catch {}
          onGetStarted();
        }} activeOpacity={0.85} accessibilityLabel="Commencer" accessibilityRole="button">
          <Text style={s.btnText}>Commencer</Text>
        </TouchableOpacity>
        <Text style={s.version}>Bismillah Ar-Rahman Ar-Rahim</Text>
      </View>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.featureRow}>
      <Text style={s.featureIcon}>{icon}</Text>
      <Text style={s.featureText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  patternOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: width,
    height: height,
    opacity: 0.07,
  },
  circle: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  welcomeImageContainer: {
    width: width * 0.8,
    height: 200,
    borderRadius: 20,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  welcomeImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 24,
  },
  appName: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 2,
    marginVertical: 16,
  },
  tagline: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  features: {
    alignSelf: "stretch",
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bottom: {
    paddingHorizontal: 32,
    paddingBottom: 48,
    paddingTop: 40,
    alignItems: "center",
  },
  btn: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  btnText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0D4A3A",
  },
  version: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: 16,
    fontStyle: "italic",
  },
});
