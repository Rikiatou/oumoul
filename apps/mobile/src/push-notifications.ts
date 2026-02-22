import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { httpClient } from "./api";

const CHANNEL_ID = "oumoul-default";
const ADHAN_CHANNEL_ID = "oumoul-adhan-v2";
const ADHAN_SOUND = "adhan.wav";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Oumoul",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    enableVibrate: true,
    bypassDnd: false,
  });
  // Adhan channel (utilise le son par défaut tant qu’un son custom n’est pas packagé)
  await Notifications.setNotificationChannelAsync(ADHAN_CHANNEL_ID, {
    name: "Oumoul Adhan",
    importance: Notifications.AndroidImportance.HIGH,
    // Si l’asset n’est pas packagé, Android retombe généralement sur le son par défaut.
    sound: ADHAN_SOUND,
    enableVibrate: true,
    bypassDnd: false,
  });
}

async function ensureLocalNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") {
    return true;
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  await ensureChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function syncPushTokenWithBackend() {
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) return false;

    await httpClient.request(`${"/auth"}/push-token`, {
      method: "POST",
      body: JSON.stringify({
        pushToken: token,
        platform: Platform.OS,
      }),
    });
    return true;
  } catch {
    // On ne bloque pas l'auth si l'enregistrement push échoue
    return false;
  }
}

type ReminderPayload = {
  title: string;
  body: string;
  hour: number;
  minute: number;
  id?: string;
  channelId?: string;
  sound?: string;
};

type DateReminderPayload = {
  title: string;
  body: string;
  date: Date;
  id?: string;
  channelId?: string;
};

export async function scheduleDateReminder({ title, body, date, id, channelId }: DateReminderPayload) {
  await ensureChannel();
  const ok = await ensureLocalNotificationPermission();
  if (!ok) {
    throw new Error("Permission notifications refusée");
  }

  const trigger: Notifications.NotificationTriggerInput = Platform.OS === "android" 
    ? {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: date.getTime(),
        channelId: channelId ?? CHANNEL_ID,
      }
    : {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        repeats: false,
      };

  return Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title,
      body,
      sound: "default",
    },
    trigger,
  });
}

async function scheduleDailyReminder({ title, body, hour, minute, id, channelId, sound }: ReminderPayload) {
  await ensureChannel();
  const ok = await ensureLocalNotificationPermission();
  if (!ok) {
    throw new Error("Permission notifications refusée");
  }
  const trigger: Notifications.NotificationTriggerInput = Platform.OS === "android"
    ? {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: channelId ?? CHANNEL_ID,
      }
    : {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
      };

  return Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title,
      body,
      sound: sound ?? "default",
    },
    trigger,
  });
}

export async function scheduleAdhanReminder(prayer: string, hour: number, minute: number) {
  return scheduleDailyReminder({
    id: `adhan-${prayer}`,
    title: "Adhan",
    body: `C'est l'heure de ${prayer}`,
    hour,
    minute,
    channelId: ADHAN_CHANNEL_ID,
    sound: ADHAN_SOUND,
  });
}

export async function scheduleSuhoorReminder(hour: number, minute: number) {
  return scheduleDailyReminder({
    id: "suhoor",
    title: "Suhoor",
    body: "Prépare-toi pour le Suhoor",
    hour,
    minute,
  });
}

export async function scheduleIftarReminder(hour: number, minute: number) {
  return scheduleDailyReminder({
    id: "iftar",
    title: "Iftar",
    body: "C'est presque l'heure de rompre le jeûne",
    hour,
    minute,
  });
}

export async function scheduleDhikrMorningReminder() {
  return scheduleDailyReminder({
    id: "dhikr-morning",
    title: "Adhkar du matin ☀️",
    body: "N'oublie pas tes invocations du matin",
    hour: 6,
    minute: 30,
  });
}

export async function scheduleDhikrEveningReminder() {
  return scheduleDailyReminder({
    id: "dhikr-evening",
    title: "Adhkar du soir 🌙",
    body: "N'oublie pas tes invocations du soir",
    hour: 18,
    minute: 0,
  });
}

export async function scheduleJumuahReminder(hour: number = 12, minute: number = 0) {
  await ensureChannel();
  const ok = await ensureLocalNotificationPermission();
  if (!ok) {
    throw new Error("Permission notifications refusée");
  }
  const baseTrigger: Notifications.WeeklyTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: 6, // 1=Sunday … 6=Friday in Expo
    hour,
    minute,
  };
  const trigger: Notifications.NotificationTriggerInput =
    Platform.OS === "android" ? { ...baseTrigger, channelId: CHANNEL_ID } : baseTrigger;

  return Notifications.scheduleNotificationAsync({
    identifier: "jumuah-reminder",
    content: {
      title: "Jumu'ah Moubarak 🕌",
      body: "N'oublie pas la prière du vendredi et d'envoyer des salawat sur le Prophète ﷺ",
      sound: "default",
    },
    trigger,
  });
}

