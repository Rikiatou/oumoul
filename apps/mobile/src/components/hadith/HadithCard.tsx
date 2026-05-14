import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { shareHadith } from "../../utils/share-utils";
import { triggerHaptic } from "../../utils/haptics";
import { palette } from "../../theme";

interface HadithCardProps {
  hadith: {
    id: string;
    arabic: string;
    french: string;
    english: string;
    source: string;
    category: string;
    theme: string;
  };
  locale: "fr" | "en" | "ar";
  showEnglish?: boolean;
  showArabic?: boolean;
}

export function HadithCard({ 
  hadith, 
  locale, 
  showEnglish = false, 
  showArabic = true 
}: HadithCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleShare = async () => {
    try {
      await triggerHaptic("light");
      await shareHadith(hadith);
    } catch (error) {
      console.error("Failed to share hadith:", error);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    triggerHaptic("light");
  };

  const getDisplayText = () => {
    const texts = [];
    
    if (showArabic) {
      texts.push(
        <Text key="arabic" style={s.arabicText}>
          {hadith.arabic}
        </Text>
      );
    }
    
    if (locale === "fr") {
      texts.push(
        <Text key="french" style={s.translationText}>
          {hadith.french}
        </Text>
      );
    } else if (locale === "en") {
      texts.push(
        <Text key="english" style={s.translationText}>
          {hadith.english}
        </Text>
      );
    }
    
    if (showEnglish && locale === "fr") {
      texts.push(
        <Text key="english-extra" style={[s.translationText, s.englishText]}>
          {hadith.english}
        </Text>
      );
    }
    
    if (showArabic && locale === "en") {
      texts.push(
        <Text key="french-extra" style={[s.translationText, s.frenchText]}>
          {hadith.french}
        </Text>
      );
    }
    
    return texts;
  };

  return (
    <View style={s.container}>
      {/* Header with source and actions */}
      <View style={s.header}>
        <View style={s.sourceContainer}>
          <Ionicons name="book" size={16} color={palette.primary} />
          <Text style={s.sourceText}>{hadith.source}</Text>
        </View>
        
        <View style={s.actions}>
          <TouchableOpacity 
            style={s.actionButton} 
            onPress={toggleExpanded}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={palette.textSoft} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={s.actionButton} 
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="share-outline" size={20} color={palette.textSoft} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hadith content */}
      <View style={s.content}>
        {getDisplayText()}
      </View>

      {/* Expanded content */}
      {isExpanded && (
        <View style={s.expandedContent}>
          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Ionicons name="pricetag" size={14} color={palette.secondary} />
              <Text style={s.metaText}>{hadith.category}</Text>
            </View>
            <View style={s.metaItem}>
              <Ionicons name="flag" size={14} color={palette.accent} />
              <Text style={s.metaText}>{hadith.theme}</Text>
            </View>
          </View>
          
          <View style={s.shareSection}>
            <Text style={s.shareTitle}>Partager ce hadith :</Text>
            <View style={s.shareButtons}>
              <TouchableOpacity 
                style={[s.shareButton, s.whatsappButton]} 
                onPress={handleShare}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                <Text style={s.shareButtonText}>WhatsApp</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[s.shareButton, s.generalButton]} 
                onPress={handleShare}
              >
                <Ionicons name="share-social" size={18} color={palette.primary} />
                <Text style={[s.shareButtonText, { color: palette.primary }]}>Autres</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.idText}>Hadith #{hadith.id}</Text>
        <TouchableOpacity style={s.favoriteButton}>
          <Ionicons name="heart-outline" size={20} color={palette.textSoft} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sourceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sourceText: {
    fontSize: 12,
    color: palette.primary,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  content: {
    marginBottom: 12,
  },
  arabicText: {
    fontSize: 18,
    color: palette.arabic,
    textAlign: "right",
    marginBottom: 12,
    lineHeight: 28,
    fontFamily: "Arabic",
  },
  translationText: {
    fontSize: 15,
    color: palette.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  englishText: {
    fontStyle: "italic",
    opacity: 0.8,
  },
  frenchText: {
    fontStyle: "italic",
    opacity: 0.8,
  },
  expandedContent: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: palette.textSoft,
  },
  shareSection: {
    gap: 8,
  },
  shareTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.text,
    marginBottom: 8,
  },
  shareButtons: {
    flexDirection: "row",
    gap: 12,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  whatsappButton: {
    backgroundColor: "#25D366",
  },
  generalButton: {
    backgroundColor: palette.accentLight,
  },
  shareButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  idText: {
    fontSize: 10,
    color: palette.textSoft,
  },
  favoriteButton: {
    padding: 4,
  },
});
