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

  // ── Navigation tabs ──
  "tab.home": { fr: "Accueil", en: "Home", ar: "الرئيسية" },
  "tab.quran": { fr: "Coran", en: "Quran", ar: "القرآن" },
  "tab.dhikr": { fr: "Dhikr", en: "Dhikr", ar: "الذكر" },
  "tab.ramadan": { fr: "Ramadan", en: "Ramadan", ar: "رمضان" },
  "tab.more": { fr: "Plus", en: "More", ar: "المزيد" },

  // ── More screen ──
  "more.title": { fr: "Plus", en: "More", ar: "المزيد" },
  "more.tools": { fr: "Outils", en: "Tools", ar: "الأدوات" },
  "more.settings": { fr: "Réglages", en: "Settings", ar: "الإعدادات" },
  "more.search": { fr: "Recherche globale", en: "Global Search", ar: "بحث شامل" },
  "more.guide": { fr: "Guide de l'app", en: "App Guide", ar: "دليل التطبيق" },
  "more.hijri": { fr: "Calendrier Hijri", en: "Hijri Calendar", ar: "التقويم الهجري" },
  "more.qibla": { fr: "Direction Qibla", en: "Qibla Direction", ar: "اتجاه القبلة" },
  "more.imane": { fr: "Programme Imane", en: "Imane Program", ar: "برنامج الإيمان" },
  "more.prayer": { fr: "Suivi des prières", en: "Prayer Tracking", ar: "متابعة الصلاة" },
  "more.audio": { fr: "Écouter le Coran", en: "Listen to Quran", ar: "استمع للقرآن" },
  "more.names": { fr: "99 Noms d'Allah", en: "99 Names of Allah", ar: "أسماء الله الحسنى" },
  "more.tasbih": { fr: "Tasbih", en: "Tasbih", ar: "التسبيح" },
  "more.mosque": { fr: "Mosquées", en: "Mosques", ar: "المساجد" },
  "more.hadith": { fr: "Hadith du jour", en: "Daily Hadith", ar: "حديث اليوم" },
  "more.zakat": { fr: "Calculateur Zakat", en: "Zakat Calculator", ar: "حاسبة الزكاة" },
  "more.eid": { fr: "Cartes de vœux", en: "Greeting Cards", ar: "بطاقات تهنئة" },
  "more.words": { fr: "Vocabulaire Coran", en: "Quran Vocabulary", ar: "مفردات القرآن" },
  "more.prayerSettings": { fr: "Réglages prière", en: "Prayer Settings", ar: "إعدادات الصلاة" },
  "more.darkMode": { fr: "Mode sombre", en: "Dark Mode", ar: "الوضع الداكن" },
  "more.language": { fr: "Langue", en: "Language", ar: "اللغة" },
  "more.logout": { fr: "Se déconnecter", en: "Log out", ar: "تسجيل الخروج" },
  "more.loggingOut": { fr: "Déconnexion…", en: "Logging out…", ar: "جارٍ تسجيل الخروج..." },

  // ── Welcome & Onboarding ──
  "welcome.greeting": { fr: "Assalamou Alaikoum", en: "Assalamu Alaikum", ar: "السلام عليكم" },
  "welcome.tagline": { fr: "Ton compagnon spirituel\nau quotidien", en: "Your daily spiritual\ncompanion", ar: "رفيقك الروحي\nاليومي" },
  "welcome.start": { fr: "Commencer", en: "Get Started", ar: "ابدأ" },
  "welcome.bismillah": { fr: "Bismillah Ar-Rahman Ar-Rahim", en: "Bismillah Ar-Rahman Ar-Rahim", ar: "بسم الله الرحمن الرحيم" },
  "welcome.feature.prayer": { fr: "Horaires de prière précis", en: "Accurate prayer times", ar: "مواقيت صلاة دقيقة" },
  "welcome.feature.quran": { fr: "Coran, Tafsir & Recherche", en: "Quran, Tafsir & Search", ar: "القرآن والتفسير والبحث" },
  "welcome.feature.ramadan": { fr: "Suivi Ramadan intelligent", en: "Smart Ramadan tracker", ar: "متتبع رمضان ذكي" },
  "welcome.feature.dhikr": { fr: "Dhikr & Invocations", en: "Dhikr & Supplications", ar: "الأذكار والأدعية" },

  // ── Onboarding steps ──
  "onboarding.skip": { fr: "Passer", en: "Skip", ar: "تخطي" },
  "onboarding.next": { fr: "Suivant", en: "Next", ar: "التالي" },
  "onboarding.done": { fr: "C'est parti !", en: "Let's go!", ar: "هيا بنا!" },

  // ── Prayer tracking ──
  "prayer.title": { fr: "Suivi des prières", en: "Prayer Tracking", ar: "متابعة الصلاة" },
  "prayer.streak": { fr: "Série en cours 🔥", en: "Current streak 🔥", ar: "سلسلة متواصلة 🔥" },
  "prayer.days": { fr: "jours", en: "days", ar: "أيام" },
  "prayer.accomplished": { fr: "des prières accomplies", en: "of prayers accomplished", ar: "من الصلوات المؤداة" },
  "prayer.fajr": { fr: "Fajr", en: "Fajr", ar: "الفجر" },
  "prayer.dhuhr": { fr: "Dhuhr", en: "Dhuhr", ar: "الظهر" },
  "prayer.asr": { fr: "Asr", en: "Asr", ar: "العصر" },
  "prayer.maghrib": { fr: "Maghrib", en: "Maghrib", ar: "المغرب" },
  "prayer.isha": { fr: "Isha", en: "Isha", ar: "العشاء" },
  "prayer.onTime": { fr: "À l'heure", en: "On time", ar: "في الوقت" },
  "prayer.late": { fr: "En retard", en: "Late", ar: "متأخر" },
  "prayer.missed": { fr: "Manquée", en: "Missed", ar: "فائتة" },
  "prayer.week": { fr: "Semaine", en: "Week", ar: "الأسبوع" },
  "prayer.month": { fr: "Mois", en: "Month", ar: "الشهر" },

  // ── Ramadan ──
  "ramadan.title": { fr: "Ramadan", en: "Ramadan", ar: "رمضان" },
  "ramadan.fasted": { fr: "Jeûné", en: "Fasted", ar: "صام" },
  "ramadan.missed": { fr: "Raté", en: "Missed", ar: "فائت" },
  "ramadan.exemption": { fr: "Exemptée", en: "Exempt", ar: "معفاة" },
  "ramadan.madeUp": { fr: "Rattrapé", en: "Made up", ar: "قضاء" },
  "ramadan.daysToMakeUp": { fr: "jours à rattraper", en: "days to make up", ar: "أيام للقضاء" },
  "ramadan.reminder": { fr: "Rappel de jeûne", en: "Fasting reminder", ar: "تذكير بالصيام" },
  "ramadan.summary": { fr: "Bilan de Ramadan", en: "Ramadan Summary", ar: "ملخص رمضان" },
  "ramadan.makeupPlan": { fr: "Programme de rattrapage", en: "Makeup Plan", ar: "برنامج القضاء" },
  "ramadan.today": { fr: "As-tu jeûné aujourd'hui ?", en: "Did you fast today?", ar: "هل صمت اليوم؟" },
  "ramadan.yes": { fr: "Oui", en: "Yes", ar: "نعم" },
  "ramadan.no": { fr: "Non", en: "No", ar: "لا" },
  "ramadan.notes": { fr: "Notes", en: "Notes", ar: "ملاحظات" },
  "ramadan.save": { fr: "Enregistrer", en: "Save", ar: "حفظ" },
  "ramadan.saved": { fr: "Enregistré avec succès", en: "Saved successfully", ar: "تم الحفظ بنجاح" },

  // ── Tasbih ──
  "tasbih.title": { fr: "Tasbih", en: "Tasbih", ar: "التسبيح" },
  "tasbih.reset": { fr: "Réinitialiser", en: "Reset", ar: "إعادة تعيين" },
  "tasbih.target": { fr: "Objectif", en: "Target", ar: "الهدف" },
  "tasbih.sessions": { fr: "Sessions", en: "Sessions", ar: "الجلسات" },
  "tasbih.custom": { fr: "Dhikr personnalisé", en: "Custom Dhikr", ar: "ذكر مخصص" },

  // ── Allah Names ──
  "names.title": { fr: "99 Noms d'Allah", en: "99 Names of Allah", ar: "أسماء الله الحسنى" },
  "names.memorized": { fr: "mémorisés", en: "memorized", ar: "محفوظة" },
  "names.quiz": { fr: "Quiz", en: "Quiz", ar: "اختبار" },
  "names.search": { fr: "Rechercher un nom…", en: "Search a name…", ar: "ابحث عن اسم..." },
  "names.benefit": { fr: "Bienfait", en: "Benefit", ar: "الفائدة" },

  // ── Quran ──
  "quran.title": { fr: "Lire le Coran", en: "Read Quran", ar: "اقرأ القرآن" },
  "quran.listen": { fr: "Écouter le Coran", en: "Listen to Quran", ar: "استمع للقرآن" },
  "quran.search": { fr: "Rechercher une sourate…", en: "Search a surah…", ar: "ابحث عن سورة..." },
  "quran.verses": { fr: "versets", en: "verses", ar: "آيات" },
  "quran.bookmarks": { fr: "Signets", en: "Bookmarks", ar: "المرجعيات" },
  "quran.lastRead": { fr: "Dernière lecture", en: "Last read", ar: "آخر قراءة" },
  "quran.tafsir": { fr: "Tafsir", en: "Tafsir", ar: "التفسير" },

  // ── Hadith ──
  "hadith.title": { fr: "Hadith du jour", en: "Daily Hadith", ar: "حديث اليوم" },
  "hadith.favorite": { fr: "Favoris", en: "Favorites", ar: "المفضلة" },
  "hadith.share": { fr: "Partager", en: "Share", ar: "مشاركة" },
  "hadith.topics.all": { fr: "Tous", en: "All", ar: "الكل" },
  "hadith.topics.faith": { fr: "Foi", en: "Faith", ar: "الإيمان" },
  "hadith.topics.prayer": { fr: "Prière", en: "Prayer", ar: "الصلاة" },
  "hadith.topics.charity": { fr: "Charité", en: "Charity", ar: "الصدقة" },
  "hadith.topics.patience": { fr: "Patience", en: "Patience", ar: "الصبر" },
  "hadith.topics.knowledge": { fr: "Savoir", en: "Knowledge", ar: "العلم" },
  "hadith.topics.family": { fr: "Famille", en: "Family", ar: "الأسرة" },
  "hadith.topics.manners": { fr: "Bonnes manières", en: "Good Manners", ar: "حسن الخلق" },

  // ── Zakat ──
  "zakat.title": { fr: "Calculateur Zakat", en: "Zakat Calculator", ar: "حاسبة الزكاة" },
  "zakat.assets": { fr: "Actifs", en: "Assets", ar: "الأصول" },
  "zakat.debts": { fr: "Dettes", en: "Debts", ar: "الديون" },
  "zakat.result": { fr: "Résultat", en: "Result", ar: "النتيجة" },
  "zakat.due": { fr: "Zakat due", en: "Zakat due", ar: "الزكاة المستحقة" },
  "zakat.nisab": { fr: "Nisab", en: "Nisab", ar: "النصاب" },

  // ── Mosque ──
  "mosque.title": { fr: "Mosquées à proximité", en: "Nearby Mosques", ar: "المساجد القريبة" },
  "mosque.search": { fr: "Rechercher une mosquée…", en: "Search a mosque…", ar: "ابحث عن مسجد..." },
  "mosque.distance": { fr: "Distance", en: "Distance", ar: "المسافة" },
  "mosque.directions": { fr: "Itinéraire", en: "Directions", ar: "الاتجاهات" },

  // ── Quran Words ──
  "words.title": { fr: "Vocabulaire du Coran", en: "Quran Vocabulary", ar: "مفردات القرآن" },
  "words.learned": { fr: "mots appris", en: "words learned", ar: "كلمات محفوظة" },

  // ── Hijri Calendar ──
  "hijri.title": { fr: "Calendrier Hijri", en: "Hijri Calendar", ar: "التقويم الهجري" },

  // ── Eid Greetings ──
  "eid.title": { fr: "Cartes de vœux", en: "Greeting Cards", ar: "بطاقات تهنئة" },
  "eid.share": { fr: "Partager", en: "Share", ar: "مشاركة" },
  "eid.customize": { fr: "Personnaliser", en: "Customize", ar: "تخصيص" },

  // ── Cycle ──
  "cycle.title": { fr: "Suivi du cycle", en: "Cycle Tracking", ar: "متابعة الدورة" },
  "cycle.pure": { fr: "Pure", en: "Pure", ar: "طاهرة" },
  "cycle.menses": { fr: "Règles", en: "Menses", ar: "حيض" },
  "cycle.spotting": { fr: "Spotting", en: "Spotting", ar: "استحاضة" },
  "cycle.postpartum": { fr: "Postpartum", en: "Postpartum", ar: "نفاس" },

  // ── App Guide ──
  "guide.title": { fr: "Guide de l'app", en: "App Guide", ar: "دليل التطبيق" },
  "guide.modules": { fr: "modules disponibles", en: "modules available", ar: "وحدات متاحة" },
  "guide.features": { fr: "Fonctionnalités", en: "Features", ar: "الميزات" },
  "guide.open": { fr: "Ouvrir", en: "Open", ar: "فتح" },
  "guide.banner": {
    fr: "Bienvenue dans Oumoul ! Découvre ci-dessous toutes les fonctionnalités de l'app.",
    en: "Welcome to Oumoul! Discover all the app features below.",
    ar: "مرحباً في أمول! اكتشف جميع ميزات التطبيق أدناه.",
  },
  "guide.all": { fr: "Tous", en: "All", ar: "الكل" },

  // ── Common ──
  "common.loading": { fr: "Chargement…", en: "Loading…", ar: "جارٍ التحميل..." },
  "common.error": { fr: "Erreur", en: "Error", ar: "خطأ" },
  "common.retry": { fr: "Réessayer", en: "Retry", ar: "إعادة المحاولة" },
  "common.save": { fr: "Enregistrer", en: "Save", ar: "حفظ" },
  "common.cancel": { fr: "Annuler", en: "Cancel", ar: "إلغاء" },
  "common.close": { fr: "Fermer", en: "Close", ar: "إغلاق" },
  "common.search": { fr: "Rechercher…", en: "Search…", ar: "بحث..." },
  "common.noResults": { fr: "Aucun résultat", en: "No results", ar: "لا توجد نتائج" },

  // ── Dashboard header ──
  "dash.greeting": {
    fr: "Assalamou Alaikoum Wa Rahmatoullahi Wa Barakouthou",
    en: "Assalamu Alaikum Wa Rahmatullahi Wa Barakatuh",
    ar: "السلام عليكم ورحمة الله وبركاته",
  },
  "dash.gps": { fr: "Détection GPS…", en: "Detecting GPS…", ar: "جارٍ تحديد الموقع..." },
  "dash.nextPrayer": { fr: "Prochaine prière", en: "Next prayer", ar: "الصلاة التالية" },
  "dash.inspiration": { fr: "Inspiration du jour", en: "Daily Inspiration", ar: "إلهام اليوم" },
  "dash.streaks": { fr: "Séries", en: "Streaks", ar: "السلاسل" },
};

export function t(locale: Locale | undefined, key: string, fallback?: string) {
  const lang = (locale ?? "fr") as Locale;
  return messages[key]?.[lang] ?? fallback ?? messages[key]?.fr ?? key;
}
