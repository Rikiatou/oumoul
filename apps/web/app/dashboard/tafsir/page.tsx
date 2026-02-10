"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TafsirResponse, Locale } from "@oumoul/api";
import { quranApi, tafsirApi } from "@/lib/api";
import { colors, spacing } from "@oumoul/ui";
import { useAuth } from "@/context/auth-context";

interface TafsirFormState {
  surah: string;
  ayah: string;
  locale: Locale;
  source?: string;
}

const DEFAULT_FORM: TafsirFormState = {
  surah: "2",
  ayah: "255",
  locale: "fr",
  source: undefined,
};

interface SurahOption {
  id: number;
  name: string;
  nameArabic: string;
  versesCount: number;
}

export default function TafsirDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<TafsirFormState>(DEFAULT_FORM);
  const [hydrated, setHydrated] = useState(false);
  const [hasUrlPreset, setHasUrlPreset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TafsirResponse | null>(null);
  const [sources, setSources] = useState<Array<{ key: string; name: string; author: string | null }>>([]);
  const [surahs, setSurahs] = useState<SurahOption[]>([]);
  const [ayahOptions, setAyahOptions] = useState<number[]>([]);
  const [surahLoading, setSurahLoading] = useState(false);
  const [ayahLoading, setAyahLoading] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const fetchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Hydrate from URL params first
    const surahParam = searchParams.get("surah");
    const ayahParam = searchParams.get("ayah");
    const sourceParam = searchParams.get("source");
    const localeParam = searchParams.get("locale") as Locale | null;
    const hasPreset = Boolean(surahParam || ayahParam || sourceParam || localeParam);
    if (hasPreset) {
      setHasUrlPreset(true);
      setForm((prev) => ({
        surah: surahParam ?? prev.surah,
        ayah: ayahParam ?? prev.ayah,
        source: sourceParam ?? prev.source,
        locale: localeParam ?? prev.locale,
      }));
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Load persisted state if no URL preset
    if (hasUrlPreset || hydrated) return;
    if (typeof window === "undefined") return;
    const persisted = window.localStorage.getItem("tafsirSelection");
    if (persisted) {
      try {
        const parsed = JSON.parse(persisted) as Partial<TafsirFormState>;
        setForm((prev) => ({
          surah: parsed.surah ?? prev.surah,
          ayah: parsed.ayah ?? prev.ayah,
          locale: (parsed.locale as Locale | undefined) ?? prev.locale,
          source: parsed.source ?? prev.source,
        }));
      } catch {
        // ignore parse errors
      }
    }
    setHydrated(true);
  }, [hasUrlPreset, hydrated]);

  useEffect(() => {
    // Persist to localStorage
    if (!hydrated) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("tafsirSelection", JSON.stringify(form));
    }
  }, [form, hydrated]);

  useEffect(() => {
    let isMounted = true;

    const loadSources = async () => {
      if (!hydrated) return;
      let cancelled = false;
      try {
        const response = await tafsirApi.listSources(form.locale);
        if (!isMounted) return;
        if (cancelled) return;
        setSources(response.sources.map((s) => ({ key: s.key, name: s.name, author: s.author ?? null })));
      } catch {
        if (!isMounted) return;
        setSources([]);
        setShowToast("Impossible de charger les sources de tafsir.");
      }
      return () => {
        cancelled = true;
      };
    };

    void loadSources();
    return () => {
      isMounted = false;
    };
  }, [form.locale, hydrated]);

  useEffect(() => {
    let isMounted = true;
    const loadSurahs = async () => {
      if (!hydrated) return;
      let cancelled = false;
      setSurahLoading(true);
      try {
        const data = await quranApi.listSurahs(form.locale);
        if (!isMounted) return;
        if (cancelled) return;
        const mapped: SurahOption[] = data.surahs.map((s) => ({
          id: s.id,
          name: s.nameSimple ?? `Sourate ${s.id}`,
          nameArabic: s.nameArabic,
          versesCount: s.versesCount,
        }));
        setSurahs(mapped);

        const currentSurahNumber = Number.parseInt(form.surah, 10);
        const currentSurah =
          mapped.find((s) => s.id === currentSurahNumber) ?? (mapped.length > 0 ? mapped[0] : null);
        if (currentSurah) {
          setForm((prev) => ({ ...prev, surah: String(currentSurah.id) }));
        }
      } finally {
        if (isMounted) {
          setSurahLoading(false);
        }
      }
    };

    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }
    fetchDebounceRef.current = setTimeout(() => {
      void loadSurahs();
    }, 200);
    return () => {
      isMounted = false;
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }
    };
  }, [form.locale, hydrated]);

  useEffect(() => {
    let isMounted = true;
    const loadAyahs = async () => {
      if (!hydrated) return;
      const surahNum = Number.parseInt(form.surah, 10);
      if (!Number.isFinite(surahNum)) return;
      let cancelled = false;
      setAyahLoading(true);
      try {
        // getSurah returns verses with translations; we only need count here.
        const data = await quranApi.getSurah(surahNum, form.locale === "ar" ? "ar" : form.locale);
        if (!isMounted) return;
        if (cancelled) return;
        const count = data.verses.length;
        setAyahOptions(Array.from({ length: count }, (_, idx) => idx + 1));
        // clamp ayah if out of range
        const ayahNum = Number.parseInt(form.ayah, 10);
        if (!Number.isFinite(ayahNum) || ayahNum < 1 || ayahNum > count) {
          setForm((prev) => ({ ...prev, ayah: String(Math.min(Math.max(1, ayahNum || 1), count)) }));
        }
      } finally {
        if (isMounted) {
          setAyahLoading(false);
        }
      }
    };
    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }
    fetchDebounceRef.current = setTimeout(() => {
      void loadAyahs();
    }, 200);
    return () => {
      isMounted = false;
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }
    };
  }, [form.surah, form.locale, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("surah", form.surah);
    params.set("ayah", form.ayah);
    params.set("locale", form.locale);
    if (form.source) {
      params.set("source", form.source);
    } else {
      params.delete("source");
    }
    router.replace(`/dashboard/tafsir?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.surah, form.ayah, form.locale, form.source, hydrated]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  const handleFieldChange = useCallback(<K extends keyof TafsirFormState>(key: K, value: TafsirFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const surah = Number.parseInt(form.surah, 10);
        const ayah = Number.parseInt(form.ayah, 10);
        if (!Number.isFinite(surah) || !Number.isFinite(ayah) || surah <= 0 || ayah <= 0) {
          throw new Error("Veuillez fournir un numéro de sourate et de verset valides.");
        }

        const response = await tafsirApi.getTafsir({
          surah,
          ayah,
          locale: form.locale,
          source: form.source,
        });
        setResult(response);
        setShowToast("Tafsir chargé.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de récupérer le tafsir.";
        setError(message);
        setResult(null);
        setShowToast(message);
      } finally {
        setLoading(false);
      }
    },
    [form.surah, form.ayah, form.locale, form.source],
  );

  if (authLoading) {
    return (
      <div style={fullPageFallbackStyle}>
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
            <h2 style={sectionTitleStyle}>Tafsir du Coran</h2>
            <p style={sectionSubtitleStyle}>
              Choisis une sourate et un verset pour consulter un tafsir authentique. Sélectionne une source précise ou
              laisse “Automatique” pour un choix adapté à ta langue.
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} style={formGridStyle}>
          <label style={fieldLabelStyle}>
            Sourate
            {surahLoading ? (
              <div style={skeletonInputStyle} aria-hidden />
            ) : (
              <select
                value={form.surah}
                onChange={(event) => handleFieldChange("surah", event.target.value)}
                style={inputStyle}
                disabled={surahLoading}
              >
                {surahs.map((surah) => (
                  <option key={surah.id} value={surah.id}>
                    {surah.id}. {surah.name} ({surah.nameArabic}) — {surah.versesCount} versets
                  </option>
                ))}
              </select>
            )}
          </label>
          <label style={fieldLabelStyle}>
            Verset
            {ayahLoading ? (
              <div style={skeletonInputStyle} aria-hidden />
            ) : (
              <select
                value={form.ayah}
                onChange={(event) => handleFieldChange("ayah", event.target.value)}
                style={inputStyle}
                disabled={ayahLoading || ayahOptions.length === 0}
              >
                {ayahOptions.map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label style={fieldLabelStyle}>
            Langue
            <select
              value={form.locale}
              onChange={(event) => handleFieldChange("locale", event.target.value as Locale)}
              style={inputStyle}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </label>
          <label style={fieldLabelStyle}>
            Source
            <select
              value={form.source ?? ""}
              onChange={(event) => handleFieldChange("source", event.target.value || undefined)}
              style={inputStyle}
            >
              <option value="">Automatique</option>
              {sources.map((source) => (
                <option key={source.key} value={source.key}>
                  {source.name}
                  {source.author ? ` — ${source.author}` : ""}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={loading} style={submitButtonStyle}>
            {loading ? "Chargement…" : "Afficher le tafsir"}
          </button>
        </form>

        {error && <p style={{ color: "#ffb4ab" }}>{error}</p>}

        {loading && (
          <article style={skeletonCardStyle} aria-hidden>
            <div style={{ ...skeletonLineStyle, width: "35%" }} />
            <div style={{ ...skeletonLineStyle, width: "55%" }} />
            <div style={{ ...skeletonLineStyle, width: "95%", height: 14 }} />
            <div style={{ ...skeletonLineStyle, width: "90%", height: 14 }} />
            <div style={{ ...skeletonLineStyle, width: "80%", height: 14 }} />
          </article>
        )}
        {!loading && result && (
          <article style={tafsirCardStyle}>
            <header style={tafsirHeaderStyle}>
              <div>
                <p style={tafsirBadgeStyle}>
                  Sourate {result.surah} · Verset {result.ayah}
                </p>
                <p style={tafsirSourceStyle}>Source: {result.source}</p>
              </div>
            </header>
            <p style={tafsirTextStyle}>{result.text}</p>
          </article>
        )}
      </section>
      {showToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "rgba(0,0,0,0.8)",
            color: colors.neutral100,
            padding: "10px 14px",
            borderRadius: 12,
            fontSize: 13,
            boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
          }}
        >
          {showToast}
          <button
            onClick={() => setShowToast(null)}
            style={{
              marginLeft: 8,
              background: "transparent",
              border: "none",
              color: colors.neutral100,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

const containerStyle: CSSProperties = {
  maxWidth: 940,
  margin: "0 auto",
  display: "grid",
  gap: spacing.lg,
};

const sectionStyle: CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.35)",
  borderRadius: spacing.lg,
  padding: `${spacing.lg * 1.5}px`,
  border: "1px solid rgba(255,255,255,0.12)",
  display: "grid",
  gap: spacing.lg,
};

const sectionHeaderStyle: CSSProperties = {
  display: "grid",
  gap: spacing.xs,
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

const formGridStyle: CSSProperties = {
  display: "grid",
  gap: spacing.sm,
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  alignItems: "flex-end",
};

const fieldLabelStyle: CSSProperties = {
  display: "grid",
  gap: spacing.xs,
  fontSize: 14,
  opacity: 0.9,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: spacing.md,
  border: "1px solid rgba(0,0,0,0.12)",
  backgroundColor: "rgba(255,252,248,0.94)",
  color: colors.neutral900,
  fontSize: 15,
  outline: "none",
};

const submitButtonStyle: CSSProperties = {
  padding: `${spacing.sm}px ${spacing.lg}px`,
  borderRadius: spacing.md,
  backgroundColor: colors.neutral100,
  color: colors.primary,
  fontWeight: 700,
  border: "none",
};

const tafsirCardStyle: CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.45)",
  borderRadius: spacing.lg,
  padding: `${spacing.lg}px`,
  display: "grid",
  gap: spacing.sm,
};

const tafsirHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: spacing.sm,
};

const tafsirBadgeStyle: CSSProperties = {
  textTransform: "uppercase",
  fontSize: 12,
  letterSpacing: 2,
  opacity: 0.8,
};

const tafsirSourceStyle: CSSProperties = {
  fontSize: 14,
  opacity: 0.9,
};

const skeletonInputStyle: CSSProperties = {
  width: "100%",
  height: 46,
  borderRadius: spacing.md,
  background: "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.16), rgba(255,255,255,0.08))",
  backgroundSize: "200% 100%",
  animation: "pulse 1.6s ease-in-out infinite",
  border: "1px solid rgba(255,255,255,0.08)",
};

const skeletonCardStyle: CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.35)",
  borderRadius: spacing.lg,
  padding: `${spacing.lg}px`,
  display: "grid",
  gap: spacing.xs,
};

const skeletonLineStyle: CSSProperties = {
  height: 10,
  borderRadius: 8,
  background: "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.16), rgba(255,255,255,0.08))",
  backgroundSize: "200% 100%",
  animation: "pulse 1.6s ease-in-out infinite",
};

// keyframes fallback for inline styles
const styleSheet =
  typeof document !== "undefined" ? document.styleSheets[0] : null;
if (styleSheet && typeof styleSheet.insertRule === "function") {
  try {
    styleSheet.insertRule(
      "@keyframes pulse {0% {background-position: 200% 0;} 50% {background-position: 100% 0;} 100% {background-position: -200% 0;}}",
      styleSheet.cssRules.length,
    );
  } catch {
    // ignore if already inserted or not allowed
  }
}

const tafsirTextStyle: CSSProperties = {
  fontSize: 16,
  lineHeight: 1.7,
  color: colors.neutral100,
};

const fullPageFallbackStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.primary,
  color: colors.neutral100,
};
