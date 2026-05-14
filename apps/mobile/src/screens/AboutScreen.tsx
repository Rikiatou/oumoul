import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/theme-context";

export function AboutScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { palette: p } = useTheme();
  const { width } = Dimensions.get("window");

  const handleEmail = () => {
    Linking.openURL("mailto:contact@nissa-imane.com");
  };

  const handleWebsite = () => {
    Linking.openURL("https://nissa-imane.com");
  };

  const handleInstagram = () => {
    Linking.openURL("https://instagram.com/nissaimane");
  };

  const handlePrivacy = () => {
    Linking.openURL("https://kabrak-eng.com/privacy");
  };

  const handleTerms = () => {
    Linking.openURL("https://kabrak-eng.com/terms");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: p.border }]}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: p.text }]}>À Propos</Text>
          <Text style={[styles.headerSub, { color: p.textSoft }]}>🌸 Nissa Imane</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="heart" size={24} color="#EC4899" />
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={[styles.heroCard, { backgroundColor: p.card }]}>
          <View style={styles.heroHeader}>
            <View style={styles.heroLogo}>
              <Text style={styles.heroLogoText}>🌸</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={[styles.heroName, { color: p.text }]}>Nissa Imane</Text>
              <Text style={[styles.heroTagline, { color: p.textSoft }]}>Ton compagnon spirituel quotidien</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>Version 2.0.0</Text>
              </View>
            </View>
          </View>
          
          <Text style={[styles.heroDescription, { color: p.text }]}>
            🌟 Bienvenue dans ton oasis spirituelle ! Nissa Imane est plus qu'une app, c'est ta compagne de route 
            vers une connexion plus profonde avec ta foi. Nous avons créé chaque fonctionnalité avec amour et 
            intention pour t'accompagner dans chaque moment de ta journée spirituelle.
          </Text>
        </View>

        {/* Mission */}
        <View style={[styles.section, { backgroundColor: p.card }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>🎯 Notre Mission</Text>
          <Text style={[styles.sectionText, { color: p.text }]}>
            Faciliter la pratique spirituelle musulmane à travers la technologie moderne, en rendant les aspects 
            essentiels de l'Islam (prière, Coran, dhikr, Ramadan) accessibles, compréhensibles et engageants pour 
            les musulmans d'aujourd'hui.
          </Text>
        </View>

        {/* Vision */}
        <View style={[styles.section, { backgroundColor: p.card }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>👁️ Notre Vision</Text>
          <Text style={[styles.sectionText, { color: p.text }]}>
            Devenir la référence mondiale des applications spirituelles musulmanes, en offrant des solutions 
            intelligentes, adaptatives et centrées sur l'utilisateur qui respectent les principes de l'Islam 
            tout en utilisant les meilleures pratiques technologiques.
          </Text>
        </View>

        {/* Values */}
        <View style={[styles.section, { backgroundColor: p.card }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>💎 Nos Valeurs</Text>
          <View style={styles.valuesList}>
            <View style={styles.valueItem}>
              <Ionicons name="heart" size={20} color={p.primary} />
              <Text style={[styles.valueText, { color: p.text }]}>
                <Text style={[styles.valueTitle, { color: p.text }]}>Authenticité</Text>
                Respect des sources islamiques authentiques
              </Text>
            </View>
            <View style={styles.valueItem}>
              <Ionicons name="sparkles" size={20} color={p.primary} />
              <Text style={[styles.valueText, { color: p.text }]}>
                <Text style={[styles.valueTitle, { color: p.text }]}>Innovation</Text>
                Technologie de pointe au service de la spiritualité
              </Text>
            </View>
            <View style={styles.valueItem}>
              <Ionicons name="people" size={20} color={p.primary} />
              <Text style={[styles.valueText, { color: p.text }]}>
                <Text style={[styles.valueTitle, { color: p.text }]}>Communauté</Text>
                Connecter les musulmans du monde entier
              </Text>
            </View>
            <View style={styles.valueItem}>
              <Ionicons name="shield-checkmark" size={20} color={p.primary} />
              <Text style={[styles.valueText, { color: p.text }]}>
                <Text style={[styles.valueTitle, { color: p.text }]}>Confiance</Text>
                Sécurité et confidentialité des données
              </Text>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={[styles.section, { backgroundColor: p.card }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>📬 Restons en contact !</Text>
          <View style={styles.contactGrid}>
            <TouchableOpacity style={[styles.contactCard, { backgroundColor: p.bgAlt }]} onPress={handleEmail}>
              <View style={[styles.contactIcon, { backgroundColor: '#10B981' }]}>
                <Ionicons name="mail" size={20} color="#fff" />
              </View>
              <Text style={[styles.contactTitle, { color: p.text }]}>Email</Text>
              <Text style={[styles.contactSubtext, { color: p.textSoft }]}>contact@nissa-imane.com</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.contactCard, { backgroundColor: p.bgAlt }]} onPress={handleWebsite}>
              <View style={[styles.contactIcon, { backgroundColor: '#3B82F6' }]}>
                <Ionicons name="globe" size={20} color="#fff" />
              </View>
              <Text style={[styles.contactTitle, { color: p.text }]}>Site Web</Text>
              <Text style={[styles.contactSubtext, { color: p.textSoft }]}>nissa-imane.com</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.contactCard, { backgroundColor: p.bgAlt }]} onPress={handleInstagram}>
              <View style={[styles.contactIcon, { backgroundColor: '#EC4899' }]}>
                <Ionicons name="logo-instagram" size={20} color="#fff" />
              </View>
              <Text style={[styles.contactTitle, { color: p.text }]}>Instagram</Text>
              <Text style={[styles.contactSubtext, { color: p.textSoft }]}>@nissaimane</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal Links */}
        <View style={[styles.section, { backgroundColor: p.card }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>⚖️ Informations Légales</Text>
          <View style={styles.legalList}>
            <TouchableOpacity style={[styles.legalItem, { backgroundColor: p.bgAlt }]} onPress={handlePrivacy}>
              <Ionicons name="lock-closed" size={20} color={p.primary} />
              <Text style={[styles.legalText, { color: p.text }]}>Politique de Confidentialité</Text>
              <Ionicons name="chevron-forward" size={16} color={p.textSoft} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.legalItem, { backgroundColor: p.bgAlt }]} onPress={handleTerms}>
              <Ionicons name="document-text" size={20} color={p.primary} />
              <Text style={[styles.legalText, { color: p.text }]}>Conditions d'Utilisation</Text>
              <Ionicons name="chevron-forward" size={16} color={p.textSoft} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: p.text }]}>Nissa Imane Tracker</Text>
          <Text style={[styles.footerSubtext, { color: p.textSoft }]}>Version 2.0.0</Text>
          <Text style={[styles.footerSubtext, { color: p.textSoft }]}>Développé par KABRAK ENG</Text>
          <Text style={[styles.footerSubtext, { color: p.textSoft }]}>2025</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  headerSub: {
    fontSize: 12,
    textAlign: "center",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  companyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  companyTagline: {
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "justify",
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 18,
    textAlign: "justify",
  },
  valuesList: {
    gap: 16,
  },
  valueItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  valueText: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  contactList: {
    gap: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  contactText: {
    fontSize: 14,
    fontWeight: "600",
  },
  legalList: {
    gap: 8,
  },
  legalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
  },
  legalText: {
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 4,
  },
  footerText: {
    fontSize: 16,
    fontWeight: "600",
  },
  footerSubtext: {
    fontSize: 12,
  },
  // New hero styles
  heroCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  heroLogo: {
    width: 60,
    height: 60,
    backgroundColor: '#FEE2E2',
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  heroLogoText: {
    fontSize: 28,
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  heroTagline: {
    fontSize: 14,
    marginBottom: 8,
  },
  versionBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  versionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  heroDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "justify",
  },
  // New contact styles
  contactGrid: {
    gap: 12,
  },
  contactCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactSubtext: {
    fontSize: 13,
  },
});
