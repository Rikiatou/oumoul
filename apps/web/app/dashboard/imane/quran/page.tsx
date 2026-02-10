"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { colors, spacing } from "@oumoul/ui";
import { useAuth } from "@/context/auth-context";
import { quranApi, tafsirApi } from "@/lib/api";

interface Surah {
  id: number;
  nameArabic: string;
  nameSimple: string;
  nameTranslated: string | null;
  versesCount: number;
  revelationPlace: string;
}

interface Verse {
  verseNumber: number;
  textArabic: string;
  textTranslated: string | null;
}

export default function ImaneQuranPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [tafSirLoading, setTafsirLoading] = useState(false);
  const [selectedTafsirAyah, setSelectedTafsirAyah] = useState<number | null>(null);
  const [tafSirText, setTafsirText] = useState<string | null>(null);
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [reciter, setReciter] = useState<string>("mishary");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const fetchSurahs = async () => {
      setLoadingSurahs(true);
      setError(null);
      try {
        const data = await quranApi.listSurahs(language);
        setSurahs(data.surahs);
        if (data.surahs.length > 0) {
          setSelectedSurahId(data.surahs[0].id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de charger la liste des sourates.";
        setError(message);
      } finally {
        setLoadingSurahs(false);
      }
    };

    if (!loading && user) {
      void fetchSurahs();
    }
  }, [loading, user, language]);

  const handleShowTafsir = useCallback(
    async (surahId: number, ayahNumber: number) => {
      setTafsirLoading(true);
      setSelectedTafsirAyah(ayahNumber);
      setError(null);
      try {
        const data = await tafsirApi.getTafsir({ surah: surahId, ayah: ayahNumber, locale: language });
        setTafsirText(data.text);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de charger le résumé.";
        setError(message);
        setTafsirText(null);
      } finally {
        setTafsirLoading(false);
      }
    },
    [language],
  );

  const loadVerses = useCallback(async (surahId: number, lang: "fr" | "en") => {
    setLoadingVerses(true);
    setError(null);
    try {
      const data = await quranApi.getSurah(surahId, lang);
      setVerses(data.verses);
      const ayahParam = searchParams.get("ayah");
      if (ayahParam && !Number.isNaN(Number(ayahParam))) {
        const ayahNumber = Number(ayahParam);
        if (ayahNumber > 0) {
          await handleShowTafsir(surahId, ayahNumber);
        }
      } else {
        setSelectedTafsirAyah(null);
        setTafsirText(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger les versets.";
      setError(message);
      setVerses([]);
    } finally {
      setLoadingVerses(false);
    }
  }, [handleShowTafsir, searchParams]);

  useEffect(() => {
    if (!user) return;
    if (selectedSurahId === null) return;
    void loadVerses(selectedSurahId, language);
  }, [user, selectedSurahId, language, loadVerses]);

  // Initialiser la sourate depuis les query params si possible
  useEffect(() => {
    const surahParam = searchParams.get("surah");
    if (surahParam) {
      const surahId = Number(surahParam);
      if (!Number.isNaN(surahId) && surahs.some((s) => s.id === surahId)) {
        setSelectedSurahId(surahId);
      }
    }
  }, [searchParams, surahs]);

  const loadAudio = useCallback(
    async (surahId: number, currentReciter: string) => {
      setAudioLoading(true);
      try {
        const data = await quranApi.getSurahAudio(surahId, currentReciter);
        setAudioUrl(data.audioUrl);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de charger l’audio.";
        setError(message);
        setAudioUrl(null);
      } finally {
        setAudioLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedSurahId !== null && user) {
      void loadAudio(selectedSurahId, reciter);
    }
  }, [selectedSurahId, reciter, user, loadAudio]);

  const handleSelectSurah = (surahId: number) => {
    setSelectedSurahId(surahId);
    setSelectedTafsirAyah(null);
    setTafsirText(null);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("surah", String(surahId));
    nextParams.delete("ayah");
    router.replace(`/dashboard/imane/quran?${nextParams.toString()}`);
  };

  if (loading || (!user && !loading)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primary,
          color: colors.neutral100,
        }}
      >
        <p>Chargement…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <section style={introSectionStyle}>
        <span style={badgeStyle}>Coran & tafsir</span>
        <h1 style={titleStyle}>Parcourir le Coran en douceur</h1>
        <p style={subtitleStyle}>
          Choisis une sourate pour lire le Coran en arabe avec une traduction simplifiée, et ouvre le tafsir d’un verset en un
          clic pour mieux le comprendre.
        </p>
        <div style={audioBarStyle}>
          <div style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 13, color: "rgba(0,0,0,0.75)" }}>Langue de la traduction</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as "fr" | "en")}
              style={reciterSelectStyle}
            >
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
            </select>
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 13, color: "rgba(0,0,0,0.75)" }}>Récitateur</span>
            <select
              value={reciter}
              onChange={(event) => setReciter(event.target.value)}
              style={reciterSelectStyle}
            >
              <option value="mishary">Mishary Rashid Alafasy</option>
              <option value="sudais">Abdul Rahman Al-Sudais</option>
              <option value="minshawi">Mohamed Siddiq Al-Minshawi</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, color: "rgba(0,0,0,0.75)" }}>Audio de la sourate sélectionnée</span>
            <div style={audioPlayerWrapperStyle}>
              {audioUrl && !audioLoading ? (
                <audio controls style={audioElementStyle} src={audioUrl}>
                  Votre navigateur ne supporte pas la lecture audio.
                </audio>
              ) : (
                <p style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", margin: 0 }}>
                  {audioLoading ? "Chargement de l’audio…" : "Sélectionne une sourate pour écouter sa récitation."}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section style={mainSectionStyle}>
        <div style={surahListSectionStyle}>
          <h2 style={subTitleStyle}>Sourates</h2>
          {loadingSurahs ? (
            <p style={infoTextStyle}>Chargement des sourates…</p>
          ) : surahs.length === 0 ? (
            <p style={infoTextStyle}>Aucune sourate trouvée pour le moment.</p>
          ) : (
            <div style={surahListStyle}>
              {surahs.map((surah) => {
                const isActive = surah.id === selectedSurahId;
                return (
                  <button
                    key={surah.id}
                    type="button"
                    onClick={() => handleSelectSurah(surah.id)}
                    style={{
                      ...surahItemStyle,
                      borderColor: isActive ? "#D4AF37" : "rgba(0,0,0,0.06)",
                      backgroundColor: isActive ? "rgba(212,175,55,0.08)" : colors.neutral200,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <span style={{ fontSize: 13, color: "rgba(0,0,0,0.6)" }}>Sourate {surah.id}</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#2F5F3A" }}>{surah.nameSimple}</span>
                        <span style={{ fontSize: 13, color: "rgba(0,0,0,0.7)" }}>{surah.nameArabic}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 12, color: "rgba(0,0,0,0.6)" }}>
                          {surah.revelationPlace === "makkah" ? "Makkiyah" : "Madaniyah"}
                        </span>
                        <div style={{ fontSize: 12, color: "rgba(0,0,0,0.75)" }}>{surah.versesCount} versets</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={versesSectionStyle}>
          <h2 style={subTitleStyle}>Versets</h2>
          {error && <p style={{ color: "#D32F2F", fontSize: 13 }}>{error}</p>}
          {loadingVerses ? (
            <p style={infoTextStyle}>Chargement des versets…</p>
          ) : verses.length === 0 ? (
            <p style={infoTextStyle}>Sélectionne une sourate pour afficher ses versets.</p>
          ) : (
            <div style={versesListStyle}>
              {verses.map((verse) => (
                <div key={verse.verseNumber} style={verseItemStyle}>
                  <div style={verseHeaderStyle}>
                    <span style={verseNumberStyle}>Verset {verse.verseNumber}</span>
                    {selectedSurahId !== null && (
                      <button
                        type="button"
                        onClick={() => void handleShowTafsir(selectedSurahId, verse.verseNumber)}
                        style={tafSirButtonStyle}
                        disabled={tafSirLoading && selectedTafsirAyah === verse.verseNumber}
                      >
                        {tafSirLoading && selectedTafsirAyah === verse.verseNumber
                          ? "Chargement du résumé…"
                          : "Voir résumé"}
                      </button>
                    )}
                  </div>
                  <p style={verseArabicStyle}>{verse.textArabic}</p>
                  {verse.textTranslated && <p style={verseTranslationStyle}>{verse.textTranslated}</p>}
                  {selectedTafsirAyah === verse.verseNumber && tafSirText && (
                    <div style={tafSirBoxStyle}>
                      <div 
                        style={tafSirContentStyle}
                        dangerouslySetInnerHTML={{ 
                          __html: tafSirText
                            .replace(/\n\n+/g, '</p><p>')
                            .replace(/\n/g, '<br />')
                            .replace(/^/, '<p>')
                            .replace(/$/, '</p>')
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/dashboard/imane/program?from=quran&surah=${selectedSurahId ?? ""}&ayah=${verse.verseNumber}`,
                          )
                        }
                        style={openProgramButtonStyle}
                      >
                        Ouvrir ton programme Imane
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const containerStyle: CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  display: "grid",
  gap: spacing.lg,
};

const introSectionStyle: CSSProperties = {
  backgroundColor: "rgba(255,252,248,0.94)",
  borderRadius: spacing.lg,
  padding: `${spacing.lg * 1.5}px`,
  boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
  border: "1px solid rgba(0,0,0,0.04)",
  color: colors.neutral900,
  display: "grid",
  gap: spacing.sm,
};

const badgeStyle: CSSProperties = {
  fontSize: 13,
  letterSpacing: 3,
  textTransform: "uppercase",
  color: "#2F5F3A",
  fontWeight: 600,
};

const titleStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  margin: 0,
  color: colors.primaryDark,
};

const subtitleStyle: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "#1F4D3B",
  margin: 0,
};

const audioBarStyle: CSSProperties = {
  marginTop: spacing.md,
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.md,
  alignItems: "flex-end",
};

const reciterSelectStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: spacing.md,
  border: "1px solid rgba(0,0,0,0.12)",
  backgroundColor: colors.neutral200,
  fontSize: 14,
};

const audioPlayerWrapperStyle: CSSProperties = {
  marginTop: 4,
  borderRadius: spacing.md,
  border: "1px solid rgba(0,0,0,0.08)",
  backgroundColor: colors.neutral200,
  padding: `${spacing.xs}px ${spacing.sm}px`,
};

const audioElementStyle: CSSProperties = {
  width: "100%",
};

const mainSectionStyle: CSSProperties = {
  backgroundColor: "rgba(255,252,248,0.94)",
  borderRadius: spacing.lg,
  padding: `${spacing.lg * 1.5}px`,
  boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
  border: "1px solid rgba(0,0,0,0.04)",
  color: colors.neutral900,
  display: "grid",
  gap: spacing.lg,
  gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 2fr)",
};

const surahListSectionStyle: CSSProperties = {
  display: "grid",
  gap: spacing.sm,
};

const subTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  margin: 0,
  color: colors.primaryDark,
};

const infoTextStyle: CSSProperties = {
  fontSize: 13,
  color: "rgba(0,0,0,0.7)",
};

const surahListStyle: CSSProperties = {
  display: "grid",
  gap: spacing.sm,
  maxHeight: 420,
  overflowY: "auto",
};

const surahItemStyle: CSSProperties = {
  borderRadius: spacing.md,
  border: "1px solid rgba(0,0,0,0.06)",
  padding: `${spacing.sm * 1.1}px ${spacing.sm * 1.2}px`,
  backgroundColor: colors.neutral200,
  cursor: "pointer",
};

const versesSectionStyle: CSSProperties = {
  display: "grid",
  gap: spacing.sm,
};

const versesListStyle: CSSProperties = {
  display: "grid",
  gap: spacing.sm,
  maxHeight: 420,
  overflowY: "auto",
};

const verseItemStyle: CSSProperties = {
  borderRadius: spacing.md,
  border: "1px solid rgba(0,0,0,0.06)",
  padding: `${spacing.sm * 1.1}px ${spacing.sm * 1.2}px`,
  backgroundColor: "rgba(255,252,248,0.94)",
  display: "grid",
  gap: spacing.xs,
};

const verseHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const verseNumberStyle: CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 2,
  color: "rgba(0,0,0,0.6)",
};

const verseArabicStyle: CSSProperties = {
  fontSize: 24,
  lineHeight: 1.9,
  textAlign: "right",
  color: "#2F2F2F",
};

const verseTranslationStyle: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "rgba(0,0,0,0.8)",
};

const openProgramButtonStyle: CSSProperties = {
  marginTop: spacing.xs,
  padding: `${spacing.xs}px ${spacing.sm * 1.4}px`,
  borderRadius: spacing.md,
  border: "1px solid rgba(0,0,0,0.16)",
  backgroundColor: colors.neutral200,
  fontSize: 12,
  cursor: "pointer",
};

const tafSirButtonStyle: CSSProperties = {
  padding: `${spacing.xs}px ${spacing.sm}px`,
  borderRadius: spacing.md,
  border: "1px solid rgba(0,0,0,0.14)",
  backgroundColor: "rgba(47,95,58,0.08)",
  color: colors.primaryDark,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const tafSirBoxStyle: CSSProperties = {
  marginTop: spacing.xs,
  padding: `${spacing.md}px`,
  borderRadius: spacing.md,
  border: "1px solid rgba(0,0,0,0.08)",
  backgroundColor: "rgba(248,246,242,0.95)",
  display: "grid",
  gap: spacing.sm,
};

const tafSirContentStyle: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.8,
  color: "rgba(0,0,0,0.9)",
};

const tafSirHtmlStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.7,
  color: "rgba(0,0,0,0.85)",
};
