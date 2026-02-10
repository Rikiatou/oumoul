import { apiRoutes } from '@oumoul/config';
import { SessionTokens, TokenStore } from './token-store';

export interface HttpClientOptions {
  baseUrl?: string;
  tokenStore?: TokenStore;
  refreshHandler?: () => Promise<SessionTokens | null>;
}

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  refreshOnFail?: boolean;
}

export class HttpClient {
  private readonly baseUrl: string;

  private readonly tokenStore?: TokenStore;

  private readonly refreshHandler?: () => Promise<SessionTokens | null>;

  constructor(private readonly options: HttpClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? apiRoutes.backend.base;
    this.tokenStore = options.tokenStore;
    this.refreshHandler = options.refreshHandler;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.resolve(path);
    const headers = new Headers(options.headers);

    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }

    const token = await this.getAccessToken();
    if (token && !options.skipAuth) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 && !options.skipAuth && this.tokenStore && options.refreshOnFail !== false) {
      const refreshed = await this.refreshSession();
      if (refreshed) {
        headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
        const retry = await fetch(url, { ...options, headers });
        return this.parseResponse<T>(retry);
      }
    }

    return this.parseResponse<T>(response);
  }

  private resolve(path: string) {
    return `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  private async parseResponse<T>(response: Response) {
    if (!response.ok) {
      const data = await this.safeParseJson(response);
      const error = new Error((data as any)?.message ?? response.statusText);
      (error as any).status = response.status;
      (error as any).payload = data;
      throw error;
    }
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  private async safeParseJson(response: Response) {
    try {
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  private async getAccessToken() {
    if (!this.tokenStore) return null;
    const tokens = await this.tokenStore.getTokens();
    return tokens?.accessToken ?? null;
  }

  private async refreshSession() {
    if (!this.tokenStore) return null;

    if (this.refreshHandler) {
      try {
        const tokens = await this.refreshHandler();
        if (!tokens) {
          await this.tokenStore.clearTokens();
          return null;
        }
        await this.tokenStore.setTokens(tokens);
        return tokens;
      } catch (error) {
        await this.tokenStore.clearTokens();
        return null;
      }
    }

    const tokens = await this.tokenStore.getTokens();
    if (!tokens?.refreshToken) return null;

    try {
      const response = await fetch(this.resolve(`${apiRoutes.backend.auth}/refresh`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!response.ok) {
        await this.tokenStore.clearTokens();
        return null;
      }

      const data = (await response.json()) as SessionTokens;
      await this.tokenStore.setTokens(data);
      return data;
    } catch (error) {
      await this.tokenStore.clearTokens();
      return null;
    }
  }

  async setTokens(tokens: SessionTokens) {
    if (!this.tokenStore) return;
    await this.tokenStore.setTokens(tokens);
  }

  async clearTokens() {
    if (!this.tokenStore) return;
    await this.tokenStore.clearTokens();
  }

  async getTokens() {
    if (!this.tokenStore) return null;
    return this.tokenStore.getTokens();
  }
}
