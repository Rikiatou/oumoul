"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DhikrCategory, DhikrEntry, DhikrRecord } from "@oumoul/api";
import { dhikrApi } from "@/lib/api";
import { colors, spacing } from "@oumoul/ui";
import { useAuth } from "@/context/auth-context";

interface DhikrFormState {
  entryId: string;
  count: number;
  notes: string;
}

type ThemeKey =
  | "all"
  | "anxiete_sante"
  | "voyage"
  | "famille"
  | "protection"
  | "ruqyah"
  | "travail"
  | "repentir";

interface ThemeOption {
  key: ThemeKey;
  label: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { key: "all", label: "Tous les thèmes" },
  { key: "anxiete_sante", label: "Anxiété & santé" },
  { key: "voyage", label: "Voyage" },
  { key: "famille", label: "Famille" },
  { key: "protection", label: "Protection" },
  { key: "ruqyah", label: "Ruqyah" },
  { key: "travail", label: "Travail & projets" },
  { key: "repentir", label: "Repentir" },
];

const isRamadanBadgeActive = () => {
  const flag = process.env.NEXT_PUBLIC_RAMADAN_MODE === "true";
  const now = new Date();
  // Ramadan typically falls around spring; use March/April as default window if no flag is set.
  const isSpringWindow = now.getMonth() === 2 || now.getMonth() === 3; // 2=March, 3=April
  return flag || isSpringWindow;
};

