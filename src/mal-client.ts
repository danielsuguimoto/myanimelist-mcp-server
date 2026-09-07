import type { Env } from "./types.js";

const MAL_API_BASE = "https://api.myanimelist.net/v2";

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

export class MalClient {
  private clientId: string;
  private accessToken?: string;

  constructor(env: Env) {
    this.clientId = env.MAL_CLIENT_ID;
    this.accessToken = env.MAL_ACCESS_TOKEN;
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
        "This endpoint requires OAuth authentication. Set the MAL_ACCESS_TOKEN secret (Bearer token with the write:users scope).",
      );
    }

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

    const response = await fetch(this.buildUrl(path, options.params), {
      method,
      headers,
      body: options.body,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new MalClientError(response.status, text);
    }

    if (text === "" || text === "null") {
      return null;
    }

    return JSON.parse(text);
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
