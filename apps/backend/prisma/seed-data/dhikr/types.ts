export interface LocalizedString {
  fr: string;
  en: string;
  ar: string;
}

export interface TranslationString {
  fr: string;
  en: string;
}

export interface SeedDhikrEntry {
  slug: string;
  order: number;
  title: LocalizedString;
  arabicText: string;
  transliteration: string;
  translation: TranslationString;
  source: string;
  recommendedCount?: number;
  note?: string;
}

export interface SeedDhikrCategory {
  slug: string;
  order: number;
  name: LocalizedString;
  description?: TranslationString;
  entries: SeedDhikrEntry[];
}
