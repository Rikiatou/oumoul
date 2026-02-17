import React from "react";
import { View, Text, StyleSheet, Switch, ActivityIndicator } from "react-native";
import { palette } from "../../theme";
import { Locale } from "../../i18n";
import { t } from "../../i18n";

type LocalReminderType = 
  | "AdhanFajr"
  | "AdhanDhuhr"
  | "AdhanAsr"
  | "AdhanMaghrib"
  | "AdhanIsha"
  | "SuhoorLocal"
  | "IftarLocal"
  | "DhikrMorning"
  | "DhikrEvening"
  | "JumuahReminder";

const LOCAL_REMINDER_TYPES: LocalReminderType[] = [
  "AdhanFajr",
  "AdhanDhuhr",
  "AdhanAsr",
  "AdhanMaghrib",
  "AdhanIsha",
  "SuhoorLocal",
  "IftarLocal",
  "DhikrMorning",
  "DhikrEvening",
  "JumuahReminder",
] as const;

const LOCAL_REMINDER_LABELS: Record<LocalReminderType, string> = {
  AdhanFajr: "Adhan Fajr",
  AdhanDhuhr: "Adhan Dhuhr",
  AdhanAsr: "Adhan Asr",
  AdhanMaghrib: "Adhan Maghrib",
  AdhanIsha: "Adhan Isha",
  SuhoorLocal: "Suhoor (30 min avant Fajr)",
  IftarLocal: "Iftar (Maghrib)",
  DhikrMorning: "Adhkar du matin (06h30)",
  DhikrEvening: "Adhkar du soir (18h00)",
  JumuahReminder: "Rappel Jumu'ah (vendredi 12h)",
};

interface SectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function Section({ title, subtitle, children }: SectionProps) {
  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.header}>
        <Text style={sectionStyles.title}>{title}</Text>
        <Text style={sectionStyles.subtitle}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: palette.textSoft,
    lineHeight: 18,
  },
});

interface LocalRemindersSectionProps {
  isLoading: boolean;
  error: string | null;
  enabled: Record<LocalReminderType, boolean>;
  onToggle: (type: LocalReminderType) => void;
  locale: Locale;
}

export function LocalRemindersSection({ 
  isLoading, 
  error, 
  enabled, 
  onToggle, 
  locale 
}: LocalRemindersSectionProps) {
  return (
    <Section 
      title={t(locale, "notif.local.title", "Notifications locales")} 
      subtitle={t(locale, "notif.local.subtitle", "Adhan, Suhoor, Iftar (sur cet appareil)")}
    >
      {isLoading ? (
        <ActivityIndicator color={palette.primaryDark} />
      ) : (
        <View style={styles.container}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {LOCAL_REMINDER_TYPES.map((type) => (
            <View key={type} style={styles.switchRow}>
              <Text style={styles.switchLabel}>
                {t(locale, `notif.local.label.${type}`, LOCAL_REMINDER_LABELS[type])}
              </Text>
              <Switch
                value={enabled[type]}
                onValueChange={() => onToggle(type)}
                trackColor={{ true: palette.primaryDark, false: "rgba(0,0,0,0.1)" }}
                thumbColor={enabled[type] ? palette.primary : "#ccc"}
              />
            </View>
          ))}
        </View>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  errorText: {
    color: palette.error,
    backgroundColor: palette.errorBg,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: palette.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.text,
    flex: 1,
    marginRight: 12,
  },
});
