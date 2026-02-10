export interface SessionTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface TokenStore {
  getTokens(): Promise<SessionTokens | null>;
  setTokens(tokens: SessionTokens): Promise<void>;
  clearTokens(): Promise<void>;
}
