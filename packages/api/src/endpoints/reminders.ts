import { apiRoutes } from '@oumoul/config';
import { HttpClient } from '../http-client';
import type { ReminderPreference, ReminderPreferenceListItem, ReminderType, UpdateReminderPreferencePayload } from '../types';

export function createRemindersApi(client: HttpClient) {
  const base = `${apiRoutes.backend.reminders}`;

  return {
    listPreferences() {
      return client.request<ReminderPreferenceListItem[]>(`${base}/preferences`, {
        method: 'GET',
      });
    },
    updatePreference(type: ReminderType, payload: UpdateReminderPreferencePayload) {
      return client.request<ReminderPreference>(`${base}/preferences/${type}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
  } as const;
}
