import type { SeedDhikrCategory } from "./types";
import { morningEveningCategory } from "./categories/morning-evening";
import { afterPrayerCategory } from "./categories/after-prayer";
import { protectionAnxietyCategory } from "./categories/protection-anxiety";
import { beforeSleepCategory } from "./categories/before-sleep";
import { ramadanCategory } from "./categories/ramadan";

export const dhikrSeedCategories: SeedDhikrCategory[] = [
  morningEveningCategory,
  afterPrayerCategory,
  protectionAnxietyCategory,
  beforeSleepCategory,
  ramadanCategory,
];
