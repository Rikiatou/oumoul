import { apiRoutes } from '@oumoul/config';
import { HttpClient } from '../http-client';
import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  SuccessResponse,
} from '../types';

export function createAuthApi(client: HttpClient) {
  const base = `${apiRoutes.backend.auth}`;

  return {
    register(payload: RegisterPayload) {
      return client.request<AuthResponse>(`${base}/register`, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
    },
    login(payload: LoginPayload) {
      return client.request<AuthResponse>(`${base}/login`, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
    },
    refresh(refreshToken: string) {
      return client.request<AuthResponse>(`${base}/refresh`, {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        skipAuth: true,
        refreshOnFail: false,
      });
    },
    forgotPassword(payload: ForgotPasswordPayload) {
      return client.request<SuccessResponse>(`${base}/forgot-password`, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
    },
    resetPassword(payload: ResetPasswordPayload) {
      return client.request<SuccessResponse>(`${base}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
    },
  } as const;
}
