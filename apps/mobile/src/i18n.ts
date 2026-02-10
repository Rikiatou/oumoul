export type Locale = "fr" | "en" | "ar";

const messages: Record<string, Partial<Record<Locale, string>>> = {
  "notif.local.title": { fr: "Notifications locales", en: "Local notifications", ar: "إشعارات محلية" },
  "notif.local.subtitle": {
    fr: "Adhan, Suhoor, Iftar (sur cet appareil)",
    en: "Adhan, Suhoor, Iftar (on this device)",
    ar: "الأذان، السحور، الإفطار (على هذا الجهاز)",
  },
  "notif.local.help": {
    fr: "Active les rappels locaux. Pour l’Adhan, calcule d’abord les horaires du jour.",
    en: "Enable local reminders. For Adhan, calculate today’s times first.",
    ar: "فعّل التذكيرات المحلية. للأذان، احسب أوقات اليوم أولاً.",
  },
  "notif.local.error.load": {
    fr: "Impossible de charger les rappels locaux.",
    en: "Unable to load local reminders.",
    ar: "تعذّر تحميل التذكيرات المحلية.",
  },
  "notif.local.error.save": {
    fr: "Impossible d’enregistrer les rappels locaux.",
    en: "Unable to save local reminders.",
    ar: "تعذّر حفظ التذكيرات المحلية.",
  },
  "notif.local.error.enable": {
    fr: "Impossible d’activer le rappel.",
    en: "Unable to enable reminder.",
    ar: "تعذّر تفعيل التذكير.",
  },
  "notif.local.error.prayerMissing": {
    fr: "Calcule d’abord les horaires pour activer l’Adhan.",
    en: "Calculate prayer times first to enable Adhan.",
    ar: "احسب أوقات الصلاة أولاً لتفعيل الأذان.",
  },
  "notif.local.toast.enabled": {
    fr: "Rappel activé",
    en: "Reminder enabled",
    ar: "تم تفعيل التذكير",
  },
  "notif.local.toast.disabled": {
    fr: "Rappel désactivé",
    en: "Reminder disabled",
    ar: "تم إيقاف التذكير",
  },
  "notif.local.toast.permission": {
    fr: "Active les notifications dans les réglages.",
    en: "Enable notifications in settings.",
    ar: "فعّل الإشعارات من الإعدادات.",
  },
  "notif.local.label.AdhanFajr": { fr: "Adhan Fajr", en: "Adhan Fajr", ar: "أذان الفجر" },
  "notif.local.label.AdhanDhuhr": { fr: "Adhan Dhuhr", en: "Adhan Dhuhr", ar: "أذان الظهر" },
  "notif.local.label.AdhanAsr": { fr: "Adhan Asr", en: "Adhan Asr", ar: "أذان العصر" },
  "notif.local.label.AdhanMaghrib": { fr: "Adhan Maghrib", en: "Adhan Maghrib", ar: "أذان المغرب" },
  "notif.local.label.AdhanIsha": { fr: "Adhan Isha", en: "Adhan Isha", ar: "أذان العشاء" },
  "notif.local.label.SuhoorLocal": {
    fr: "Suhoor (30 min avant Fajr)",
    en: "Suhoor (30 min before Fajr)",
    ar: "السحور (30 دقيقة قبل الفجر)",
  },
  "notif.local.label.IftarLocal": { fr: "Iftar (Maghrib)", en: "Iftar (Maghrib)", ar: "الإفطار (المغرب)" },
  "qibla.title": { fr: "Qibla", en: "Qibla", ar: "القبلة" },
  "qibla.subtitle": {
    fr: "Trouve ta direction et vérifie l’azimut.",
    en: "Find your direction and check the azimuth.",
    ar: "اعرف اتجاهك وتحقق من زاوية القبلة.",
  },
  "qibla.position": { fr: "Position", en: "Location", ar: "الموقع" },
  "qibla.fallback": { fr: "Douala (fallback)", en: "Douala (fallback)", ar: "دوالا (افتراضي)" },
  "qibla.loc.detected": { fr: "Localisation détectée", en: "Location detected", ar: "تم اكتشاف الموقع" },
  "qibla.button.refresh": { fr: "Actualiser", en: "Refresh", ar: "تحديث" },
  "qibla.button.calculating": { fr: "Calcul…", en: "Calculating…", ar: "جارٍ الحساب..." },
  "qibla.prompt": {
    fr: "Saisis ou autorise ta position pour calculer la Qibla.",
    en: "Enter or allow your location to compute Qibla.",
    ar: "أدخل موقعك أو اسمح به لحساب القبلة.",
  },
  "common.back": { fr: "Retour", en: "Back", ar: "رجوع" },
  "common.back.dashboard": {
    fr: "Retour au tableau de bord",
    en: "Back to dashboard",
    ar: "العودة إلى لوحة التحكم",
  },
  "dash.header.title": {
    fr: "Tableau de bord quotidien",
    en: "Daily dashboard",
    ar: "لوحة المتابعة اليومية",
  },
  "dash.header.subtitle": {
    fr: "Consulte les horaires, vérifie tes journaux de jeûne, enregistre ton dhikr et ajuste tes rappels.",
    en: "Check times, review fasting logs, track dhikr, and adjust reminders.",
    ar: "اطّلع على الأوقات، راجع سجلات الصيام، سجّل الأذكار، وعدّل التذكيرات.",
  },
  "dash.logout": { fr: "Se déconnecter", en: "Log out", ar: "تسجيل الخروج" },
  "dash.prayer.status.title": { fr: "Prière", en: "Prayer", ar: "الصلاة" },
  "dash.ramadan.title": { fr: "Ramadan", en: "Ramadan", ar: "رمضان" },
  "dash.makeup.title": { fr: "Rattrapages", en: "Makeups", ar: "القضاء" },
  "dash.prayer.section.title": {
    fr: "Horaires de prière",
    en: "Prayer times",
    ar: "مواقيت الصلاة",
  },
  "dash.prayer.section.subtitle": {
    fr: "Définis ta position pour calculer les horaires.",
    en: "Set your position to compute times.",
    ar: "أدخل موقعك لحساب المواقيت.",
  },
  "dash.ramadan.section.title": {
    fr: "Suivi du jeûne (30j)",
    en: "Fasting tracker (30d)",
    ar: "متابعة الصيام (30 يوماً)",
  },
  "dash.dhikr.section.title": { fr: "Dhikr", en: "Dhikr", ar: "الذكر" },
  "dash.reminders.section.title": { fr: "Rappels", en: "Reminders", ar: "التذكيرات" },
  "dash.reminders.section.subtitle": {
    fr: "Rappels backend (serveur).",
    en: "Server reminders.",
    ar: "تذكيرات الخادم.",
  },
  "dash.button.show": { fr: "Afficher", en: "Show", ar: "عرض" },
  "dash.button.calculating": { fr: "Calcul…", en: "Calculating…", ar: "جارٍ الحساب..." },
  "dash.ramadan.subtitle": {
    fr: "Résumé de ton Ramadan pour l’année en cours.",
    en: "Your Ramadan summary for the current year.",
    ar: "ملخص رمضان للسنة الحالية.",
  },
  "dash.ramadan.today.none": {
    fr: "Ramadan: pas de statut saisi",
    en: "Ramadan: no status recorded",
    ar: "رمضان: لم يتم تسجيل حالة",
  },
  "dash.ramadan.loading": { fr: "Ramadan: chargement…", en: "Ramadan: loading…", ar: "رمضان: جارٍ التحميل..." },
  "dash.ramadan.error": { fr: "Ramadan indisponible", en: "Ramadan unavailable", ar: "رمضان غير متوفر" },
  "dash.makeup.label": {
    fr: "jour(s) à rattraper",
    en: "make-up day(s)",
    ar: "يوم/أيام قضاء",
  },
  "dash.fasting.subtitle": {
    fr: "Tes 30 derniers jours de jeûne.",
    en: "Your last 30 days of fasting.",
    ar: "آخر 30 يوماً من الصيام.",
  },
  "dash.dhikr.subtitle": {
    fr: "Sélectionne un dhikr et enregistre un nouveau décompte.",
    en: "Select a dhikr and log a new count.",
    ar: "اختر ذكراً وسجل عدداً جديداً.",
  },
  "dash.reminders.subtitle.detail": {
    fr: "Configure tes rappels serveur (push distants).",
    en: "Configure your server-side reminders (remote push).",
    ar: "اضبط تذكيرات الخادم (إشعارات بعيدة).",
  },
  "dash.ramadan.recentDays": { fr: "Jours récents", en: "Recent days", ar: "الأيام الأخيرة" },
  "dash.ramadan.noDays": {
    fr: "Aucun jour enregistré pour Ramadan.",
    en: "No days recorded for Ramadan.",
    ar: "لا توجد أيام مسجلة لرمضان.",
  },
  "dash.ramadan.unknown": { fr: "Non renseigné", en: "Not set", ar: "غير محدد" },
  "dash.cycle.label": { fr: "Cycle", en: "Cycle", ar: "الدورة" },
  "dash.dhikr.none": { fr: "Aucun dhikr enregistré.", en: "No dhikr recorded.", ar: "لا توجد أذكار مسجلة." },
  "dash.dhikr.total": { fr: "Total enregistré", en: "Total logged", ar: "الإجمالي المسجل" },
  "dash.dhikr.formula": { fr: "Formule", en: "Formula", ar: "الصيغة" },
  "dash.dhikr.count": { fr: "Comptage", en: "Count", ar: "العدد" },
  "dash.dhikr.notes": { fr: "Notes", en: "Notes", ar: "ملاحظات" },
  "dash.dhikr.save": { fr: "Enregistrer", en: "Save", ar: "حفظ" },
  "dash.dhikr.saving": { fr: "Enregistrement…", en: "Saving…", ar: "جارٍ الحفظ..." },
  "dash.dhikr.history": { fr: "Historique récent", en: "Recent history", ar: "السجل الأخير" },
  "dash.dhikr.history.none": {
    fr: "Aucun enregistrement pour l’instant.",
    en: "No records yet.",
    ar: "لا توجد سجلات حتى الآن.",
  },
  "dash.common.deleting": { fr: "Suppression…", en: "Deleting…", ar: "جارٍ الحذف..." },
  "dash.common.delete": { fr: "Supprimer", en: "Delete", ar: "حذف" },
};

export function t(locale: Locale | undefined, key: string, fallback?: string) {
  const lang = (locale ?? "fr") as Locale;
  return messages[key]?.[lang] ?? fallback ?? messages[key]?.fr ?? key;
}
