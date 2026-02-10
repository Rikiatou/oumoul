import * as SecureStore from 'expo-secure-store';
import type { SessionTokens, TokenStore } from '@oumoul/api';

const ACCESS_KEY = 'oumoul_access_token';
const REFRESH_KEY = 'oumoul_refresh_token';

export class SecureTokenStore implements TokenStore {
  async getTokens(): Promise<SessionTokens | null> {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);

    if (!accessToken || !refreshToken) {
      return null;
    }

    return { accessToken, refreshToken };
  }

  async setTokens(tokens: SessionTokens): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);

    if (tokens.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    }
  }

  async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  }
}
