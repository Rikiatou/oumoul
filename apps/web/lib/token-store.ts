import type { SessionTokens, TokenStore } from '@oumoul/api';

const ACCESS_KEY = 'oumoul:web:access_token';
const REFRESH_KEY = 'oumoul:web:refresh_token';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readFromStorage(key: string) {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn('LocalStorage read failed', error);
    return null;
  }
}

function writeToStorage(key: string, value: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn('LocalStorage write failed', error);
  }
}

function removeFromStorage(key: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn('LocalStorage remove failed', error);
  }
}

export class BrowserTokenStore implements TokenStore {
  private memoryTokens: SessionTokens | null = null;

  async getTokens(): Promise<SessionTokens | null> {
    if (!isBrowser()) {
      return this.memoryTokens;
    }

    const accessToken = readFromStorage(ACCESS_KEY);
    const refreshToken = readFromStorage(REFRESH_KEY);

    if (!accessToken || !refreshToken) {
      return null;
    }

    const tokens = { accessToken, refreshToken };
    this.memoryTokens = tokens;
    return tokens;
  }

  async setTokens(tokens: SessionTokens): Promise<void> {
    if (!isBrowser()) {
      this.memoryTokens = tokens;
      return;
    }

    writeToStorage(ACCESS_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      writeToStorage(REFRESH_KEY, tokens.refreshToken);
    } else {
      removeFromStorage(REFRESH_KEY);
    }
    this.memoryTokens = tokens;
  }

  async clearTokens(): Promise<void> {
    if (!isBrowser()) {
      this.memoryTokens = null;
      return;
    }

    removeFromStorage(ACCESS_KEY);
    removeFromStorage(REFRESH_KEY);
    this.memoryTokens = null;
  }
}
