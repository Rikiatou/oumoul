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
  } catch (error) {
    // On ne bloque pas l'auth si l'enregistrement push échoue
    console.warn("Failed to sync push token", error);
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

  const baseTrigger: Notifications.CalendarTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    repeats: false,
  };

  const trigger: Notifications.NotificationTriggerInput =
    Platform.OS === "android" ? { ...baseTrigger, channelId: channelId ?? CHANNEL_ID } : baseTrigger;

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
  const baseTrigger: Notifications.CalendarTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    hour,
    minute,
    repeats: true,
  };
  const trigger: Notifications.NotificationTriggerInput =
    Platform.OS === "android" ? { ...baseTrigger, channelId: channelId ?? CHANNEL_ID } : baseTrigger;

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

export async function cancelReminder(id: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (err) {
    console.warn("cancelReminder failed", id, err);
  }
}
