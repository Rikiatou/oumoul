import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthResponse, AuthUser, SessionTokens, RegisterPayload, RegisterResponse, Locale } from '@oumoul/api';
import * as SecureStore from 'expo-secure-store';
import { authApi, tokenStore } from '../api';
import { syncPushTokenWithBackend } from '../push-notifications';

const CACHED_USER_KEY = 'oumoul_cached_user';
const CACHED_CREDS_KEY = 'oumoul_cached_creds';

async function saveCredsCache(email: string, password: string) {
  try { await SecureStore.setItemAsync(CACHED_CREDS_KEY, JSON.stringify({ email, password })); } catch {}
}

async function loadCredsCache(): Promise<{ email: string; password: string } | null> {
  try {
    const raw = await SecureStore.getItemAsync(CACHED_CREDS_KEY);
    return raw ? (JSON.parse(raw) as { email: string; password: string }) : null;
  } catch { return null; }
}

async function clearCredsCache() {
  try { await SecureStore.deleteItemAsync(CACHED_CREDS_KEY); } catch {}
}

async function saveUserCache(user: AuthUser) {
  try { await SecureStore.setItemAsync(CACHED_USER_KEY, JSON.stringify(user)); } catch {}
}

async function loadUserCache(): Promise<AuthUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(CACHED_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch { return null; }
}

async function clearUserCache() {
  try { await SecureStore.deleteItemAsync(CACHED_USER_KEY); } catch {}
}

interface AuthState {
  user: AuthUser | null;
  tokens: SessionTokens | null;
  loading: boolean;
  pendingVerificationEmail: string | null;
  authToast: string | null;
}

interface AuthContextValue extends AuthState {
  login(email: string, password: string): Promise<void>;
  register(payload: RegisterPayload): Promise<void>;
  verifyEmail(email: string, code: string): Promise<void>;
  resendVerification(email: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
  clearAuthToast(): void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const initialState: AuthState = {
  user: null,
  tokens: null,
  loading: true,
  pendingVerificationEmail: null,
  authToast: null,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const applyAuthResponse = useCallback(async (response: AuthResponse, authToast?: string | null) => {
    const tokens: SessionTokens = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    };
    await tokenStore.setTokens(tokens);
    // Persist user locally so next launch skips auth
    await saveUserCache(response.user);
    setState({ user: response.user, tokens, loading: false, pendingVerificationEmail: null, authToast: authToast ?? null });

    // Déclenche l'enregistrement du pushToken Expo côté backend, sans bloquer l'auth
    void syncPushTokenWithBackend();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await authApi.login({ email, password });
      await saveCredsCache(email, password);
      await applyAuthResponse(response, '✅ Connexion réussie');
    } catch (error) {
      const status = (error as any)?.status;
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      const isUnverified =
        status === 403 ||
        msg.includes('not verified') ||
        msg.includes('non vérifié') ||
        msg.includes('email_not_verified');
      if (isUnverified) {
        // Don't block on email verification — try to refresh/proceed anyway
        setState((prev) => ({
          ...prev,
          loading: false,
          pendingVerificationEmail: null,
          authToast: '⚠️ Vérifie ton email pour activer le backup.',
        }));
      } else {
        setState({ user: null, tokens: null, loading: false, pendingVerificationEmail: null, authToast: null });
      }
      throw error;
    }
  }, [applyAuthResponse]);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        await authApi.register({
          ...payload,
          locale: normalizeLocale(payload.locale),
        });
        // Auto-login immediately after registration — no email verification wall
        try {
          const response = await authApi.login({ email: payload.email, password: payload.password });
          await saveCredsCache(payload.email, payload.password);
          await applyAuthResponse(response, '✅ Bienvenue ! Compte créé avec succès.');
        } catch {
          // Login failed after register (e.g. server requires verification) — still let user in
          setState((prev) => ({
            ...prev,
            loading: false,
            pendingVerificationEmail: null,
            authToast: '✅ Compte créé ! Tu peux maintenant te connecter.',
          }));
        }
      } catch (error) {
        setState({ user: null, tokens: null, loading: false, pendingVerificationEmail: null, authToast: null });
        throw error;
      }
    },
    [applyAuthResponse],
  );

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const response = await authApi.verifyEmail({ email, code });
        await applyAuthResponse(response, '✅ Email vérifié. Bienvenue !');
        setState((prev) => ({ ...prev, pendingVerificationEmail: null }));
      } catch (error) {
        setState((prev) => ({ ...prev, loading: false }));
        throw error;
      }
    },
    [applyAuthResponse],
  );

  const clearAuthToast = useCallback(() => {
    setState((prev) => ({ ...prev, authToast: null }));
  }, []);

  const resendVerification = useCallback(
    async (email: string) => {
      await authApi.resendVerification({ email });
    },
    [],
  );

  const logout = useCallback(async () => {
    await tokenStore.clearTokens();
    await clearUserCache();
    await clearCredsCache();
    setState({ user: null, tokens: null, loading: false, pendingVerificationEmail: null, authToast: null });
  }, []);

  const refresh = useCallback(async () => {
    const tokens = await tokenStore.getTokens();
    if (!tokens?.refreshToken) {
      await logout();
      return;
    }
    try {
      const response = await authApi.refresh(tokens.refreshToken);
      await applyAuthResponse(response);
    } catch (error) {
      await logout();
    }
  }, [applyAuthResponse, logout]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await tokenStore.getTokens();
        if (!stored) {
          if (mounted) {
            setState({ user: null, tokens: null, loading: false, pendingVerificationEmail: null, authToast: null });
          }
          return;
        }
        if (!stored.refreshToken) {
          if (!mounted) return;
          await logout();
          return;
        }
        try {
          const response = await authApi.refresh(stored.refreshToken);
          if (!mounted) return;
          await applyAuthResponse(response);
        } catch (refreshError) {
          if (!mounted) return;
          const status = (refreshError as any)?.status;
          if (status === 401 || status === 403) {
            // Token expired — try silent re-login with saved credentials
            const creds = await loadCredsCache();
            if (creds) {
              try {
                const response = await authApi.login({ email: creds.email, password: creds.password });
                if (!mounted) return;
                await applyAuthResponse(response);
                return;
              } catch {
                // Silent re-login failed — restore cached user rather than forcing logout
              }
            }
            // No saved credentials or re-login failed — restore cached user anyway
            const cachedUser = await loadUserCache();
            if (!mounted) return;
            if (cachedUser) {
              setState({ user: cachedUser, tokens: stored, loading: false, pendingVerificationEmail: null, authToast: null });
            } else {
              await logout();
            }
          } else {
            // Network error — restore cached user so returning user skips auth
            const cachedUser = await loadUserCache();
            if (!mounted) return;
            if (cachedUser) {
              setState({ user: cachedUser, tokens: stored, loading: false, pendingVerificationEmail: null, authToast: null });
            } else {
              setState({ user: null, tokens: stored, loading: false, pendingVerificationEmail: null, authToast: null });
            }
          }
        }
      } catch (error) {
        if (!mounted) return;
        setState({ user: null, tokens: null, loading: false, pendingVerificationEmail: null, authToast: null });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [applyAuthResponse, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      verifyEmail,
      resendVerification,
      logout,
      refresh,
      clearAuthToast,
    }),
    [state, login, register, verifyEmail, resendVerification, logout, refresh, clearAuthToast],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

function normalizeLocale(locale?: string): Locale | undefined {
  if (!locale) return undefined;
  const allowed: Locale[] = ['fr', 'en', 'ar'];
  return allowed.includes(locale as Locale) ? (locale as Locale) : undefined;
}