export default function DhikrDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<DhikrCategory[]>([]);
  const [records, setRecords] = useState<DhikrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState<DhikrFormState>({ entryId: "", count: 33, notes: "" });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("all");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  const entriesByCategory = useMemo(() => {
    return categories.reduce<Record<string, DhikrEntry[]>>((acc, category) => {
      acc[category.id] = category.entries;
      return acc;
    }, {});
  }, [categories]);

  const currentEntry = useMemo(() => {
    if (!form.entryId) return null;
    for (const category of categories) {
      const entry = category.entries.find((item) => item.id === form.entryId);
      if (entry) return entry;
    }
    return null;
  }, [categories, form.entryId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [categoryResponse, recordResponse] = await Promise.all([
        dhikrApi.listCategories(),
        dhikrApi.listRecords(),
      ]);
      const sortedCategories = categoryResponse
        .map((category) => ({
          ...category,
          entries: [...category.entries].sort((a, b) => a.order - b.order),
        }))
        .sort((a, b) => a.order - b.order);
      setCategories(sortedCategories);
      setRecords(recordResponse);
      if (sortedCategories.length > 0) {
        // Catégorie initiale : depuis l'URL si possible, sinon la première
        const categorySlug = searchParams.get("category");
        const decodedCategorySlug = categorySlug ? decodeURIComponent(categorySlug) : null;
        const initialCategory =
          (decodedCategorySlug
            ? sortedCategories.find((cat) => cat.name.toLowerCase().includes(decodedCategorySlug.toLowerCase()))
            : undefined) ?? sortedCategories[0];

        setSelectedCategoryId((prev) => prev ?? initialCategory.id);

        // Formule initiale : première entrée de la catégorie retenue
        if (!form.entryId && initialCategory.entries.length > 0) {
          setForm((prev) => ({ ...prev, entryId: initialCategory.entries[0].id }));
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger les données de dhikr.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [form.entryId, searchParams]);

  useEffect(() => {
    if (!authLoading && user) {
      // Initialiser le thème à partir de l'URL si fourni
      const themeParam = searchParams.get("theme");
      const decodedThemeParam = themeParam ? decodeURIComponent(themeParam) : null;
      if (decodedThemeParam && THEME_OPTIONS.some((option) => option.key === decodedThemeParam)) {
        setSelectedTheme(decodedThemeParam as ThemeKey);
      }

      void loadData();
    }
  }, [authLoading, user, loadData, searchParams]);

  const handleEntryChange = useCallback((entryId: string) => {
    setForm((prev) => ({ ...prev, entryId }));
  }, []);

  const handleCountChange = useCallback((count: number) => {
    setForm((prev) => ({ ...prev, count: Number.isNaN(count) || count < 0 ? 0 : count }));
  }, []);

  const handleNotesChange = useCallback((notes: string) => {
    setForm((prev) => ({ ...prev, notes }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.entryId) return;
    setSaving(true);
    setError(null);
    try {
      await dhikrApi.upsertRecord({
        entryId: form.entryId,
        count: form.count,
        notes: form.notes.trim() ? form.notes.trim() : undefined,
      });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d’enregistrer le dhikr.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [form.entryId, form.count, form.notes, loadData]);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      setError(null);
      try {
        await dhikrApi.deleteRecord(id);
        await loadData();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de supprimer l’enregistrement.";
        setError(message);
      } finally {
        setDeletingId(null);
      }
    },
    [loadData],
  );

  const totalCount = useMemo(() => records.reduce((sum, record) => sum + record.count, 0), [records]);
  const filterEntryByTheme = useCallback((categoryName: string, entryTitle: string, theme: ThemeKey) => {
    if (theme === "all") return true;

    const name = categoryName.toLowerCase();
    const title = entryTitle.toLowerCase();

    if (theme === "anxiete_sante") {
      return (
        name.includes("périodes sensibles") ||
        title.includes("angoisse") ||
        title.includes("tristesse") ||
        title.includes("santé") ||
        title.includes("guérison")
      );
    }

    if (theme === "voyage") {
      return name.includes("vie quotidienne") && (title.includes("voyage") || title.includes("transport"));
    }

    if (theme === "famille") {
      return (
        title.includes("famille") ||
        title.includes("conjoint") ||
        title.includes("parents") ||
        title.includes("enfants") ||
        title.includes("enfant")
      );
    }

    if (theme === "protection") {
      return (
        title.includes("protection") ||
        title.includes("ruqyah") ||
        title.includes("générale") ||
        title.includes("enfants")
      );
    }

    if (theme === "ruqyah") {
      return title.toLowerCase().includes("ruqyah");
    }

    if (theme === "travail") {
      return name.includes("vie quotidienne") && (title.includes("travail") || title.includes("subsistance"));
    }

    if (theme === "repentir") {
      return name.includes("périodes sensibles") && (title.includes("repentir") || title.includes("istighf"));
    }

    return true;
  }, []);

  const filteredCategories = useMemo(() => {
    const base = !selectedCategoryId
      ? categories
      : categories.filter((category) => category.id === selectedCategoryId);

    if (selectedTheme === "all") {
      return base;
    }

    return base
      .map((category) => ({
        ...category,
        entries: category.entries.filter((entry) => filterEntryByTheme(category.name, entry.title, selectedTheme)),
      }))
      .filter((category) => category.entries.length > 0);
  }, [categories, selectedCategoryId, selectedTheme, filterEntryByTheme]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const selectedCategoryHint = useMemo(() => {
    if (!selectedCategory) return null;
    switch (selectedCategory.name) {
      case "Périodes sensibles":
        return "Anxiété, santé, règles, grossesse, ruqyah, repentir, protection émotionnelle.";
      case "Vie quotidienne":
        return "Sommeil, maison, voyage, travail & projets, famille (conjoint, enfants, parents).";
      case "Duas de Ramadan":
        return "Iftar, nuit de Qadr, moments forts du mois de Ramadan.";
      case "Dhikr du matin":
        return "Formules du matin (après Fajr / début de journée).";
      case "Dhikr du soir":
        return "Formules du soir (après ʿAsr / Maghrib).";
      case "Après la salat":
        return "Formules à répéter après les prières obligatoires.";
      case "Hisn al Muslim (arabe)":
        return "Toutes les invocations de Hisn al Muslim en arabe, classées par chapitre.";
      default:
        return null;
    }
  }, [selectedCategory]);

  if (authLoading || loading) {
    return (
      <div style={fullHeightCentered}>
        <p>Chargement…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <section style={sectionStyle}>
        <header style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Duas & Dhikr</h2>
            <p style={sectionSubtitleStyle}>
              Choisis une catégorie (matin, soir, après salat, Ramadan, périodes sensibles…) puis une formule pour enregistrer ton
              dhikr ou tes duas. Tes enregistrements sont liés à ton profil et visibles dans l’historique.
            </p>
          </div>
          <div style={statsCardStyle}>
            <span style={cardLabelStyle}>Total enregistré</span>
            <strong style={cardValueStyle}>{totalCount}</strong>
            <button
              type="button"
              onClick={() => router.push("/dashboard/imane/program")}
              style={{
                marginTop: spacing.xs,
                padding: `${spacing.xs}px ${spacing.sm}px`,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.6)",
                backgroundColor: "transparent",
                color: colors.neutral100,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Voir ton programme Imane
            </button>
          </div>
        </header>
        {error && <p style={{ color: "#ff8a80" }}>{error}</p>}
        <div style={categoryBarStyle}>
          {categories.map((category) => {
            const isActive = selectedCategoryId === category.id;
            const isRamadan =
              isRamadanBadgeActive() &&
              typeof category.name === "string" &&
              category.name.toLowerCase().includes("ramadan");
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setSelectedCategoryId(category.id);
                  const firstEntry = category.entries[0];
                  if (firstEntry) {
                    setForm((prev) => ({ ...prev, entryId: firstEntry.id }));
                  }
                }}
                style={categoryChipStyle(isActive)}
              >
                <span>{category.name}</span>
                {isRamadan && (
                  <span
                    style={{
                      marginLeft: 8,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
                      color: "#1d1a16",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.3,
                      textTransform: "uppercase",
                    }}
                  >
                    Ramadan
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {selectedCategory && selectedCategory.description && (
          <p
            style={{
              fontSize: 13,
              opacity: 0.8,
              marginTop: 4,
              marginBottom: spacing.sm,
            }}
          >
            {selectedCategory.description}
          </p>
        )}
        {selectedCategoryHint && (
          <p
            style={{
              fontSize: 12,
              opacity: 0.7,
              marginTop: -8,
              marginBottom: spacing.sm,
            }}
          >
            {selectedCategoryHint}
          </p>
        )}
        <div style={themeBarStyle}>
          <span style={themeLabelStyle}>Filtrer par thème</span>
          <select
            value={selectedTheme}
            onChange={(event) => setSelectedTheme(event.target.value as ThemeKey)}
            style={themeSelectStyle}
          >
            {THEME_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div style={formGridStyle}>
          <label style={fieldLabelStyle}>
            Formule
            <select
              value={form.entryId}
              onChange={(event) => handleEntryChange(event.target.value)}
              style={selectStyle}
            >
              {filteredCategories.map((category) => (
                <optgroup key={category.id} label={category.name}>
                  {category.entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label style={fieldLabelStyle}>
            Comptage
            <input
              type="number"
              min={0}
              value={form.count}
              onChange={(event) => handleCountChange(parseInt(event.target.value, 10))}
              style={inputStyle}
            />
          </label>
          <label style={{ ...fieldLabelStyle, gridColumn: "1 / span 2" }}>
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => handleNotesChange(event.target.value)}
              style={textAreaStyle}
              placeholder="Intentions, ressentis, rappels…"
            />
          </label>
          <button type="button" onClick={() => void handleSubmit()} disabled={saving || !form.entryId} style={submitButtonStyle}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
        {currentEntry && (
          <div style={entryCardStyle}>
            <p style={{ fontWeight: 600, fontSize: 16 }}>{currentEntry.title}</p>
            <p style={arabicStyle}>{currentEntry.arabicText}</p>
            {currentEntry.translit && <p style={translitStyle}>{currentEntry.translit}</p>}
            {currentEntry.translation && <p style={translationStyle}>{currentEntry.translation}</p>}
            {currentEntry.source && <p style={sourceStyle}>Source · {currentEntry.source}</p>}
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/dashboard/imane/program?from=dhikr&entryId=${encodeURIComponent(currentEntry.id)}&entryTitle=${encodeURIComponent(
                    currentEntry.title,
                  )}`,
                )
              }
              style={secondaryButtonStyle}
            >
              Ouvrir ton programme Imane
            </button>
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <header style={sectionHeaderStyle}>
          <h3 style={sectionTitleStyle}>Historique récent</h3>
          <p style={sectionSubtitleStyle}>Consultes et ajuste tes derniers enregistrements.</p>
        </header>
        {records.length === 0 ? (
          <p style={{ opacity: 0.75 }}>Aucun dhikr enregistré pour le moment.</p>
        ) : (
          <div style={recordsGridStyle}>
            {records.map((record) => (
              <article key={record.id} style={recordItemStyle}>
                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>{record.entry.title}</p>
                    <p style={{ opacity: 0.7, fontSize: 12 }}>{new Date(record.notedAt).toLocaleString(user.locale ?? "fr")}</p>
                  </div>
                  <span style={recordCountStyle}>{record.count}</span>
                </header>
                {record.notes && <p style={{ opacity: 0.8 }}>{record.notes}</p>}
                <footer style={recordFooterStyle}>
                  <button
                    type="button"
                    onClick={() =>
                      void dhikrApi
                        .updateRecord(record.id, { count: record.count + 1 })
                        .then(() => loadData())
                        .catch((err) => setError(err instanceof Error ? err.message : "Mise à jour impossible"))
                    }
                    style={secondaryButtonStyle}
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(record.id)}
                    disabled={deletingId === record.id}
                    style={dangerButtonStyle}
                  >
                    {deletingId === record.id ? "Suppression…" : "Supprimer"}
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const containerStyle: CSSProperties = {
  maxWidth: 1040,
  margin: "0 auto",
  display: "grid",
  gap: spacing.lg,
};

const categoryBarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.sm,
  marginBottom: spacing.sm,
};

const categoryChipStyle = (isActive: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: spacing.xs,
  padding: `${spacing.xs}px ${spacing.sm * 1.2}px`,
  borderRadius: 999,
  border: isActive ? "1px solid rgba(255,255,255,0.75)" : "1px solid rgba(255,255,255,0.35)",
  backgroundColor: isActive ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.2)",
  color: colors.neutral100,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: isActive ? 700 : 600,
});

const sectionStyle: CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.35)",
  borderRadius: spacing.lg,
  padding: `${spacing.lg * 1.5}px`,
  border: "1px solid rgba(255,255,255,0.12)",
  display: "grid",
  gap: spacing.lg,
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: spacing.lg,
  flexWrap: "wrap",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  margin: 0,
};

const sectionSubtitleStyle: CSSProperties = {
  opacity: 0.78,
  lineHeight: 1.6,
  margin: 0,
};

const themeBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
  marginBottom: spacing.sm,
  marginTop: spacing.xs,
};

const themeLabelStyle: CSSProperties = {
  fontSize: 13,
  opacity: 0.8,
};

const themeSelectStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: spacing.md,
  border: "1px solid rgba(0,0,0,0.12)",
  backgroundColor: "rgba(255,252,248,0.94)",
  color: colors.neutral900,
  fontSize: 13,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gap: spacing.sm,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  alignItems: "end",
};

const fieldLabelStyle: CSSProperties = {
  display: "grid",
  gap: spacing.xs,
  fontSize: 14,
  opacity: 0.9,
};

const selectStyle: CSSProperties = {
  ...fieldLabelStyle,
  padding: "12px 16px",
  borderRadius: spacing.md,
  border: "1px solid rgba(0,0,0,0.12)",
  backgroundColor: "rgba(255,252,248,0.94)",
  color: colors.neutral900,
  fontSize: 15,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: spacing.md,
  border: "1px solid rgba(0,0,0,0.12)",
  backgroundColor: "rgba(255,252,248,0.94)",
  color: colors.neutral900,
  fontSize: 15,
};

const textAreaStyle: CSSProperties = {
  width: "100%",
  minHeight: 90,
  padding: "12px 16px",
  borderRadius: spacing.md,
  border: "1px solid rgba(0,0,0,0.12)",
  backgroundColor: "rgba(255,252,248,0.94)",
  color: colors.neutral900,
  fontSize: 15,
  resize: "vertical",
};

const submitButtonStyle: CSSProperties = {
  padding: `${spacing.sm}px ${spacing.lg}px`,
  borderRadius: spacing.md,
  border: "none",
  backgroundColor: colors.neutral100,
  color: colors.primary,
  fontWeight: 700,
  cursor: "pointer",
};

const entryCardStyle: CSSProperties = {
  display: "grid",
  gap: spacing.xs,
  backgroundColor: "rgba(0,0,0,0.3)",
  borderRadius: spacing.md,
  padding: `${spacing.md}px`,
  border: "1px solid rgba(255,255,255,0.12)",
};

const arabicStyle: CSSProperties = {
  fontSize: 28,
  lineHeight: 1.5,
  textAlign: "right",
};

const translitStyle: CSSProperties = {
  fontSize: 16,
  opacity: 0.85,
};

const translationStyle: CSSProperties = {
  fontSize: 16,
  opacity: 0.85,
};

const sourceStyle: CSSProperties = {
  fontSize: 13,
  opacity: 0.6,
};

const recordsGridStyle: CSSProperties = {
  display: "grid",
  gap: spacing.sm,
};

const recordItemStyle: CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.4)",
  borderRadius: spacing.md,
  padding: `${spacing.md}px`,
  display: "grid",
  gap: spacing.sm,
};

const recordFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: spacing.sm,
};

const secondaryButtonStyle: CSSProperties = {
  padding: `${spacing.xs}px ${spacing.md}px`,
  borderRadius: spacing.md,
  border: "1px solid rgba(255,255,255,0.4)",
  backgroundColor: "transparent",
  color: colors.neutral100,
  fontWeight: 600,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  padding: `${spacing.xs}px ${spacing.md}px`,
  borderRadius: spacing.md,
  border: "1px solid rgba(255, 138, 128, 0.45)",
  backgroundColor: "rgba(255, 84, 73, 0.12)",
  color: "#ff8a80",
  fontWeight: 600,
  cursor: "pointer",
};

const recordCountStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
};

const statsCardStyle: CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.3)",
  borderRadius: spacing.md,
  padding: `${spacing.md}px ${spacing.lg}px`,
  display: "grid",
  gap: spacing.xs,
  minWidth: 160,
  textAlign: "right",
};

const cardLabelStyle: CSSProperties = {
  textTransform: "uppercase",
  fontSize: 12,
  letterSpacing: 2,
  opacity: 0.7,
};

const cardValueStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
};

const fullHeightCentered: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.primary,
  color: colors.neutral100,
};
