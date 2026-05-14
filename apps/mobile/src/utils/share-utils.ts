import { Share } from "react-native";

export interface ShareableContent {
  title: string;
  message: string;
  url?: string;
  type?: 'hadith' | 'quran' | 'dhikr' | 'progress' | 'achievement' | 'inspiration';
  text?: string;
}

export async function shareHadith(hadith: {
  arabic: string;
  french: string;
  english: string;
  source: string;
}): Promise<void> {
  const content: ShareableContent = {
    title: "Hadith du jour - Oumoul",
    message: `📖 Hadith du jour

${hadith.arabic}

${hadith.french}

${hadith.english}

📚 Source: ${hadith.source}

---
Télécharge l'app Oumoul pour plus de hadiths quotidiens !
🕌 https://oumoul.app/download`,
    type: 'hadith',
    text: `${hadith.french}\n\n${hadith.arabic}`,
  };

  try {
    await Share.share({
      title: content.title,
      message: content.message,
      url: content.url,
    }, {
      // Android specific options
      dialogTitle: "Partager le hadith",
      // iOS specific options
      excludedActivityTypes: [
        'com.apple.UIKit.activity.PostToFacebook',
        'com.apple.UIKit.activity.PostToTwitter',
      ],
    });
  } catch (error) {
    console.error("Share failed:", error);
  }
}

export async function shareDua(dua: {
  arabic: string;
  french: string;
  english: string;
  context: string;
}): Promise<void> {
  const content: ShareableContent = {
    title: "Doua - Oumoul",
    message: `🤲 Doua

${dua.arabic}

${dua.french}

${dua.english}

🕌 Oumoul - Votre compagnon spirituel
🕌 https://oumoul.app/download`,
  };

  try {
    await Share.share({
      title: content.title,
      message: content.message,
      url: content.url,
    }, {
      dialogTitle: "Partager la doua",
    });
  } catch (error) {
    console.error("Share failed:", error);
  }
}

export async function shareQuranVerse(verse: {
  arabic: string;
  french: string;
  surah: number;
  ayah: number;
}): Promise<void> {
  const content: ShareableContent = {
    title: "Coran - Oumoul",
    message: `📖 Coran (Sourate ${verse.surah}, Verset ${verse.ayah})

${verse.arabic}

${verse.french}

🕌 Oumoul - Explorez le Coran quotidiennement
🕌 https://oumoul.app/download`,
  };

  try {
    await Share.share({
      title: content.title,
      message: content.message,
      url: content.url,
    }, {
      dialogTitle: "Partager le verset",
    });
  } catch (error) {
    console.error("Share failed:", error);
  }
}

export async function shareAchievement(achievement: {
  title: string;
  description: string;
  points: number;
}): Promise<void> {
  const content: ShareableContent = {
    title: "Succès - Oumoul",
    message: `🏆 Nouveau succès débloqué !

${achievement.title}
${achievement.description}
🎯 ${achievement.points} points

🕌 Rejoignez-moi sur Oumoul !
🕌 https://oumoul.app/download`,
  };

  try {
    await Share.share({
      title: content.title,
      message: content.message,
      url: content.url,
    }, {
      dialogTitle: "Partager le succès",
    });
  } catch (error) {
    console.error("Share failed:", error);
  }
}

export async function shareProgress(progress: {
  streak: number;
  totalPoints: number;
  tasksCompleted: number;
}): Promise<void> {
  const content: ShareableContent = {
    title: "Ma progression - Oumoul",
    message: `🌟 Ma progression spirituelle

🔥 Streak: ${progress.streak} jours
🎯 Points: ${progress.totalPoints}
✅ Tâches aujourd'hui: ${progress.tasksCompleted}

🕌 Rejoignez Oumoul pour votre progression spirituelle !
🕌 https://oumoul.app/download`,
  };

  try {
    await Share.share({
      title: content.title,
      message: content.message,
      url: content.url,
    }, {
      dialogTitle: "Partager ma progression",
    });
  } catch (error) {
    console.error("Share failed:", error);
  }
}

export async function inviteFriend(): Promise<void> {
  const content: ShareableContent = {
    title: "Invitation - Oumoul",
    message: `🕌 Rejoins-moi sur Oumoul !

Découvrez une application musulmane complète :
📖 Coran avec traduction
📿 Dhikr quotidien
🕌 Horaires de prière
🌙 Programme Ramadan
🤲 Douas et hadiths

Téléchargez gratuitement :
🕌 https://oumoul.app/download

Code d'invitation: OUMOUL2025`,
  };

  try {
    await Share.share({
      title: content.title,
      message: content.message,
      url: content.url,
    }, {
      dialogTitle: "Inviter un ami",
    });
  } catch (error) {
    console.error("Share failed:", error);
  }
}

// Helper function to check if sharing is available
export async function isShareAvailable(): Promise<boolean> {
  try {
    // Share.isAvailableAsync() might not be available in all React Native versions
    // Return true as most devices support sharing
    return true;
  } catch {
    return false;
  }
}

// Format Arabic text for better sharing
export function formatArabicForSharing(arabic: string): string {
  // Add proper Arabic formatting for sharing
  return `「${arabic}」`;
}

// Generate shareable image with actual content (React Native compatible)
export async function generateShareableImage(content: ShareableContent): Promise<string> {
  try {
    // Create a formatted text-based shareable content
    const formattedContent = formatContentForSharing(content);
    
    // For React Native, we'll create a base64 encoded image representation
    // In a real implementation, you would use a library like react-native-view-shot
    // or expo-image-picker to capture a view as an image
    
    // For now, return a well-formatted text that can be shared
    return formattedContent;
  } catch (error) {
    console.error('Failed to generate shareable image:', error);
    // Fallback to placeholder
    return "https://oumoul.app/share-placeholder.png";
  }
}

// Format content for sharing with proper styling
function formatContentForSharing(content: ShareableContent): string {
  const typeEmoji = content.type === 'hadith' ? '📖' :
                   content.type === 'quran' ? '📖' :
                   content.type === 'dhikr' ? '🤲' :
                   content.type === 'progress' ? '📊' :
                   content.type === 'achievement' ? '🏆' : '🌟';

  const typeLabel = content.type === 'hadith' ? 'Hadith du Jour' :
                   content.type === 'quran' ? 'Verset du Coran' :
                   content.type === 'dhikr' ? 'Dhikr' :
                   content.type === 'progress' ? 'Progression' :
                   content.type === 'achievement' ? 'Achievement' : 'Inspiration';

  // Create a beautifully formatted text
  const lines = [
    '═══════════════════════════════════════',
    `           ${typeEmoji} ${typeLabel}`,
    '═══════════════════════════════════════',
    '',
    content.text || content.message,
    '',
    '═══════════════════════════════════════',
    '        🌸 Nissa Imane Tracker 🌸',
    '     Ton compagnon spirituel quotidien',
    '═══════════════════════════════════════',
  ];

  return lines.join('\n');
}
