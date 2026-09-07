import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { MalClient } from "./mal-client.js";
import { registerAnimeTools } from "./tools/anime.js";
import { registerMangaTools } from "./tools/manga.js";
import { registerForumTools } from "./tools/forum.js";

const SERVER_NAME = "myanimelist-mcp-server";
const SERVER_VERSION = "1.0.0";

const ROOT_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>myanimelist-mcp-server</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font:14px/1.5 system-ui,sans-serif;max-width:32rem;margin:2rem auto;padding:0 1rem;color:#1a1a1a"><h1>myanimelist-mcp-server</h1><p>MCP server for the MyAnimeList API v2. Deployed on Cloudflare Workers.</p><p>MCP endpoint: <code>/mcp</code></p><p>Pass your MAL Client ID as a Bearer token: <code>Authorization: Bearer &lt;your_client_id&gt;</code></p></body></html>`;

function extractToken(request: Request): string | null {
  const header = request.headers.get("Authorization") ?? request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

function createServer(clientId: string): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const client = new MalClient(clientId);
  registerAnimeTools(server, client);
  registerMangaTools(server, client);
  registerForumTools(server, client);
  return server;
}

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(SERVER_NAME, { status: 200 });
    }

    if (url.pathname === "/") {
      return new Response(ROOT_HTML, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname !== "/mcp") {
      return new Response("Not Found", { status: 404 });
    }

    const token = extractToken(request);
    if (!token) {
      return new Response(
        JSON.stringify({ error: "missing_bearer_token", message: "Provide Authorization: Bearer <your_mal_client_id>" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    return createMcpHandler(() => createServer(token))(request, env as never, ctx);
  },
} satisfies ExportedHandler;
