import { useEffect, useState } from "react";
import { useTheme } from "../../context/theme-context";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Locale } from "@oumoul/api";
import { t } from "../../i18n";
import { loadRamadanPlan, getRamadanStats, updateRamadanDay } from "../../storage/advanced-ramadan";

interface Props {
  locale: Locale;
}

export function RamadanPriorityCard({ locale }: Props) {
  const { palette } = useTheme();
  const [plan, setPlan] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [todayProgress, setTodayProgress] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const ramadanPlan = await loadRamadanPlan();
        if (ramadanPlan) {
          setPlan(ramadanPlan);
          const ramadanStats = getRamadanStats(ramadanPlan);
          setStats(ramadanStats);
          
          // Get today's progress
          const today = new Date().toISOString().split('T')[0];
          const todayData = ramadanPlan.dailyProgress.find((day: any) => day.date === today);
          setTodayProgress(todayData);
        }
      } catch {
      }
    };
    loadData();
  }, []);

  if (!plan || !stats) return null;

  const today = new Date();
  const currentHour = today.getHours();
  const isIftarTime = currentHour >= 18 && currentHour <= 19;
  const isSuhoorTime = currentHour >= 4 && currentHour <= 5;

  const handleQuickAction = async (action: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    switch (action) {
      case "fast":
        await updateRamadanDay(today, { fasted: true });
        break;
      case "quran":
        const currentPages = todayProgress?.quranPages || 0;
        await updateRamadanDay(today, { quranPages: currentPages + 1 });
        break;
      case "dhikr":
        await updateRamadanDay(today, { dhikrCompleted: true });
        break;
      case "charity":
        await updateRamadanDay(today, { charity: true });
        break;
    }
    
    // Reload data
    const ramadanPlan = await loadRamadanPlan();
    if (ramadanPlan) {
      setPlan(ramadanPlan);
      const ramadanStats = getRamadanStats(ramadanPlan);
      setStats(ramadanStats);
    }
  };

  return (
    <View style={s.container}>
      {/* Header with Ramadan status */}
      <View style={s.header}>
        <View style={s.headerIcon}>
          <Ionicons name="moon" size={24} color="#fff" />
        </View>
        <View style={s.headerText}>
          <Text style={s.title}>Ramadan Prioritaire</Text>
          <Text style={s.subtitle}>Jour {stats.completedDays} / {stats.totalDays}</Text>
        </View>
        <View style={s.progressRing}>
          <Text style={s.progressText}>{stats.completionRate}%</Text>
        </View>
      </View>

      {/* Current time indicator */}
      {(isSuhoorTime || isIftarTime) && (
        <View style={[s.timeAlert, isSuhoorTime ? s.suhoorAlert : s.iftarAlert]}>
          <Ionicons 
            name={isSuhoorTime ? "sunny" : "moon"} 
            size={16} 
            color="#fff" 
          />
          <Text style={s.timeAlertText}>
            {isSuhoorTime ? "Heure du Suhoor" : "Heure de l'Iftar"}
          </Text>
        </View>
      )}

      {/* Today's progress */}
      <View style={s.progressSection}>
        <Text style={s.sectionTitle}>Progression du jour</Text>
        <View style={s.progressGrid}>
          <TouchableOpacity 
            style={[s.progressItem, todayProgress?.fasted && s.completed]}
            onPress={() => handleQuickAction("fast")}
          >
            <Ionicons 
              name={todayProgress?.fasted ? "checkmark-circle" : "radio-button-off"} 
              size={20} 
              color={todayProgress?.fasted ? palette.success : palette.textSoft} 
            />
            <Text style={s.progressItemText}>Jeûne</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.progressItem, todayProgress?.dhikrCompleted && s.completed]}
            onPress={() => handleQuickAction("dhikr")}
          >
            <Ionicons 
              name={todayProgress?.dhikrCompleted ? "checkmark-circle" : "radio-button-off"} 
              size={20} 
              color={todayProgress?.dhikrCompleted ? palette.success : palette.textSoft} 
            />
            <Text style={s.progressItemText}>Dhikr</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.progressItem, todayProgress?.charity && s.completed]}
            onPress={() => handleQuickAction("charity")}
          >
            <Ionicons 
              name={todayProgress?.charity ? "checkmark-circle" : "radio-button-off"} 
              size={20} 
              color={todayProgress?.charity ? palette.success : palette.textSoft} 
            />
            <Text style={s.progressItemText}>Aumône</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.progressItem, todayProgress?.quranPages > 0 && s.completed]}
            onPress={() => handleQuickAction("quran")}
          >
            <Ionicons 
              name={todayProgress?.quranPages > 0 ? "checkmark-circle" : "radio-button-off"} 
              size={20} 
              color={todayProgress?.quranPages > 0 ? palette.success : palette.textSoft} 
            />
            <Text style={s.progressItemText}>Coran ({todayProgress?.quranPages || 0})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick stats */}
      <View style={s.statsSection}>
        <View style={s.statItem}>
          <Text style={s.statValue}>{stats.totalQuranPages}</Text>
          <Text style={s.statLabel}>Pages Coran</Text>
        </View>
        <View style={s.statItem}>
          <Text style={s.statValue}>{stats.quranProgress}%</Text>
          <Text style={s.statLabel}>Progression</Text>
        </View>
        <View style={s.statItem}>
          <Text style={s.statValue}>{stats.makeupProgress.remaining}</Text>
          <Text style={s.statLabel}>Jours à rattraper</Text>
        </View>
      </View>

      {/* Makeup days reminder */}
      {stats.makeupProgress.remaining > 0 && (
        <View style={s.makeupSection}>
          <Ionicons name="warning" size={16} color={palette.accent} />
          <Text style={s.makeupText}>
            {stats.makeupProgress.remaining} jour{stats.makeupProgress.remaining > 1 ? "s" : ""} de jeûne à rattraper
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#1A7F64',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  progressRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: '#fff',
  },
  timeAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  suhoorAlert: {
    backgroundColor: "rgba(251,191,36,0.2)",
  },
  iftarAlert: {
    backgroundColor: "rgba(239,68,68,0.2)",
  },
  timeAlertText: {
    fontSize: 12,
    fontWeight: "500",
    color: '#fff',
    marginLeft: 8,
  },
  progressSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: '#fff',
    marginBottom: 8,
  },
  progressGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 8,
    minWidth: 80,
  },
  completed: {
    backgroundColor: "rgba(16,185,129,0.3)",
  },
  progressItemText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 6,
  },
  statsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  makeupSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245,158,11,0.2)",
    borderRadius: 8,
    padding: 8,
  },
  makeupText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
});
