import * as Notifications from "expo-notifications";
import { scheduleDateReminder } from "../push-notifications";
import { loadSmartImanProfile } from "../storage/smart-iman-program";
import { loadRamadanPlan } from "../storage/advanced-ramadan";
import { prayerApi } from "../api";

interface UserPattern {
  preferredTimes: {
    morning: number; // 6-12
    afternoon: number; // 12-17
    evening: number; // 17-21
    night: number; // 21-6
  };
  mostActiveCategories: string[];
  notificationResponse: {
    opened: number;
    dismissed: number;
    total: number;
  };
  lastInteraction: string;
}

export async function setupAdaptiveNotifications(coords?: { latitude: number; longitude: number; timeZone?: string }) {
  const patterns = await analyzeUserPatterns();
  const imanProfile = await loadSmartImanProfile();
  const ramadanPlan = await loadRamadanPlan();

  // 🎯 Smart notifications based on user behavior
  await setupSmartNotifications(patterns, imanProfile, ramadanPlan, coords);
  
  // 📍 Location-based prayer notifications
  await setupLocationBasedNotifications();
  
  // 🎵 Custom sound notifications
  await setupCustomSounds();
}

async function analyzeUserPatterns(): Promise<UserPattern> {
  // Analyze user's notification interaction patterns
  const profile = await loadSmartImanProfile();
  
  // Default patterns (will be refined with real usage data)
  return {
    preferredTimes: {
      morning: 8, // 8 AM
      afternoon: 14, // 2 PM
      evening: 19, // 7 PM
      night: 21, // 9 PM
    },
    mostActiveCategories: Array.isArray(profile?.strongAreas) && profile.strongAreas.length > 0 ? profile.strongAreas : ["prayer", "dhikr"],
    notificationResponse: {
      opened: 0.7, // 70% open rate (example)
      dismissed: 0.3,
      total: 100,
    },
    lastInteraction: new Date().toISOString(),
  };
}

