import * as Haptics from "expo-haptics";

export async function triggerHaptic(type: "light" | "medium" | "heavy" | "success" | "warning" | "error") {
  try {
    switch (type) {
      case "light":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "success":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch (error) {
    // Haptics not supported on this device
    console.warn("Haptics not supported:", error);
  }
}

export async function triggerSelection() {
  try {
    await Haptics.selectionAsync();
  } catch (error) {
    console.warn("Selection haptic not supported:", error);
  }
}

// For important actions
export async function triggerImportantAction() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Small delay for dramatic effect
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, 100);
  } catch (error) {
    console.warn("Important action haptic not supported:", error);
  }
}

// For completed tasks
export async function triggerTaskComplete() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    console.warn("Task complete haptic not supported:", error);
  }
}

// For swipe actions
export async function triggerSwipe() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    console.warn("Swipe haptic not supported:", error);
  }
}
