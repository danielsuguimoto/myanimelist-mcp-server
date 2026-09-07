import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { MalClient } from "./mal-client.js";
import type { Env } from "./types.js";
import { registerAnimeTools } from "./tools/anime.js";
import { registerMangaTools } from "./tools/manga.js";
import { registerForumTools } from "./tools/forum.js";
import { registerUserTools } from "./tools/user.js";

function buildServer(env: Env): McpServer {
  const client = new MalClient(env);

  const server = new McpServer({
    name: "myanimelist",
    version: "1.0.0",
  });

  registerAnimeTools(server, client);
  registerMangaTools(server, client);
  registerForumTools(server, client);
  registerUserTools(server, client);

  return server;
}

function ensureAcceptHeaders(request: Request): Request {
  const accept = request.headers.get("accept") ?? "";
  const needsJson = !accept.includes("application/json");
  const needsSse = !accept.includes("text/event-stream");
  if (!needsJson && !needsSse) return request;

  const parts = [
    ...accept.split(",").map((s) => s.trim()).filter(Boolean),
    ...(needsJson ? ["application/json"] : []),
    ...(needsSse ? ["text/event-stream"] : []),
  ];
  const headers = new Headers(request.headers);
  headers.set("accept", parts.join(", "));
  return new Request(request, { headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const handler = createMcpHandler(() => buildServer(env));
    return handler.fetch(ensureAcceptHeaders(request));
  },
};