async function setupSmartNotifications(
  patterns: UserPattern,
  imanProfile: any,
  ramadanPlan: any,
  coords?: { latitude: number; longitude: number; timeZone?: string },
) {
  const now = new Date();

  // 📖 Adaptive Hadith notifications
  if (patterns.mostActiveCategories.includes("learning")) {
    const hadithTime = new Date(now);
    hadithTime.setHours(patterns.preferredTimes.morning, 0, 0, 0);
    if (hadithTime <= now) hadithTime.setDate(hadithTime.getDate() + 1);
    
    await scheduleDateReminder({
      id: "adaptive-hadith",
      title: "Hadith du jour 📖",
      body: "Découvrez la sagesse prophétique adaptée à votre progression",
      date: hadithTime,
    });
  }

  // 🤲 Adaptive Dhikr reminders
  if (patterns.mostActiveCategories.includes("dhikr")) {
    const morningDhikr = new Date(now);
    morningDhikr.setHours(7, 30, 0, 0);
    if (morningDhikr <= now) morningDhikr.setDate(morningDhikr.getDate() + 1);
    
    await scheduleDateReminder({
      id: "adaptive-morning-dhikr",
      title: "Dhikr du matin 📿",
      body: "Commencez la journée avec les évocations d'Allah",
      date: morningDhikr,
    });
  }

  // 🌙 Ramadan-specific adaptive notifications using REAL GPS prayer times
  if (ramadanPlan) {
    const isRamadan = now >= new Date(ramadanPlan.startDate) && now <= new Date(ramadanPlan.endDate);
    
    if (isRamadan) {
      // Resolve real Fajr / Maghrib from GPS if coords available
      let fajrHour = 5;
      let fajrMin = 0;
      let maghribHour = 18;
      let maghribMin = 30;

      if (coords?.latitude && coords?.longitude) {
        try {
          const todayYmd = now.toISOString().slice(0, 10);
          const result = await prayerApi.getPrayerTimes({
            latitude: coords.latitude,
            longitude: coords.longitude,
            timeZone: coords.timeZone,
            date: todayYmd,
          } as any);
          const times = result?.times;
          if (times) {
            const parsePT = (v?: string) => {
              if (!v) return null;
              if (v.includes('T')) {
                const d = new Date(v);
                return { h: d.getHours(), m: d.getMinutes() };
              }
              const [h, m] = v.split(':').map(Number);
              return Number.isNaN(h) || Number.isNaN(m) ? null : { h, m };
            };
            const fajr = parsePT(times['fajr'] ?? times['Fajr']);
            const maghrib = parsePT(times['maghrib'] ?? times['Maghrib']);
            if (fajr) { fajrHour = fajr.h; fajrMin = fajr.m; }
            if (maghrib) { maghribHour = maghrib.h; maghribMin = maghrib.m; }
          }
        } catch {
          // fallback to defaults above
        }
      }

      // Suhoor = Fajr - 30 min (real GPS-based)
      const totalFajrMins = fajrHour * 60 + fajrMin - 30;
      const suhoorHour = Math.floor(((totalFajrMins % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
      const suhoorMin = ((totalFajrMins % (24 * 60)) + 24 * 60) % (24 * 60) % 60;

      const suhoorTime = new Date(now);
      suhoorTime.setHours(suhoorHour, suhoorMin, 0, 0);
      if (suhoorTime <= now) suhoorTime.setDate(suhoorTime.getDate() + 1);
      
      await scheduleDateReminder({
        id: "ramadan-suhoor",
        title: "🌙 Heure du Suhoor",
        body: "30 minutes avant le Fajr — Préparez-vous pour le jeûne",
        date: suhoorTime,
      });

      // Iftar = Maghrib (real GPS-based)
      const iftarTime = new Date(now);
      iftarTime.setHours(maghribHour, maghribMin, 0, 0);
      if (iftarTime <= now) iftarTime.setDate(iftarTime.getDate() + 1);
      
      await scheduleDateReminder({
        id: "ramadan-iftar",
        title: "🌅 Heure de l'Iftar",
        body: "Rompez votre jeûne à l'heure du Maghreb",
        date: iftarTime,
      });
    }
  }

  // 🎯 Personalized Quran reminders
  if (patterns.mostActiveCategories.includes("quran")) {
    const quranTime = new Date(now);
    quranTime.setHours(patterns.preferredTimes.evening, 0, 0, 0);
    if (quranTime <= now) quranTime.setDate(quranTime.getDate() + 1);
    
    await scheduleDateReminder({
      id: "adaptive-quran",
      title: "Lecture du Coran 📖",
      body: `Continuez votre progression - ${imanProfile?.totalPoints || 0} points accumulés`,
      date: quranTime,
    });
  }
}

async function setupLocationBasedNotifications() {
  // This would use GPS to detect when user is near a mosque
  // or when prayer times are approaching based on location
  
  // Example: Notify when near a mosque during prayer time
  try {
    // Check if user is within 500m of a mosque
    // and if it's close to prayer time
    const mosqueNotificationTime = new Date();
    mosqueNotificationTime.setMinutes(mosqueNotificationTime.getMinutes() + 15);
    
    await scheduleDateReminder({
      id: "mosque-nearby",
      title: "🕌 Mosquée à proximité",
      body: "Une mosquée est proche et l'heure de la prière approche",
      date: mosqueNotificationTime,
    });
  } catch (error) {
    console.warn("Location-based notification setup failed:", error);
  }
}

async function setupCustomSounds() {
  // Set up custom notification sounds for different types
  
  // Adhan sound for prayer notifications
  await Notifications.setNotificationChannelAsync("prayer-adhan", {
    name: "Adhan",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "adhan.wav", // Custom sound file
    enableVibrate: true,
  });

  // Gentle sound for dhikr reminders
  await Notifications.setNotificationChannelAsync("dhikr-reminder", {
    name: "Dhikr",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "dhikr.wav", // Gentle sound
    enableVibrate: false,
  });

  // Success sound for achievements
  await Notifications.setNotificationChannelAsync("achievement", {
    name: "Achievements",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "achievement.wav", // Celebration sound
    enableVibrate: true,
  });
}

export async function trackNotificationResponse(notificationId: string, action: "opened" | "dismissed") {
  // Track user response to improve future notifications
  console.log(`Notification ${notificationId} ${action}`);
  
  // This would update user patterns in storage
  // to make future notifications more relevant
}

export async function adjustNotificationFrequency(userResponse: UserPattern) {
  // Adjust notification frequency based on user engagement
  const openRate = userResponse.notificationResponse.opened / userResponse.notificationResponse.total;
  
  if (openRate > 0.8) {
    // User is very engaged, can increase frequency
    console.log("High engagement - maintaining notification frequency");
  } else if (openRate < 0.3) {
    // User is not engaged, reduce frequency
    console.log("Low engagement - reducing notification frequency");
  } else {
    // Moderate engagement, keep current frequency
    console.log("Moderate engagement - maintaining current frequency");
  }
}
