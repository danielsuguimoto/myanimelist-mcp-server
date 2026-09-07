import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { MalClient } from "./mal-client.js";
import type { Env } from "./types.js";
import { registerAnimeTools } from "./tools/anime.js";
import { registerMangaTools } from "./tools/manga.js";
import { registerForumTools } from "./tools/forum.js";

function buildServer(env: Env): McpServer {
  const client = new MalClient(env);

  const server = new McpServer({
    name: "myanimelist",
    version: "1.0.0",
  });

  registerAnimeTools(server, client);
  registerMangaTools(server, client);
  registerForumTools(server, client);

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

function handleSseStream(): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          clearInterval(interval);
        }
      }, 15000);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "GET") {
      return handleSseStream();
    }
    if (request.method === "DELETE") {
      return new Response(null, { status: 200 });
    }
    const handler = createMcpHandler(() => buildServer(env));
    return handler.fetch(ensureAcceptHeaders(request));
  },
};
