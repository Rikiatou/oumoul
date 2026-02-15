import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import type { AuthResponse, AuthUser, SessionTokens, RegisterPayload, RegisterResponse, Locale } from '@oumoul/api';
import { authApi, tokenStore } from '../api';
import { syncPushTokenWithBackend } from '../push-notifications';

interface AuthState {
  user: AuthUser | null;
  tokens: SessionTokens | null;
  loading: boolean;
  pendingVerificationEmail: string | null;
}

interface AuthContextValue extends AuthState {
  login(email: string, password: string): Promise<void>;
  register(payload: RegisterPayload): Promise<void>;
  verifyEmail(email: string, code: string): Promise<void>;
  resendVerification(email: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const initialState: AuthState = {
  user: null,
  tokens: null,
  loading: true,
  pendingVerificationEmail: null,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const applyAuthResponse = useCallback(async (response: AuthResponse) => {
    const tokens: SessionTokens = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    };
    await tokenStore.setTokens(tokens);
    setState({ user: response.user, tokens, loading: false, pendingVerificationEmail: null });

    // Déclenche l'enregistrement du pushToken Expo côté backend, sans bloquer l'auth
    void syncPushTokenWithBackend();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      Alert.alert('DEBUG LOGIN', `Calling login for ${email}`);
      const response = await authApi.login({ email, password });
      Alert.alert('DEBUG LOGIN OK', JSON.stringify(response).substring(0, 200));
      await applyAuthResponse(response);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      Alert.alert('DEBUG LOGIN ERROR', msg);
      if (msg.toLowerCase().includes('not verified') || msg.toLowerCase().includes('non vérifié')) {
        setState((prev) => ({
          ...prev,
          loading: false,
          pendingVerificationEmail: email.toLowerCase(),
        }));
      } else {
        setState({ user: null, tokens: null, loading: false, pendingVerificationEmail: null });
      }
      throw error;
    }
  }, [applyAuthResponse]);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        Alert.alert('DEBUG REGISTER', `Calling register for ${payload.email}`);
        const result = await authApi.register({
          ...payload,
          locale: normalizeLocale(payload.locale),
        });
        Alert.alert('DEBUG REGISTER OK', JSON.stringify(result).substring(0, 200));
        setState((prev) => ({
          ...prev,
          loading: false,
          pendingVerificationEmail: payload.email.toLowerCase(),
        }));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        Alert.alert('DEBUG REGISTER ERROR', msg);
        setState({ user: null, tokens: null, loading: false, pendingVerificationEmail: null });
        throw error;
      }
    },
    [],
  );

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const response = await authApi.verifyEmail({ email, code });
        await applyAuthResponse(response);
        setState((prev) => ({ ...prev, pendingVerificationEmail: null }));
      } catch (error) {
        setState((prev) => ({ ...prev, loading: false }));
        throw error;
      }
    },
    [applyAuthResponse],
  );

  const resendVerification = useCallback(
    async (email: string) => {
      await authApi.resendVerification({ email });
    },
    [],
  );

  const logout = useCallback(async () => {
    await tokenStore.clearTokens();
    setState({ user: null, tokens: null, loading: false, pendingVerificationEmail: null });
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
            setState({ user: null, tokens: null, loading: false, pendingVerificationEmail: null });
          }
          return;
        }
        if (!stored.refreshToken) {
          if (!mounted) return;
          await logout();
          return;
        }
        const response = await authApi.refresh(stored.refreshToken);
        if (!mounted) return;
        await applyAuthResponse(response);
      } catch (error) {
        if (!mounted) return;
        await logout();
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
    }),
    [state, login, register, verifyEmail, resendVerification, logout, refresh],
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
