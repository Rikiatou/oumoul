import type { SeedDhikrCategory } from "./types";
import { morningEveningCategory } from "./categories/morning-evening";
import { afterPrayerCategory } from "./categories/after-prayer";
import { protectionAnxietyCategory } from "./categories/protection-anxiety";
import { beforeSleepCategory } from "./categories/before-sleep";
import { ramadanCategory } from "./categories/ramadan";
import { dailyLifeCategory } from "./categories/daily-life";
import { forgivenessCategory } from "./categories/forgiveness";
import { familyHealthCategory } from "./categories/family-health";

export const dhikrSeedCategories: SeedDhikrCategory[] = [
  morningEveningCategory,
  afterPrayerCategory,
  protectionAnxietyCategory,
  beforeSleepCategory,
  ramadanCategory,
  dailyLifeCategory,
  forgivenessCategory,
  familyHealthCategory,
];
