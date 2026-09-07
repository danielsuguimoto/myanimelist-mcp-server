import http from "node:http";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 8787;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const AUTH_URL = "https://myanimelist.net/v1/oauth2/authorize";
const TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";

function generatePkce(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = verifier;
  return { verifier, challenge };
}

function openBrowser(url: string): void {
  const cmds: Record<string, string> = {
    darwin: `open "${url}"`,
    win32: `start "" "${url}"`,
    linux: `xdg-open "${url}"`,
  };
  const cmd = cmds[process.platform];
  if (cmd) {
    try {
      execSync(cmd);
      return;
    } catch {}
  }
  console.log(`\n  Please open this URL in your browser:\n  ${url}\n`);
}

function loadEnv(): Record<string, string> {
  const envPath = resolve(__dirname, "..", ".dev.vars");
  const env: Record<string, string> = {};
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      env[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1).trim();
    }
  }
  return env;
}

function saveTokensToDevVars(
  env: Record<string, string>,
  accessToken: string,
  refreshToken: string,
): void {
  const envPath = resolve(__dirname, "..", ".dev.vars");
  const lines: string[] = [];
  const existing = new Set<string>();

  for (const line of (existsSync(envPath) ? readFileSync(envPath, "utf-8") : "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      lines.push(line);
      continue;
    }
    const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
    existing.add(key);
    if (key === "MAL_ACCESS_TOKEN") {
      lines.push(`MAL_ACCESS_TOKEN=${accessToken}`);
    } else if (key === "MAL_REFRESH_TOKEN") {
      lines.push(`MAL_REFRESH_TOKEN=${refreshToken}`);
    } else {
      lines.push(line);
    }
  }

  if (!existing.has("MAL_ACCESS_TOKEN")) {
    lines.push(`MAL_ACCESS_TOKEN=${accessToken}`);
  }
  if (!existing.has("MAL_REFRESH_TOKEN")) {
    lines.push(`MAL_REFRESH_TOKEN=${refreshToken}`);
  }

  writeFileSync(envPath, lines.join("\n") + "\n");
}

async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const data = JSON.parse(text);
  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

async function main(): Promise<void> {
  const env = loadEnv();
  const clientId = env.MAL_CLIENT_ID || process.env.MAL_CLIENT_ID;
  const clientSecret = env.MAL_CLIENT_SECRET || process.env.MAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      "Error: MAL_CLIENT_ID and MAL_CLIENT_SECRET must be set in .dev.vars or as environment variables.",
    );
    console.error("Register your app at https://myanimelist.net/apiconfig to get these.");
    process.exit(1);
  }

  const { verifier, challenge } = generatePkce();
  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = new URL(AUTH_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "plain");
  authUrl.searchParams.set("state", state);

  console.log("\n  Starting local OAuth callback server on port", PORT);
  console.log(`  Make sure your MAL app's redirect URI is set to: ${REDIRECT_URI}\n`);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "", `http://localhost:${PORT}`);

    if (url.pathname !== "/callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`<h1>Authorization failed</h1><p>${error}</p>`);
      console.error(`\n  Authorization failed: ${error}`);
      server.close();
      process.exit(1);
    }

    if (!code || returnedState !== state) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>Invalid callback</h1><p>Missing or mismatched state/code.</p>");
      console.error("\n  Invalid callback: missing or mismatched state/code.");
      server.close();
      process.exit(1);
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<h1>Authorization successful!</h1><p>You can close this tab now.</p>",
    );

    console.log("  Received authorization code. Exchanging for tokens...");

    try {
      const tokens = await exchangeCodeForToken(code, verifier, clientId, clientSecret);
      console.log("\n  Tokens obtained successfully!\n");
      console.log(`  Access token:  ${tokens.access_token.slice(0, 20)}...`);
      console.log(`  Refresh token: ${tokens.refresh_token.slice(0, 20)}...`);

      saveTokensToDevVars(env, tokens.access_token, tokens.refresh_token);
      console.log(`\n  Saved to .dev.vars`);
      console.log("\n  For local dev: tokens are in .dev.vars, you're ready to go.");
      console.log("  For production, set them as Worker secrets:");
      console.log("    wrangler secret put MAL_ACCESS_TOKEN");
      console.log("    wrangler secret put MAL_REFRESH_TOKEN");
      console.log("    wrangler secret put MAL_CLIENT_SECRET");
      console.log("");
      server.close();
      process.exit(0);
    } catch (err) {
      console.error(`\n  Token exchange failed: ${err instanceof Error ? err.message : err}`);
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`  Opening browser for MyAnimeList authorization...`);
    openBrowser(authUrl.toString());
  });

  setTimeout(() => {
    console.error("\n  Timed out waiting for authorization (5 minutes).");
    server.close();
    process.exit(1);
  }, 300_000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
