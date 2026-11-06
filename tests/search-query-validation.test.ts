import { describe, expect, it } from "vitest";
import type { McpServer } from "@modelcontextprotocol/server";
import { MalClient } from "../src/mal-client.js";
import { registerAnimeTools } from "../src/tools/anime.js";
import { registerMangaTools } from "../src/tools/manga.js";
import { registerForumTools } from "../src/tools/forum.js";

type ToolConfig = { inputSchema?: { parse(input: unknown): Record<string, unknown> } };
type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;
type CapturedTool = { config: ToolConfig; handler: ToolHandler };
type GetCall = {
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
};

function capturedTools(
  register: (server: McpServer, client: MalClient) => void,
  client: MalClient = {} as MalClient,
) {
  const tools = new Map<string, CapturedTool>();
  const server = {
    registerTool(name: string, config: ToolConfig, handler: ToolHandler) {
      tools.set(name, { config, handler });
    },
  };
  register(server as unknown as McpServer, client);
  return tools;
}

function recordingClient() {
  const calls: GetCall[] = [];
  const client = {
    get(path: string, params?: Record<string, string | number | boolean | undefined>) {
      calls.push({ path, params });
      return Promise.resolve({});
    },
  };
  return { client: client as unknown as MalClient, calls };
}

function schemaOf(tools: Map<string, CapturedTool>, name: string) {
  const schema = tools.get(name)?.config.inputSchema;
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

describe.each([
  ["search_anime", registerAnimeTools, "/anime"],
  ["search_manga", registerMangaTools, "/manga"],
] as const)("%s call path", (name, register, path) => {
  it("sends trimmed q to MAL", async () => {
    const { client, calls } = recordingClient();
    const tool = capturedTools(register, client).get(name);
    if (!tool?.config.inputSchema) throw new Error(`tool ${name} not registered`);
    const args = tool.config.inputSchema.parse({ q: "  naruto  " });
    await tool.handler(args);
    expect(calls[0]?.path).toBe(path);
    expect(calls[0]?.params?.q).toBe("naruto");
  });
});
