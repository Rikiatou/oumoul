import { HttpClient } from '../http-client';

export interface AIRecommendationRemote {
  id: string;
  type: 'prayer' | 'quran' | 'dhikr' | 'fasting' | 'hifz' | 'general';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  timeSuggestion: string;
  basedOn: string;
}

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

export interface AIAnalysisResult {
  context: SpiritualContext;
  recommendations: AIRecommendationRemote[];
  overallScore: number;
  lastAnalysisAt: string;
}

export function createAiApi(client: HttpClient) {
  return {
    analyze(mood?: string) {
      return client.request<AIAnalysisResult>('/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({ mood: mood ?? 'focused' }),
      });
    },

    getRecommendations() {
      return client.request<AIAnalysisResult>('/ai/recommendations', {
        method: 'GET',
      });
    },
  };
}
