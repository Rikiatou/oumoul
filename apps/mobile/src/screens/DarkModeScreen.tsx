import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/theme-context";

export function DarkModeScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme, palette: p } = useTheme();

  const openSettings = () => {
    Linking.openSettings().catch(() => {});
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: p.border }]}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: p.text }]}>Paramètres du Thème</Text>
          <Text style={[styles.headerSub, { color: p.muted }]}>Personnalisez votre expérience visuelle</Text>
        </View>
        <View style={[styles.headerThemeIcon, { backgroundColor: p.card }]}>
          <Ionicons name={isDark ? "moon" : "sunny"} size={24} color={p.primaryDark} />
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Theme */}
        <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
          <View style={styles.themePreview}>
            <View style={[styles.themeIcon, { backgroundColor: p.bg }]}>
              <Ionicons name={isDark ? "moon" : "sunny"} size={48} color={p.primary} />
            </View>
            <Text style={[styles.themeTitle, { color: p.text }]}>Thème Actuel</Text>
            <Text style={[styles.themeDesc, { color: p.muted }]}>
              {isDark ? "Dark Mode activé" : "Light Mode activé"}
            </Text>
            <Text style={[styles.themeDesc, { color: p.muted }]}>
              Palette émeraude+rose optimisée pour les deux thèmes
            </Text>
          </View>
          
          <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: p.primary }]} onPress={toggleTheme}>
            <Ionicons 
              name={isDark ? "sunny" : "moon"} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.toggleBtnText}>
              {isDark ? "Passer en Light" : "Passer en Dark"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Theme Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>🎨 Caractéristiques du Thème</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="color-palette" size={20} color={p.primary} />
              <View style={styles.featureInfo}>
                <Text style={[styles.featureTitle, { color: p.text }]}>Palette Émeraude+Rose</Text>
                <Text style={[styles.featureDesc, { color: p.muted }]}>Design moderne et élégant</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="eye" size={20} color={p.secondary} />
              <View style={styles.featureInfo}>
                <Text style={[styles.featureTitle, { color: p.text }]}>Contraste Optimisé</Text>
                <Text style={[styles.featureDesc, { color: p.muted }]}>Lisibilité maximale</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="phone-portrait" size={20} color={p.accent} />
              <View style={styles.featureInfo}>
                <Text style={[styles.featureTitle, { color: p.text }]}>Adaptation Système</Text>
                <Text style={[styles.featureDesc, { color: p.muted }]}>Respecte vos préférences</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Theme Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>⚙️ Préférences Système</Text>
          <View style={[styles.preferenceCard, { backgroundColor: p.card, borderColor: p.border }]}>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={[styles.preferenceTitle, { color: p.text }]}>Mode Système</Text>
                <Text style={[styles.preferenceDesc, { color: p.muted }]}>Utilise les préférences système</Text>
              </View>
              <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: p.border }]} onPress={openSettings}>
                <Text style={[styles.settingsBtnText, { color: p.text }]}>Ouvrir Réglages</Text>
                <Ionicons name="settings" size={16} color={p.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={[styles.preferenceTitle, { color: p.text }]}>Mode Auto</Text>
                <Text style={[styles.preferenceDesc, { color: p.muted }]}>Change automatiquement selon l'heure</Text>
              </View>
              <Switch
                value={false}
                onValueChange={() => {}}
                trackColor={{ false: p.border, true: p.primary }}
                thumbColor={p.primary}
              />
            </View>
          </View>
        </View>

        {/* Color Showcase */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>🎨 Palette de Couleurs</Text>
          <View style={styles.colorShowcase}>
            <View style={styles.colorRow}>
              <View style={[styles.colorBox, { backgroundColor: p.primary }]}>
                <Text style={styles.colorLabel}>Primary</Text>
              </View>
              <View style={[styles.colorBox, { backgroundColor: p.primaryDark }]}>
                <Text style={styles.colorLabel}>Primary Dark</Text>
              </View>
              <View style={[styles.colorBox, { backgroundColor: p.accent }]}>
                <Text style={styles.colorLabel}>Accent</Text>
              </View>
            </View>
            <View style={styles.colorRow}>
              <View style={[styles.colorBox, { backgroundColor: p.secondary }]}>
                <Text style={styles.colorLabel}>Secondary</Text>
              </View>
              <View style={[styles.colorBox, { backgroundColor: p.bg }]}>
                <Text style={styles.colorLabel}>Background</Text>
              </View>
              <View style={[styles.colorBox, { backgroundColor: p.card }]}>
                <Text style={styles.colorLabel}>Card</Text>
              </View>
            </View>
            <View style={styles.colorRow}>
              <View style={[styles.colorBox, { backgroundColor: p.text }]}>
                <Text style={[styles.colorLabel, { color: p.bg }]}>Text</Text>
              </View>
              <View style={[styles.colorBox, { backgroundColor: p.muted }]}>
                <Text style={styles.colorLabel}>Muted</Text>
              </View>
              <View style={[styles.colorBox, { backgroundColor: p.border }]}>
                <Text style={styles.colorLabel}>Border</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>✨ Avantages du Dark Mode</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="moon-outline" size={20} color={p.primary} />
              <Text style={[styles.benefitText, { color: p.text }]}>Réduction de la fatigue oculaire</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="battery-full" size={20} color={p.secondary} />
              <Text style={[styles.benefitText, { color: p.text }]}>Économie de batterie</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="eye-off-outline" size={20} color={p.accent} />
              <Text style={[styles.benefitText, { color: p.text }]}>Moins de fatigue visuelle</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="star-outline" size={20} color={p.primaryDark} />
              <Text style={[styles.benefitText, { color: p.text }]}>Meilleure concentration</Text>
            </View>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>💡 Conseils d'Utilisation</Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Text style={[styles.tipNumber, { backgroundColor: p.primary }]}>1</Text>
              <Text style={[styles.tipText, { color: p.text }]}>Utilisez le Dark Mode le soir pour protéger vos yeux</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={[styles.tipNumber, { backgroundColor: p.primary }]}>2</Text>
              <Text style={[styles.tipText, { color: p.text }]}>Le Light Mode est idéal pendant la journée</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={[styles.tipNumber, { backgroundColor: p.primary }]}>3</Text>
              <Text style={[styles.tipText, { color: p.text }]}>Le toggle dans le header permet un accès rapide</Text>
            </View>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 12,
  },
  headerThemeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  themePreview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  themeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  themeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  themeDesc: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  toggleBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  featureList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  featureDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  preferenceCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preferenceInfo: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  preferenceDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settingsBtnText: {
    fontSize: 12,
  },
  colorShowcase: {
    gap: 12,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  colorBox: {
    flex: 1,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    flex: 1,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  tipText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});

