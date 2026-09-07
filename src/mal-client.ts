import type { Env } from "./types.js";

const MAL_API_BASE = "https://api.myanimelist.net/v2";
const MAL_TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";

export class MalClientError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`MyAnimeList API error ${status}: ${body}`);
    this.status = status;
    this.body = body;
    this.name = "MalClientError";
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export class MalClient {
  private clientId: string;
  private clientSecret?: string;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt = 0;
  private refreshing: Promise<void> | null = null;

  constructor(env: Env) {
    this.clientId = env.MAL_CLIENT_ID;
    this.clientSecret = env.MAL_CLIENT_SECRET;
    this.accessToken = env.MAL_ACCESS_TOKEN;
    this.refreshToken = env.MAL_REFRESH_TOKEN;
  }

  hasAccessToken(): boolean {
    return Boolean(this.accessToken);
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${MAL_API_BASE}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken || !this.clientSecret) return;

    if (this.refreshing) {
      await this.refreshing;
      return;
    }

    this.refreshing = this.doRefresh();
    try {
      await this.refreshing;
    } finally {
      this.refreshing = null;
    }
  }

  private async doRefresh(): Promise<void> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.refreshToken!,
      client_id: this.clientId,
      client_secret: this.clientSecret!,
    });

    const response = await fetch(MAL_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new MalClientError(response.status, `Token refresh failed: ${text}`);
    }

    const data = (await response.json()) as TokenResponse;
    this.accessToken = data.access_token;
    if (data.refresh_token) this.refreshToken = data.refresh_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60_000;
  }

  private async request(
    method: string,
    path: string,
    options: {
      params?: Record<string, string | number | boolean | undefined>;
      body?: URLSearchParams;
      requireAuth?: boolean;
    } = {},
  ): Promise<unknown> {
    if (options.requireAuth && !this.accessToken) {
      throw new MalClientError(
        401,
        "This endpoint requires OAuth authentication. Run `npm run oauth` to obtain tokens, then set MAL_ACCESS_TOKEN and MAL_REFRESH_TOKEN secrets.",
      );
    }

    if (this.accessToken && this.tokenExpiresAt > 0 && Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken().catch(() => {});
    }

    let response = await this.doFetch(method, path, options);
    let text = await response.text();

    if (response.status === 401 && this.refreshToken && this.clientSecret) {
      await this.refreshAccessToken();
      response = await this.doFetch(method, path, options);
      text = await response.text();
    }

    if (!response.ok) {
      throw new MalClientError(response.status, text);
    }

    if (text === "" || text === "null") {
      return null;
    }

    return JSON.parse(text);
  }

  private async doFetch(
    method: string,
    path: string,
    options: {
      params?: Record<string, string | number | boolean | undefined>;
      body?: URLSearchParams;
    },
  ): Promise<Response> {
    const headers: Record<string, string> = {
      "X-MAL-CLIENT-ID": this.clientId,
      Accept: "application/json",
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    if (options.body) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    return fetch(this.buildUrl(path, options.params), {
      method,
      headers,
      body: options.body,
    });
  }

  get(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    requireAuth = false,
  ): Promise<unknown> {
    return this.request("GET", path, { params, requireAuth });
  }

  patchForm(
    path: string,
    body: Record<string, string | number | boolean | undefined>,
    requireAuth = true,
  ): Promise<unknown> {
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null && value !== "") {
        form.set(key, String(value));
      }
    }
    return this.request("PATCH", path, { body: form, requireAuth });
  }

  delete(path: string, requireAuth = true): Promise<unknown> {
    return this.request("DELETE", path, { requireAuth });
  }
}
