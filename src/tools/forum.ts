import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { MalClient, MalClientError } from "../mal-client.js";
import { FORUM_TOPIC_SORT } from "../types.js";

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(error: unknown) {
  const message =
    error instanceof MalClientError
      ? `MyAnimeList API error (${error.status}): ${error.body}`
      : error instanceof Error
        ? error.message
        : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

export function registerForumTools(server: McpServer, client: MalClient): void {
  server.registerTool(
    "get_forum_boards",
    {
      description: "Get the list of MyAnimeList forum boards and their sub-boards.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await client.get("/forum/boards");
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "get_forum_topic",
    {
      description: "Get the details and posts of a specific forum topic by its ID.",
      inputSchema: z.object({
        topic_id: z.number().int().describe("The forum topic ID."),
        limit: z.number().int().min(1).max(100).optional().describe("Max posts to return (1-100, default 100)."),
        offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)."),
      }),
    },
    async ({ topic_id, limit, offset }) => {
      try {
        const data = await client.get(`/forum/topic/${topic_id}`, { limit, offset });
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "get_forum_topics",
    {
      description:
        "Search MyAnimeList forum topics by board, sub-board, query text, or user name.",
      inputSchema: z.object({
        board_id: z.number().int().optional().describe("Filter by board ID."),
        subboard_id: z.number().int().optional().describe("Filter by sub-board ID."),
        limit: z.number().int().min(1).max(100).optional().describe("Max topics to return (1-100, default 100)."),
        offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)."),
        sort: z.enum(FORUM_TOPIC_SORT).optional().describe("Sort order. Currently only 'recent' is supported."),
        q: z.string().optional().describe("Search query for topic titles."),
        topic_user_name: z.string().optional().describe("Filter topics by the topic author's user name."),
        user_name: z.string().optional().describe("Filter topics by a participating user's user name."),
      }),
    },
    async ({ board_id, subboard_id, limit, offset, sort, q, topic_user_name, user_name }) => {
      try {
        const data = await client.get("/forum/topics", {
          board_id,
          subboard_id,
          limit,
          offset,
          sort,
          q,
          topic_user_name,
          user_name,
        });
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
