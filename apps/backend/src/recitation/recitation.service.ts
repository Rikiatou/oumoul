import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';

export interface RecitationResult {
  transcription: string;
  score: number; // 0–100
  feedback: string[];
  wordMatches: Array<{ expected: string; got: string; correct: boolean }>;
}

// Transliteration to phoneme mapping for basic Arabic phoneme comparison
const ARABIC_SUBS: [RegExp, string][] = [
  [/ā/g, 'a'], [/ī/g, 'i'], [/ū/g, 'u'],
  [/ḥ/g, 'h'], [/ẖ/g, 'kh'], [/ḍ/g, 'd'], [/ṭ/g, 't'], [/ẓ/g, 'z'],
  [/ṣ/g, 's'], [/ḡ/g, 'gh'], [/[''ʾʿ]/g, ''],
  [/[^a-z ]/g, ''],
];

function normalizeTranslit(text: string): string {
  let t = text.toLowerCase();
  for (const [pat, rep] of ARABIC_SUBS) t = t.replace(pat, rep);
  return t.replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function phoneticScore(expected: string, got: string): number {
  const e = normalizeTranslit(expected);
  const g = normalizeTranslit(got);
  if (!e || !g) return 0;
  const dist = levenshtein(e, g);
  const maxLen = Math.max(e.length, g.length);
  return Math.round(((maxLen - dist) / maxLen) * 100);
}

function buildFeedback(score: number, wordMatches: RecitationResult['wordMatches']): string[] {
  const fb: string[] = [];
  if (score >= 90) {
    fb.push("✅ Excellente récitation — Masha'Allah !");
    fb.push('💡 Travaille les règles du tajwid avancées pour encore plus de précision.');
  } else if (score >= 70) {
    fb.push('👍 Bonne récitation, quelques points à améliorer.');
    const wrong = wordMatches.filter((w) => !w.correct).map((w) => w.expected).slice(0, 3);
    if (wrong.length) fb.push(`📌 Mots à retravailler : ${wrong.join(', ')}`);
    fb.push('📌 Écoute un récitateur et compare mot par mot.');
  } else {
    fb.push('💪 Continue ! La régularité fait le maître.');
    fb.push("📌 Écoute d'abord lentement, puis imite.");
    fb.push('📌 Pratique verset par verset.');
  }
  return fb;
}

@Injectable()
export class RecitationService {
  private readonly logger = new Logger(RecitationService.name);
  private readonly openaiKey: string;

  constructor(private readonly config: ConfigService) {
    this.openaiKey = this.config.get<string>('OPENAI_API_KEY') ?? '';
  }

  async checkRecitation(
    audioBuffer: Buffer,
    mimeType: string,
    referenceTranslit: string,
  ): Promise<RecitationResult> {
    if (!this.openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // 1. Transcribe with Whisper
    const form = new FormData();
    form.append('file', audioBuffer, { filename: 'recitation.m4a', contentType: mimeType });
    form.append('model', 'whisper-1');
    form.append('language', 'ar');
    form.append('response_format', 'text');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openaiKey}`,
        ...form.getHeaders(),
      },
      body: form as unknown as BodyInit,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      throw new Error(`Whisper error: ${err}`);
    }

    const transcription = (await whisperRes.text()).trim();

    // 2. Phonetic scoring: compare Whisper output (Arabic) against reference transliteration
    // Strategy: Whisper gives Arabic text; convert reference transliteration to normalised form
    // then score normalised Arabic word by word
    const refWords = referenceTranslit.split(/\s+/);
    const gotWords = transcription.split(/\s+/);

    const wordMatches: RecitationResult['wordMatches'] = refWords.map((ref, i) => {
      const got = gotWords[i] ?? '';
      const ws = phoneticScore(ref, got);
      return { expected: ref, got, correct: ws >= 70 };
    });

    const score = phoneticScore(referenceTranslit, transcription);

    return {
      transcription,
      score,
      feedback: buildFeedback(score, wordMatches),
      wordMatches,
    };
  }
}
