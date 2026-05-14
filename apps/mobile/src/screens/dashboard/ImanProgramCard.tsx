import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Locale } from "@oumoul/api";
import { palette } from "../../theme";
import { loadImanProgramProgress, calculateImanScore } from "../../storage/iman-program-store";
import { t } from "../../i18n";

interface Props {
  locale: Locale;
}

export function ImanProgramCard({ locale }: Props) {
  const [progress, setProgress] = useState<any>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const prog = await loadImanProgramProgress();
        setProgress(prog);
        setScore(calculateImanScore(prog));
      } catch {
      }
    };
    loadData();
  }, []);

  if (!progress) return null;

  const todayCompleted = progress.completedTasks.length;
  const totalTasks = 5;
  const completionRate = Math.round((todayCompleted / totalTasks) * 100);

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={s.iconContainer}>
          <Ionicons name="checkbox" size={20} color={palette.primaryDark} />
        </View>
        <View style={s.headerText}>
          <Text style={s.title}>Programme Imane</Text>
          <Text style={s.subtitle}>Aujourd'hui</Text>
        </View>
        <View style={s.scoreContainer}>
          <Text style={s.score}>{score}</Text>
          <Text style={s.scoreLabel}>points</Text>
        </View>
      </View>

      <View style={s.progressSection}>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${completionRate}%` }]} />
        </View>
        <Text style={s.progressText}>
          {todayCompleted}/{totalTasks} tâches ({completionRate}%)
        </Text>
      </View>

      <View style={s.streakInfo}>
        <View style={s.streakItem}>
          <Ionicons name="flame" size={16} color={palette.accent} />
          <Text style={s.streakText}>
            {progress.currentStreak} jour{progress.currentStreak > 1 ? "s" : ""} consécutifs
          </Text>
        </View>
        <View style={s.streakItem}>
          <Ionicons name="trophy" size={16} color={palette.accent} />
          <Text style={s.streakText}>
            {progress.totalCompleted} tâches totales
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.primaryDark + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.text,
  },
  subtitle: {
    fontSize: 12,
    color: palette.textSoft,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: "center",
  },
  score: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.primaryDark,
  },
  scoreLabel: {
    fontSize: 10,
    color: palette.textSoft,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: palette.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: palette.primaryDark,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: palette.textSoft,
    marginTop: 4,
  },
  streakInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  streakItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakText: {
    fontSize: 11,
    color: palette.textSoft,
  },
});
