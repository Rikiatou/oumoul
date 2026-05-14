import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Alert, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/theme-context";
import * as SecureStore from "expo-secure-store";

interface ShareTemplate {
  id: string;
  title: string;
  content: string;
  category: "hadith" | "quran" | "dhikr" | "progress" | "achievement";
  icon: string;
  uses: number;
}

interface ShareStats {
  totalShares?: number;
  hadithShares?: number;
  quranShares?: number;
  dhikrShares?: number;
  progressShares?: number;
  achievementShares?: number;
  lastShare?: string;
}

const SHARE_KEY = "oumoul_share_system";

export function ShareSystemScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { palette: p } = useTheme();
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const stored = await SecureStore.getItemAsync(SHARE_KEY);
      if (stored) {
        setStats(JSON.parse(stored));
      } else {
        const initialStats = await initializeStats();
        setStats(initialStats);
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeStats = async (): Promise<ShareStats> => {
    const initialStats: ShareStats = {
      totalShares: 0,
      hadithShares: 0,
      quranShares: 0,
      dhikrShares: 0,
      progressShares: 0,
      achievementShares: 0,
      lastShare: new Date().toISOString(),
    };

    await SecureStore.setItemAsync(SHARE_KEY, JSON.stringify(initialStats));
    return initialStats;
  };

  const shareContent = async (template: ShareTemplate) => {
    setSharing(true);
    
    try {
      const shareOptions = {
        message: template.content,
        title: "Nissa Imane Tracker",
        url: "https://oumoul.app", // App store link
      };

      await Share.share(shareOptions, {
        dialogTitle: "Partager via",
      });

      // Update stats
      const updatedStats = { ...stats };
      updatedStats.totalShares = (updatedStats.totalShares || 0) + 1;
      (updatedStats as any)[`${template.category}Shares`] = ((updatedStats as any)[`${template.category}Shares`] || 0) + 1;
      updatedStats.lastShare = new Date().toISOString();
      
      // Update template uses
      template.uses += 1;

      setStats(updatedStats);
      await SecureStore.setItemAsync(SHARE_KEY, JSON.stringify(updatedStats));
      
      Alert.alert("Succès", "Contenu partagé avec succès !");
    } finally {
      setSharing(false);
    }
  };

  const shareWhatsApp = async (template: ShareTemplate) => {
    setSharing(true);
    
    try {
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(template.content)}`;
      
      // Check if WhatsApp is available
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        
        // Update stats
        const updatedStats = { ...stats };
        updatedStats.totalShares = (updatedStats.totalShares || 0) + 1;
        (updatedStats as any)[`${template.category}Shares`] = ((updatedStats as any)[`${template.category}Shares`] || 0) + 1;
        updatedStats.lastShare = new Date().toISOString();
        
        setStats(updatedStats);
        await SecureStore.setItemAsync(SHARE_KEY, JSON.stringify(updatedStats));
      } else {
        Alert.alert("WhatsApp", "WhatsApp n'est pas installé sur cet appareil");
      }
    } finally {
      setSharing(false);
    }
  };

  const shareTemplates: ShareTemplate[] = [
    {
      id: "hadith-daily",
      title: "Hadith du Jour",
      content: "📖 Hadith du jour:\n\n« Le Prophète Muhammad ﷺ a dit: 'Les actions ne sont jugées que selon les intentions.' »\n\n🕌 via Nissa Imane Tracker",
      category: "hadith" as const,
      icon: "book",
      uses: 0,
    },
    {
      id: "quran-verse",
      title: "Verset du Coran",
      content: "📖 Verset du Coran:\n\n« Et Nous avons certes rendu le Coran facile à rappeler. Y a-t-il quelqu'un pour réfléchir? » (Sourate Al-Qamar: 17)\n\n🕌 via Nissa Imane Tracker",
      category: "quran" as const,
      icon: "library",
      uses: 0,
    },
    {
      id: "dhikr-morning",
      title: "Dhikr du Matin",
      content: "🤲 Dhikr du Matin:\n\nSubhanAllah (33x)\nAlhamdulillah (33x)\nAllahu Akbar (33x)\n\n🕌 via Nissa Imane Tracker",
      category: "dhikr" as const,
      icon: "radio",
      uses: 0,
    },
    {
      id: "progress-prayer",
      title: "Progression Prières",
      content: "🕌 Progression Spirituelle:\n\n✅ Prières complètes aujourd'hui: 5/5\n🔥 Streak: 7 jours\n📊 Niveau: 3\n\n🕌 via Nissa Imane Tracker",
      category: "progress" as const,
      icon: "trending-up",
      uses: 0,
    },
    {
      id: "achievement-unlocked",
      title: "Achievement Débloqué",
      content: "🏆 Achievement Débloqué!\n\n📖 Lecteur du Coran\n✅ 10 versets lus\n🎯 25 points gagnés\n\n🕌 via Nissa Imane Tracker",
      category: "achievement" as const,
      icon: "trophy",
      uses: 0,
    },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: p.bg }]}>
        <ActivityIndicator size="large" color={p.primary} />
        <Text style={[styles.loadingText, { marginTop: 8, color: p.text }]}>Chargement...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', backgroundColor: p.bg }]}>
        <Text style={[styles.errorText, { color: p.text }]}>Erreur de chargement</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: p.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: p.border }]}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: p.text }]}>Partage Social & WhatsApp</Text>
          <Text style={[styles.headerSub, { color: p.muted }]}>{stats.totalShares} partages effectués</Text>
        </View>
        <View style={styles.shareBadge}>
          <Ionicons name="share-social" size={20} color="#fff" />
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Card */}
        <View style={[styles.statsCard, { backgroundColor: p.card, borderColor: p.border }]}>
          <View style={styles.statsHeader}>
            <Text style={[styles.statsTitle, { color: p.text }]}>📊 Statistiques de Partage</Text>
            <TouchableOpacity style={[styles.resetBtn, { backgroundColor: p.border }]}>
              <Ionicons name="refresh" size={16} color={p.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: p.text }]}>{stats.totalShares}</Text>
              <Text style={[styles.statLabel, { color: p.muted }]}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: p.text }]}>{stats.hadithShares}</Text>
              <Text style={[styles.statLabel, { color: p.muted }]}>Hadiths</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: p.text }]}>{stats.quranShares}</Text>
              <Text style={[styles.statLabel, { color: p.muted }]}>Coran</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: p.text }]}>{stats.dhikrShares}</Text>
              <Text style={[styles.statLabel, { color: p.muted }]}>Dhikr</Text>
            </View>
          </View>
        </View>

        {/* WhatsApp Integration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>📱 Intégration WhatsApp</Text>
          <View style={[styles.whatsappCard, { backgroundColor: p.card, borderColor: p.border }]}>
            <View style={styles.whatsappHeader}>
              <Ionicons name="logo-whatsapp" size={32} color="#25D366" />
              <View style={styles.whatsappInfo}>
                <Text style={[styles.whatsappTitle, { color: p.text }]}>Partage Natif WhatsApp</Text>
                <Text style={[styles.whatsappDesc, { color: p.muted }]}>Partagez directement vers WhatsApp avec un seul clic</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.whatsappBtn}>
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              <Text style={styles.whatsappBtnText}>Ouvrir WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Share Templates */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>📤 Templates de Partage</Text>
          {shareTemplates.map((template) => (
            <View key={template.id} style={[styles.templateCard, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={styles.templateHeader}>
                <View style={styles.templateInfo}>
                  <View style={[styles.templateIcon, { backgroundColor: p.bg }]}>
                    <Ionicons name={template.icon as any} size={20} color={p.primary} />
                  </View>
                  <View style={styles.templateDetails}>
                    <Text style={[styles.templateTitle, { color: p.text }]}>{template.title}</Text>
                    <Text style={[styles.templateCategory, { color: p.primary }]}>
                      {template.category === "hadith" ? "Hadith" :
                       template.category === "quran" ? "Coran" :
                       template.category === "dhikr" ? "Dhikr" :
                       template.category === "progress" ? "Progression" : "Achievement"}
                    </Text>
                  </View>
                </View>
                <View style={styles.templateMeta}>
                  <Text style={[styles.templateUses, { color: p.muted, backgroundColor: p.border }]}>{template.uses} utilisations</Text>
                </View>
              </View>
              
              <View style={[styles.templateContent, { backgroundColor: p.bg }]}>
                <Text style={[styles.templateText, { color: p.text }]}>{template.content}</Text>
              </View>
              
              <View style={styles.templateActions}>
                <TouchableOpacity 
                  style={[styles.shareBtn, { backgroundColor: p.primary }]}
                  onPress={() => shareContent(template)}
                  disabled={sharing}
                >
                  {sharing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="share" size={16} color="#fff" />
                      <Text style={styles.shareBtnText}>Partager</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.whatsappShareBtn}
                  onPress={() => shareWhatsApp(template)}
                  disabled={sharing}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>🌟 Fonctionnalités Sociales</Text>
          <View style={[styles.featuresList, { backgroundColor: p.card, borderColor: p.border }]}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={p.primary} />
              <Text style={[styles.featureText, { color: p.text }]}>Partage natif vers WhatsApp</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={p.primary} />
              <Text style={[styles.featureText, { color: p.text }]}>Templates prédéfinis</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={p.primary} />
              <Text style={[styles.featureText, { color: p.text }]}>Statistiques de partage</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={p.primary} />
              <Text style={[styles.featureText, { color: p.text }]}>Personnalisation du contenu</Text>
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
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
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
  shareBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  statsCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  resetBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
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
  whatsappCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  whatsappHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  whatsappInfo: {
    flex: 1,
    marginLeft: 16,
  },
  whatsappTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  whatsappDesc: {
    fontSize: 14,
    marginTop: 4,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  whatsappBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  templateCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  templateInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateDetails: {
    flex: 1,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  templateCategory: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  templateMeta: {
    alignItems: 'center',
  },
  templateUses: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  templateContent: {
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  templateText: {
    fontSize: 12,
    lineHeight: 18,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  whatsappShareBtn: {
    width: 40,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresList: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 12,
  },
});
