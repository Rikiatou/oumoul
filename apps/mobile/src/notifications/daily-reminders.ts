import { scheduleDhikrMorningReminder, scheduleDhikrEveningReminder, scheduleHadithReminder, schedulePrayerTrackingReminder, scheduleQuranWordReminders, scheduleAllahNameReminders, cancelReminder } from "../push-notifications";

export async function setupDailyReminders() {
  // 📖 Hadith du jour (7h30) — repeating daily
  await scheduleHadithReminder(7, 30);

  // 📿 Dhikr du matin (6h30) — repeating daily
  await scheduleDhikrMorningReminder();

  // 📿 Dhikr du soir (18h) — repeating daily
  await scheduleDhikrEveningReminder();

  // 🤲 Suivi des prières (21h30) — repeating daily
  await schedulePrayerTrackingReminder(21, 30);

  // 🔤 Mots du Coran (3x/jour : 7h, 13h, 20h) — repeating daily
  await scheduleQuranWordReminders();

  // ✨ Noms d'Allah (2x/jour : 8h30, 19h) — repeating daily
  await scheduleAllahNameReminders();
}

export async function cancelDailyReminders() {
  const reminders = [
    "hadith-daily",
    "dhikr-morning",
    "dhikr-evening",
    "sleep-dua",
    "daily-quran",
    "prayer-tracking",
    "quran-word-morning",
    "quran-word-midday",
    "quran-word-evening",
    "allah-name-morning",
    "allah-name-evening",
  ];

  for (const reminder of reminders) {
    await cancelReminder(reminder);
  }
}
