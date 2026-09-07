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

  constructor(env: Env) {
    this.clientId = env.MAL_CLIENT_ID;
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

  async get(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<unknown> {
    const response = await fetch(this.buildUrl(path, params), {
      headers: {
        "X-MAL-CLIENT-ID": this.clientId,
        Accept: "application/json",
      },
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
}
