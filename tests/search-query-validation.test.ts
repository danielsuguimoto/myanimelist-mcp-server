import { describe, expect, it } from "vitest";
import type { McpServer } from "@modelcontextprotocol/server";
import { MalClient } from "../src/mal-client.js";
import { registerAnimeTools } from "../src/tools/anime.js";
import { registerMangaTools } from "../src/tools/manga.js";
import { registerForumTools } from "../src/tools/forum.js";

type ToolConfig = { inputSchema?: { parse(input: unknown): Record<string, unknown> } };

function capturedTools(register: (server: McpServer, client: MalClient) => void) {
  const tools = new Map<string, ToolConfig>();
  const server = {
    registerTool(name: string, config: ToolConfig) {
      tools.set(name, config);
    },
  };
  register(server as unknown as McpServer, {} as MalClient);
  return tools;
}

function schemaOf(tools: Map<string, ToolConfig>, name: string) {
  const schema = tools.get(name)?.inputSchema;
  if (!schema) throw new Error(`tool ${name} not registered`);
  return schema;
}

const anime = capturedTools(registerAnimeTools);
const manga = capturedTools(registerMangaTools);
const forum = capturedTools(registerForumTools);

describe.each([
  ["search_anime", anime],
  ["search_manga", manga],
] as const)("%s q", (name, tools) => {
  const schema = schemaOf(tools, name);
  it("rejects empty q", () => {
    expect(() => schema.parse({ q: "" })).toThrow();
  });
  it("rejects whitespace-only q", () => {
    expect(() => schema.parse({ q: "   " })).toThrow();
  });
  it("trims q", () => {
    expect(schema.parse({ q: "  naruto  " }).q).toBe("naruto");
  });
});

describe("get_forum_topics q", () => {
  const schema = schemaOf(forum, "get_forum_topics");
  it("rejects whitespace-only q", () => {
    expect(() => schema.parse({ q: "   " })).toThrow();
  });
  it("accepts missing q", () => {
    expect(() => schema.parse({})).not.toThrow();
  });
});
