import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/theme-context";

export function PrivacyScreen({ onBack }: { onBack: () => void }) {
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
          <Text style={[styles.headerTitle, { color: p.text }]}>Politique de Confidentialité</Text>
          <Text style={[styles.headerSub, { color: p.textSoft }]}>KABRAK ENG</Text>
        </View>
        <Ionicons name="lock-closed" size={24} color={p.primaryDark} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Introduction */}
        <View style={[styles.card, { backgroundColor: p.card }]}>
          <Text style={[styles.cardTitle, { color: p.text }]}>🔒 Votre Confidentialité</Text>
          <Text style={[styles.cardDesc, { color: p.text }]}>
            Chez KABRAK ENG, nous respectons votre vie privée et protégeons vos données personnelles. 
            Cette politique explique comment nous collectons, utilisons et protégeons vos informations.
          </Text>
        </View>

        {/* Data Collection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>📊 Données Collectées</Text>
          <View style={styles.dataList}>
            <View style={styles.dataItem}>
              <Ionicons name="person" size={20} color={p.primary} />
              <View style={styles.dataContent}>
                <Text style={[styles.dataTitle, { color: p.text }]}>Informations Personnelles</Text>
                <Text style={[styles.dataDesc, { color: p.textSoft }]}>Email, nom, prénom (création de compte)</Text>
              </View>
            </View>
            
            <View style={styles.dataItem}>
              <Ionicons name="location" size={20} color={p.primary} />
              <View style={styles.dataContent}>
                <Text style={[styles.dataTitle, { color: p.text }]}>Localisation</Text>
                <Text style={[styles.dataDesc, { color: p.textSoft }]}>Position GPS (horaires prière, Qibla, mosquées)</Text>
              </View>
            </View>
            
            <View style={styles.dataItem}>
              <Ionicons name="time" size={20} color={p.primary} />
              <View style={styles.dataContent}>
                <Text style={[styles.dataTitle, { color: p.text }]}>Données d'Usage</Text>
                <Text style={[styles.dataDesc, { color: p.textSoft }]}>Prières enregistrées, progression, préférences</Text>
              </View>
            </View>
            
            <View style={styles.dataItem}>
              <Ionicons name="analytics" size={20} color={p.primary} />
              <View style={styles.dataContent}>
                <Text style={[styles.dataTitle, { color: p.text }]}>Analytics</Text>
                <Text style={[styles.dataDesc, { color: p.textSoft }]}>Usage anonymisé pour améliorer l'app</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Data Usage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Utilisation des Données</Text>
          <View style={styles.usageList}>
            <View style={styles.usageItem}>
              <Text style={styles.usageIcon}>🕌</Text>
              <Text style={styles.usageText}>
                <Text style={styles.usageTitle}>Fonctionnalités Spirituelles</Text>
                Calcul horaires prière, direction Qibla, suivi Ramadan
              </Text>
            </View>
            
            <View style={styles.usageItem}>
              <Text style={styles.usageIcon}>📱</Text>
              <Text style={styles.usageText}>
                <Text style={styles.usageTitle}>Expérience Utilisateur</Text>
                Personnalisation, sauvegarde préférences, progression
              </Text>
            </View>
            
            <View style={styles.usageItem}>
              <Text style={styles.usageIcon}>🔔</Text>
              <Text style={styles.usageText}>
                <Text style={styles.usageTitle}>Notifications</Text>
                Rappels prière, Ramadan, invitations spirituelles
              </Text>
            </View>
            
            <View style={styles.usageItem}>
              <Text style={styles.usageIcon}>📊</Text>
              <Text style={styles.usageText}>
                <Text style={styles.usageTitle}>Amélioration</Text>
                Analytics anonymisés pour optimiser les fonctionnalités
              </Text>
            </View>
          </View>
        </View>

        {/* Data Protection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛡️ Protection des Données</Text>
          <Text style={styles.sectionText}>
            • <Text style={styles.bold}>Chiffrement</Text> : Toutes vos données sont chiffrées en transit et au repos
          </Text>
          <Text style={styles.sectionText}>
            • <Text style={styles.bold}>Stockage Sécurisé</Text> : Utilisation de SecureStore pour données sensibles
          </Text>
          <Text style={styles.sectionText}>
            • <Text style={styles.bold}>Accès Limité</Text> : Seul le personnel autorisé peut accéder aux données
          </Text>
          <Text style={styles.sectionText}>
            • <Text style={styles.bold}>Anonymisation</Text> : Analytics complètement anonymisés
          </Text>
        </View>

        {/* Data Sharing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚫 Partage des Données</Text>
          <Text style={styles.sectionText}>
            <Text style={styles.bold}>Nous ne vendons jamais</Text> vos données personnelles à des tiers.
          </Text>
          <Text style={styles.sectionText}>
            Les données ne sont partagées que dans les cas suivants :
          </Text>
          <View style={styles.sharingList}>
            <Text style={styles.sharingItem}>• Avec votre consentement explicite</Text>
            <Text style={styles.sharingItem}>• Pour respecter la loi (tribunal, autorités)</Text>
            <Text style={styles.sharingItem}>• Pour protéger nos droits et sécurité</Text>
            <Text style={styles.sharingItem}>• Avec prestataires techniques (hébergement, analytics)</Text>
          </View>
        </View>

        {/* User Rights */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>👤 Vos Droits</Text>
          <View style={styles.rightsList}>
            <View style={styles.rightItem}>
              <Ionicons name="eye" size={20} color={p.primary} />
              <Text style={[styles.rightText, { color: p.text }]}>
                <Text style={[styles.rightTitle, { color: p.text }]}>Accès</Text>
                Consulter toutes vos données personnelles
              </Text>
            </View>
            
            <View style={styles.rightItem}>
              <Ionicons name="create" size={20} color={p.primary} />
              <Text style={[styles.rightText, { color: p.text }]}>
                <Text style={[styles.rightTitle, { color: p.text }]}>Modification</Text>
                Mettre à jour vos informations personnelles
              </Text>
            </View>
            
            <View style={styles.rightItem}>
              <Ionicons name="trash" size={20} color={p.primary} />
              <Text style={[styles.rightText, { color: p.text }]}>
                <Text style={[styles.rightTitle, { color: p.text }]}>Suppression</Text>
                Demander la suppression de vos données
              </Text>
            </View>
            
            <View style={styles.rightItem}>
              <Ionicons name="download" size={20} color={p.primary} />
              <Text style={[styles.rightText, { color: p.text }]}>
                <Text style={[styles.rightTitle, { color: p.text }]}>Export</Text>
                Télécharger toutes vos données personnelles
              </Text>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Contact Confidentialité</Text>
          <Text style={styles.sectionText}>
            Pour toute question concernant cette politique ou l'exercice de vos droits :
          </Text>
          <TouchableOpacity style={[styles.contactBtn, { backgroundColor: p.primary }]} onPress={handleContact}>
            <Ionicons name="mail" size={20} color="#fff" />
            <Text style={styles.contactBtnText}>kabrakeng@gmail.com</Text>
          </TouchableOpacity>
        </View>

        {/* Policy Updates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Mises à Jour</Text>
          <Text style={styles.sectionText}>
            Cette politique peut être mise à jour pour refléter nos pratiques. 
            Les modifications seront notifiées dans l'application et publiées sur notre site.
          </Text>
          <Text style={styles.sectionText}>
            Dernière mise à jour : 19 février 2025
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: p.text }]}>Cette politique s'applique à Nissa Imane Tracker</Text>
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
  bold: {
    fontWeight: "600",
  },
  dataList: {
    gap: 16,
  },
  dataItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  dataContent: {
    flex: 1,
  },
  dataTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  dataDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  usageList: {
    gap: 16,
  },
  usageItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  usageIcon: {
    fontSize: 20,
    width: 24,
    textAlign: "center",
  },
  usageText: {
    flex: 1,
  },
  usageTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  sharingList: {
    marginLeft: 16,
    marginTop: 8,
    gap: 4,
  },
  sharingItem: {
    fontSize: 14,
    lineHeight: 18,
  },
  rightsList: {
    gap: 16,
  },
  rightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  rightText: {
    flex: 1,
  },
  rightTitle: {
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