export async function scheduleImaneProgramReminder(hour: number = 20, minute: number = 0) {
  return scheduleDailyReminder({
    id: "imane-program",
    title: "Programme Imâne 📿",
    body: "As-tu complété ton programme spirituel d'aujourd'hui ?",
    hour,
    minute,
  });
}

export async function cancelReminder(id: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Ignore — notification may have already fired or been cancelled
  }
}

export async function scheduleTasbihReminder(hour: number = 9, minute: number = 0) {
  return scheduleDailyReminder({
    id: "tasbih-reminder",
    title: "Tasbih 📿",
    body: "N'oublie pas ton dhikr quotidien",
    hour,
    minute,
  });
}

export async function scheduleNameOfDayReminder(hour: number = 8, minute: number = 0) {
  return scheduleDailyReminder({
    id: "allah-name-daily",
    title: "Nom d'Allah du jour ✨",
    body: "Découvre et mémorise un nouveau nom d'Allah",
    hour,
    minute,
  });
}

export async function scheduleHadithReminder(hour: number = 7, minute: number = 30) {
  return scheduleDailyReminder({
    id: "hadith-daily",
    title: "Hadith du jour 📖",
    body: "Un nouveau hadith t'attend",
    hour,
    minute,
  });
}

export async function schedulePrayerTrackingReminder(hour: number = 21, minute: number = 30) {
  return scheduleDailyReminder({
    id: "prayer-tracking",
    title: "Suivi des prières 🕌",
    body: "As-tu enregistré tes prières d'aujourd'hui ?",
    hour,
    minute,
  });
}

export async function scheduleRamadanFastingReminder(hour: number = 20, minute: number = 0) {
  return scheduleDailyReminder({
    id: "ramadan-fasting",
    title: "Ramadan — Suivi du jeûne 🌙",
    body: "N'oublie pas de noter si tu as jeûné aujourd'hui",
    hour,
    minute,
  });
}

export async function scheduleMakeupDayReminder(date: Date, dayNumber: number) {
  const d = new Date(date);
  d.setHours(8, 0, 0, 0);
  return scheduleDateReminder({
    title: "Rattrapage de jeûne 🗓️",
    body: `Jour de rattrapage n°${dayNumber} prévu aujourd'hui. Bon courage !`,
    date: d,
    id: `makeup-${date.toISOString().slice(0, 10)}`,
  });
}

export async function cancelMakeupReminders(dates: string[]) {
  for (const dateStr of dates) {
    await cancelReminder(`makeup-${dateStr}`);
  }
}

export async function scheduleQuranWordReminders() {
  const { getWordOfDay } = await import('./utils/word-of-day');
  const today = new Date();
  const morning = getWordOfDay(today, 0);
  const midday  = getWordOfDay(today, 1);
  const evening = getWordOfDay(today, 2);

  await scheduleDailyReminder({
    id: 'quran-word-morning',
    title: `📖 ${morning.arabic} — ${morning.french}`,
    body: `${morning.transliteration} · Mot du Coran du matin`,
    hour: 7,
    minute: 0,
  });
  await scheduleDailyReminder({
    id: 'quran-word-midday',
    title: `📖 ${midday.arabic} — ${midday.french}`,
    body: `${midday.transliteration} · Mot du Coran de midi`,
    hour: 13,
    minute: 0,
  });
  await scheduleDailyReminder({
    id: 'quran-word-evening',
    title: `📖 ${evening.arabic} — ${evening.french}`,
    body: `${evening.transliteration} · Mot du Coran du soir`,
    hour: 20,
    minute: 0,
  });
}

export async function cancelQuranWordReminders() {
  await cancelReminder('quran-word-morning');
  await cancelReminder('quran-word-midday');
  await cancelReminder('quran-word-evening');
}

export async function scheduleAllahNameReminders() {
  const { getAllahNameOfDay } = await import('./utils/allah-name-of-day');
  const today = new Date();
  const morning = getAllahNameOfDay(today, 0);
  const evening = getAllahNameOfDay(today, 1);

  await scheduleDailyReminder({
    id: 'allah-name-morning',
    title: `✨ ${morning.name} — ${morning.transliteration}`,
    body: `${morning.meaning} · Nom d'Allah du matin`,
    hour: 8,
    minute: 30,
  });
  await scheduleDailyReminder({
    id: 'allah-name-evening',
    title: `✨ ${evening.name} — ${evening.transliteration}`,
    body: `${evening.meaning} · Rappel du soir pour mémoriser`,
    hour: 19,
    minute: 0,
  });
}

export async function cancelAllahNameReminders() {
  await cancelReminder('allah-name-morning');
  await cancelReminder('allah-name-evening');
}
