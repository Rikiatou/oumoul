import { apiRoutes } from '@oumoul/config';
import { HttpClient } from '../http-client';
import type {
  CreateFastingLogPayload,
  FastingLog,
  FastingSummary,
  GetFastingLogsQuery,
  MakeupPlan,
  MakeupPlanEntry,
  PlanEntryStatus,
  UpdateFastingLogPayload,
  UpdatePlanEntryPayload,
} from '../types';
import { buildQuery } from '../utils';

export function createFastingApi(client: HttpClient) {
  const base = `${apiRoutes.backend.fasting}`;

  return {
    summary() {
      return client.request<FastingSummary>(`${base}/summary`, { method: 'GET' });
    },
    listLogs(query?: GetFastingLogsQuery) {
      const q = buildQuery(query ?? {});
      return client.request<FastingLog[]>(`${base}/logs${q}`, { method: 'GET' });
    },
    upsertLog(payload: CreateFastingLogPayload) {
      return client.request<FastingLog>(`${base}/logs`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateLog(id: string, payload: UpdateFastingLogPayload) {
      return client.request<FastingLog>(`${base}/logs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    deleteLog(id: string) {
      return client.request<{ deleted: boolean }>(`${base}/logs/${id}`, {
        method: 'DELETE',
      });
    },
    getActivePlan() {
      return client.request<(MakeupPlan & { entries?: MakeupPlanEntry[] }) | null>(`${base}/plans/active`, {
        method: 'GET',
      });
    },
    createPlan(payload: { strategy: MakeupPlan['strategy']; title?: string; startDate?: string; targetDays: number; scheduledDates?: string[] }) {
      return client.request<MakeupPlan & { entries: MakeupPlanEntry[] }>(`${base}/plans`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updatePlanEntry(planId: string, entryId: string, payload: UpdatePlanEntryPayload) {
      return client.request<MakeupPlanEntry>(`${base}/plans/${planId}/entries/${entryId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    deactivatePlan(planId: string) {
      return client.request<MakeupPlan>(`${base}/plans/${planId}/deactivate`, {
        method: 'PATCH',
      });
    },
  } as const;
}
