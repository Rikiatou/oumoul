import type { SessionTokens, TokenStore } from '@oumoul/api';

export class MemoryTokenStore implements TokenStore {
  private tokens: SessionTokens | null = null;

  async getTokens(): Promise<SessionTokens | null> {
    return this.tokens;
  }

  async setTokens(tokens: SessionTokens): Promise<void> {
    this.tokens = tokens;
  }

  async clearTokens(): Promise<void> {
    this.tokens = null;
  }
}
