import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/theme-context";

export function TermsScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { palette: p } = useTheme();

  const handleContact = () => {
    Linking.openURL("mailto:kabrakeng@gmail.com");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: p.border }]}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: p.text }]}>Conditions d'Utilisation</Text>
          <Text style={[styles.headerSub, { color: p.textSoft }]}>KABRAK ENG</Text>
        </View>
        <Ionicons name="document-text" size={24} color={p.primaryDark} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Introduction */}
        <View style={[styles.card, { backgroundColor: p.card }]}>
          <Text style={[styles.cardTitle, { color: p.text }]}>📋 Conditions Générales</Text>
          <Text style={[styles.cardDesc, { color: p.text }]}>
            En utilisant Nissa Imane Tracker, vous acceptez ces conditions d'utilisation. 
            Veuillez les lire attentivement avant d'utiliser notre application.
          </Text>
        </View>

        {/* Acceptance */}
        <View style={[styles.section, { backgroundColor: p.card }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>✅ Acceptation des Conditions</Text>
          <Text style={[styles.sectionText, { color: p.text }]}>
            En installant et utilisant Nissa Imane Tracker, vous acceptez sans réserve les présentes 
            conditions. Si vous n'acceptez pas ces conditions, n'utilisez pas l'application.
          </Text>
        </View>

        {/* Description */}
        <View style={[styles.section, { backgroundColor: p.card }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>📱 Description du Service</Text>
          <Text style={[styles.sectionText, { color: p.text }]}>
            Nissa Imane Tracker est une application mobile conçue pour aider les musulmans dans leur 
            pratique spirituelle quotidienne à travers :
          </Text>
          <View style={styles.featuresList}>
            <Text style={[styles.featureItem, { color: p.text }]}>• Suivi des horaires de prière</Text>
            <Text style={[styles.featureItem, { color: p.text }]}>• Lecture et mémorisation du Coran</Text>
            <Text style={[styles.featureItem, { color: p.text }]}>• Dhikr et invocations quotidiennes</Text>
            <Text style={[styles.featureItem, { color: p.text }]}>• Suivi du Ramadan et du jeûne</Text>
            <Text style={[styles.featureItem, { color: p.text }]}>• Calcul de la Zakat</Text>
            <Text style={[styles.featureItem, { color: p.text }]}>• Direction de la Qibla</Text>
            <Text style={[styles.featureItem, { color: p.text }]}>• Calendrier Hijri</Text>
          </View>
        </View>

        {/* User Responsibilities */}
        <View style={[styles.section, { backgroundColor: p.card }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>👤 Responsabilités de l'Utilisateur</Text>
          <View style={styles.responsibilitiesList}>
            <View style={styles.responsibilityItem}>
              <Ionicons name="shield-checkmark" size={20} color={p.primary} />
              <Text style={[styles.responsibilityText, { color: p.text }]}>
                <Text style={[styles.responsibilityTitle, { color: p.text }]}>Compte Sécurisé</Text>
                Maintenir la confidentialité de vos identifiants
              </Text>
            </View>
            
            <View style={styles.responsibilityItem}>
              <Ionicons name="checkmark-circle" size={20} color={p.primary} />
              <Text style={[styles.responsibilityText, { color: p.text }]}>
                <Text style={[styles.responsibilityTitle, { color: p.text }]}>Utilisation Légitime</Text>
                Utiliser l'app conformément aux principes islamiques
              </Text>
            </View>
            
            <View style={styles.responsibilityItem}>
              <Ionicons name="information-circle" size={20} color={p.primary} />
              <Text style={[styles.responsibilityText, { color: p.text }]}>
                <Text style={[styles.responsibilityTitle, { color: p.text }]}>Informations Exactes</Text>
                Fournir des informations personnelles véridiques
              </Text>
            </View>
            
            <View style={styles.responsibilityItem}>
              <Ionicons name="sync" size={20} color={p.primary} />
              <Text style={[styles.responsibilityText, { color: p.text }]}>
                <Text style={[styles.responsibilityTitle, { color: p.text }]}>Mises à Jour</Text>
                Maintenir l'application à jour
              </Text>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={[styles.section, { backgroundColor: p.card }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>📞 Contact Juridique</Text>
          <Text style={[styles.sectionText, { color: p.text }]}>
            Pour toute question concernant ces conditions :
          </Text>
          <TouchableOpacity style={[styles.contactBtn, { backgroundColor: p.primary }]} onPress={handleContact}>
            <Ionicons name="mail" size={20} color="#fff" />
            <Text style={styles.contactBtnText}>kabrakeng@gmail.com</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: p.text }]}>Conditions applicables à Nissa Imane Tracker</Text>
          <Text style={[styles.footerSubtext, { color: p.textSoft }]}>Version 2.0.0 - 19 février 2025</Text>
          <Text style={[styles.footerSubtext, { color: p.textSoft }]}>Développé par KABRAK ENG</Text>
          <Text style={[styles.footerSubtext, { color: p.textSoft }]}>© 2025</Text>
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
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 18,
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
    marginBottom: 8,
  },
  featuresList: {
    marginLeft: 16,
    marginTop: 8,
    gap: 4,
  },
  featureItem: {
    fontSize: 14,
    lineHeight: 18,
  },
  responsibilitiesList: {
    gap: 16,
  },
  responsibilityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  responsibilityText: {
    flex: 1,
  },
  responsibilityTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  contactBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footerSubtext: {
    fontSize: 12,
  },
});
