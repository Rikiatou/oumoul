"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser, SessionTokens, RegisterPayload, Locale } from '@oumoul/api';
import { httpClient, tokenStore } from '../lib/api';

interface AuthState {
  user: AuthUser | null;
  tokens: SessionTokens | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login(email: string, password: string): Promise<void>;
  register(payload: RegisterPayload): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const initialState: AuthState = {
  user: null,
  tokens: null,
  loading: true,
};

interface SessionPayload {
  user: AuthUser;
  accessToken: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const applySession = useCallback(async (payload: SessionPayload) => {
    const tokens: SessionTokens = { accessToken: payload.accessToken };
    await httpClient.setTokens(tokens);
    setState({ user: payload.user, tokens, loading: false });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch('/api/session/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? 'Impossible de se connecter');
      }
      const data = (await response.json()) as SessionPayload;
      await applySession(data);
    } catch (error) {
      console.error('Login failed', error);
      await httpClient.clearTokens();
      setState({ user: null, tokens: null, loading: false });
      throw error;
    }
  }, [applySession]);

  const register = useCallback(async (payload: RegisterPayload) => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch('/api/session/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          locale: normalizeLocale(payload.locale),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Impossible d'inscrire l'utilisateur");
      }
      const data = (await response.json()) as SessionPayload;
      await applySession(data);
    } catch (error) {
      console.error('Register failed', error);
      await httpClient.clearTokens();
      setState({ user: null, tokens: null, loading: false });
      throw error;
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/session/me', { method: 'DELETE' });
    } finally {
      await httpClient.clearTokens();
      await tokenStore.clearTokens();
      setState({ user: null, tokens: null, loading: false });
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/session/me', { method: 'GET' });
      if (!response.ok) {
        await logout();
        return;
      }
      const data = (await response.json()) as SessionPayload | { user: null };
      if (!('user' in data) || !data.user) {
        await logout();
        return;
      }
      await applySession(data as SessionPayload);
    } catch (error) {
      console.error('Refresh failed', error);
      await logout();
    }
  }, [applySession, logout]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetch('/api/session/me', { method: 'GET' });
        if (!mounted) return;
        if (!response.ok) {
          setState({ user: null, tokens: null, loading: false });
          return;
        }
        const data = (await response.json()) as SessionPayload | { user: null };
        if (!('user' in data) || !data.user) {
          setState({ user: null, tokens: null, loading: false });
          return;
        }
        await applySession(data as SessionPayload);
      } catch (error) {
        if (!mounted) return;
        await logout();
      }
    })();

    return () => {
      mounted = false;
    };
  }, [applySession, logout]);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    login,
    register,
    logout,
    refresh,
  }), [state, login, register, logout, refresh]);

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
