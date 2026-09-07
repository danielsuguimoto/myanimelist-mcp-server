import { McpServer, WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const server = buildServer(env);
    await server.connect(transport);
    return transport.handleRequest(request);
  },
};
