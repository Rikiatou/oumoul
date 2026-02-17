import { HttpClient } from '../http-client';
import { apiRoutes } from '@oumoul/config';
import { AllahName, NameMemorizationProgress } from '../types-additions';

export function createAllahNamesApi(client: HttpClient) {
  const base = `${apiRoutes.backend.allahNames ?? '/allah-names'}`;

  return {
    // Get all 99 names of Allah
    getNames() {
      return client.request<AllahName[]>(`${base}`, {
        method: 'GET',
      });
    },

    // Get specific name with details
    getName(id: string) {
      return client.request<AllahName>(`${base}/${id}`, {
        method: 'GET',
      });
    },

    // Get user's memorization progress
    getProgress() {
      return client.request<NameMemorizationProgress[]>(`${base}/progress`, {
        method: 'GET',
      });
    },

    // Update memorization progress
    updateProgress(nameId: string, memorized: boolean) {
      return client.request<NameMemorizationProgress>(`${base}/progress/${nameId}`, {
        method: 'POST',
        body: JSON.stringify({ memorized }),
      });
    },

    // Get random name for daily learning
    getRandomName() {
      return client.request<AllahName>(`${base}/random`, {
        method: 'GET',
      });
    },

    // Get names by difficulty level
    getNamesByLevel(level: 'easy' | 'medium' | 'hard') {
      return client.request<AllahName[]>(`${base}?level=${level}`, {
        method: 'GET',
      });
    },
  };
}
