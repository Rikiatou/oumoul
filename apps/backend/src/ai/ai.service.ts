import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface SpiritualContext {
  prayerStreakDays: number;
  prayerOnTimePercent: number;
  prayedLast7Days: number;
  hifzTotal: number;
  hifzDueToday: number;
  hifzMastered: number;
  dhikrSessionsLast7Days: number;
  fastingDaysThisRamadan: number;
  imaneProgramCompletionPercent: number;
  mood: string;
}

export interface AIRecommendation {
  id: string;
  type: 'prayer' | 'quran' | 'dhikr' | 'fasting' | 'hifz' | 'general';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  timeSuggestion: string;
  basedOn: string;
}

export interface AIAnalysisResult {
  context: SpiritualContext;
  recommendations: AIRecommendation[];
  overallScore: number;
  lastAnalysisAt: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openaiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.openaiKey = this.config.get<string>('OPENAI_API_KEY') ?? '';
  }

  async analyze(userId: string, mood: string): Promise<AIAnalysisResult> {
    const context = await this.buildContext(userId, mood);
    const overallScore = this.computeScore(context);

    let recommendations: AIRecommendation[];

    if (this.openaiKey) {
      try {
        recommendations = await this.getOpenAIRecommendations(context, mood);
      } catch (err) {
        this.logger.warn(`OpenAI call failed, using rule-based: ${(err as Error).message}`);
        recommendations = this.getRuleBasedRecommendations(context);
      }
    } else {
      recommendations = this.getRuleBasedRecommendations(context);
    }

    return {
      context,
      recommendations,
      overallScore,
      lastAnalysisAt: new Date().toISOString(),
    };
  }

  private async buildContext(userId: string, mood: string): Promise<SpiritualContext> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date();

    // Prayer stats — last 7 days
    const prayerLogs = await this.prisma.prayerLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
    });
    const totalPossible = 35; // 5 prayers * 7 days
    const onTime = prayerLogs.filter((l) => l.status === 'PRAYED_ON_TIME').length;
    const prayed = prayerLogs.filter(
      (l) => l.status === 'PRAYED_ON_TIME' || l.status === 'PRAYED_LATE',
    ).length;
    const prayerOnTimePercent = totalPossible > 0 ? Math.round((onTime / totalPossible) * 100) : 0;

    // Streak
    const byDate = new Map<string, typeof prayerLogs>();
    for (const log of prayerLogs) {
      const key = log.date.toISOString().slice(0, 10);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(log);
    }
    let prayerStreakDays = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayLogs = byDate.get(key) ?? [];
      const prayedCount = dayLogs.filter(
        (l) => l.status === 'PRAYED_ON_TIME' || l.status === 'PRAYED_LATE',
      ).length;
      if (prayedCount === 5) prayerStreakDays++;
      else if (i > 0) break;
    }

    // Hifz stats
    const hifzEntries = await this.prisma.hifzEntry.findMany({ where: { userId } });
    const hifzTotal = hifzEntries.length;
    const hifzDueToday = hifzEntries.filter((e) => new Date(e.nextReview) <= today).length;
    const hifzMastered = hifzEntries.filter((e) => e.repetitions >= 5).length;

    // Dhikr sessions last 7 days
    const dhikrRecords = await this.prisma.dhikrRecord.findMany({
      where: { userId, notedAt: { gte: sevenDaysAgo } },
    });
    const dhikrSessionsLast7Days = dhikrRecords.length;

    // Fasting this year
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const fastingLogs = await this.prisma.fastingLog.findMany({
      where: { userId, date: { gte: yearStart }, status: 'FASTED' },
    });
    const fastingDaysThisRamadan = fastingLogs.length;

    // Imane program completion (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const imaneDays = await this.prisma.imaneProgramDay.findMany({
      where: { userId, date: { gte: thirtyDaysAgo } },
    });
    const completedImane = imaneDays.filter(
      (d) => d.coranTilawa && d.dhikrMatinSoir && d.duasPersonnelles,
    ).length;
    const imaneProgramCompletionPercent =
      imaneDays.length > 0 ? Math.round((completedImane / imaneDays.length) * 100) : 0;

    return {
      prayerStreakDays,
      prayerOnTimePercent,
      prayedLast7Days: prayed,
      hifzTotal,
      hifzDueToday,
      hifzMastered,
      dhikrSessionsLast7Days,
      fastingDaysThisRamadan,
      imaneProgramCompletionPercent,
      mood,
    };
  }

  private computeScore(ctx: SpiritualContext): number {
    let score = 0;
    score += Math.min(40, ctx.prayerOnTimePercent * 0.4); // 40pts max
    score += Math.min(20, (ctx.prayedLast7Days / 35) * 20); // 20pts max
    score += ctx.hifzMastered > 0 ? Math.min(15, ctx.hifzMastered * 2) : 0; // 15pts max
    score += Math.min(15, ctx.dhikrSessionsLast7Days * 2); // 15pts max
    score += Math.min(10, ctx.imaneProgramCompletionPercent * 0.1); // 10pts max
    return Math.round(score);
  }

  private async getOpenAIRecommendations(
    ctx: SpiritualContext,
    mood: string,
  ): Promise<AIRecommendation[]> {
    const systemPrompt = `Tu es un conseiller islamique bienveillant et expert. 
Tu analyses les données de pratique spirituelle d'une musulmane et tu génères des recommandations personnalisées, précises et actionnables.
Réponds UNIQUEMENT en JSON valide, un tableau de 3-4 recommandations.
Format: [{"id":"string","type":"prayer|quran|dhikr|fasting|hifz|general","title":"string","description":"string","priority":"high|medium|low","timeSuggestion":"HH:MM","basedOn":"explication courte des données qui ont motivé cette recommandation"}]`;

    const userPrompt = `Voici les données réelles de cette utilisatrice cette semaine:
- Prières à l'heure: ${ctx.prayerOnTimePercent}%
- Prières accomplies sur 35 possibles: ${ctx.prayedLast7Days}
- Série consécutive (jours où toutes 5 prières faites): ${ctx.prayerStreakDays} jours
- Versets en Hifz: ${ctx.hifzTotal} entrées (${ctx.hifzMastered} maîtrisés, ${ctx.hifzDueToday} dus aujourd'hui)
- Sessions dhikr cette semaine: ${ctx.dhikrSessionsLast7Days}
- Jours de jeûne cette année: ${ctx.fastingDaysThisRamadan}
- Programme Imane complété à: ${ctx.imaneProgramCompletionPercent}%
- État actuel: ${mood}

Génère 3-4 recommandations concrètes basées sur ces données réelles.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]?.message?.content ?? '[]';
    const parsed = JSON.parse(content) as { recommendations?: AIRecommendation[] } | AIRecommendation[];
    const recs = Array.isArray(parsed) ? parsed : (parsed.recommendations ?? []);
    return recs.slice(0, 4);
  }

  private getRuleBasedRecommendations(ctx: SpiritualContext): AIRecommendation[] {
    const recs: AIRecommendation[] = [];

    // Prayer recommendation based on real data
    if (ctx.prayerOnTimePercent < 60) {
      recs.push({
        id: 'prayer-improvement',
        type: 'prayer',
        title: 'Améliore tes prières à l\'heure',
        description: `Tu pries à l'heure ${ctx.prayerOnTimePercent}% du temps cette semaine. Active les rappels Adhan pour chaque prière.`,
        priority: 'high',
        timeSuggestion: '05:30',
        basedOn: `${ctx.prayerOnTimePercent}% de prières à l'heure cette semaine`,
      });
    } else if (ctx.prayerStreakDays >= 5) {
      recs.push({
        id: 'prayer-excellence',
        type: 'prayer',
        title: 'Maintiens ta série de prières 🔥',
        description: `${ctx.prayerStreakDays} jours consécutifs de prières complètes — Masha'Allah ! Continue avec les sunnah.`,
        priority: 'medium',
        timeSuggestion: '05:30',
        basedOn: `${ctx.prayerStreakDays} jours de prières complètes`,
      });
    }

    // Hifz recommendation
    if (ctx.hifzDueToday > 0) {
      recs.push({
        id: 'hifz-review',
        type: 'hifz',
        title: `${ctx.hifzDueToday} versets à réviser aujourd'hui`,
        description: `Ne laisse pas tes révisions s'accumuler. 10 minutes suffisent pour ${ctx.hifzDueToday} verset${ctx.hifzDueToday > 1 ? 's' : ''}.`,
        priority: 'high',
        timeSuggestion: '20:00',
        basedOn: `${ctx.hifzDueToday} entrées Hifz dues aujourd'hui`,
      });
    } else if (ctx.hifzTotal === 0) {
      recs.push({
        id: 'hifz-start',
        type: 'hifz',
        title: 'Commence la mémorisation',
        description: 'Commence par Al-Ikhlas (3 versets). 5 minutes par jour suffisent.',
        priority: 'medium',
        timeSuggestion: '19:30',
        basedOn: 'Aucun verset en cours de mémorisation',
      });
    }

    // Dhikr recommendation
    if (ctx.dhikrSessionsLast7Days < 5) {
      recs.push({
        id: 'dhikr-morning',
        type: 'dhikr',
        title: 'Dhikr du matin à régulariser',
        description: `Seulement ${ctx.dhikrSessionsLast7Days} sessions dhikr cette semaine. Vise 1 session par jour.`,
        priority: ctx.dhikrSessionsLast7Days === 0 ? 'high' : 'medium',
        timeSuggestion: '07:00',
        basedOn: `${ctx.dhikrSessionsLast7Days} sessions dhikr en 7 jours`,
      });
    }

    // Imane program
    if (ctx.imaneProgramCompletionPercent < 50 && ctx.imaneProgramCompletionPercent > 0) {
      recs.push({
        id: 'imane-boost',
        type: 'general',
        title: 'Programme Imane à compléter',
        description: `Tu complètes ${ctx.imaneProgramCompletionPercent}% du programme. Coche au moins Coran + Dhikr chaque jour.`,
        priority: 'medium',
        timeSuggestion: '21:00',
        basedOn: `${ctx.imaneProgramCompletionPercent}% de complétion Programme Imane`,
      });
    }

    return recs.slice(0, 4);
  }
}
