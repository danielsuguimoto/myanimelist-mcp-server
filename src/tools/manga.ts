import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { MalClient, MalClientError } from "../mal-client.js";
import { MANGA_RANKING_TYPES, MANGA_LIST_SORT } from "../types.js";

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

export function registerMangaTools(server: McpServer, client: MalClient): void {
  server.registerTool(
    "search_manga",
    {
      description:
        "Search the MyAnimeList manga database by keyword. Returns a paginated list of matching manga.",
      inputSchema: z.object({
        q: z.string().describe("Search query string."),
        limit: z.number().int().min(1).max(100).optional().describe("Max results to return (1-100, default 100)."),
        offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)."),
        fields: z
          .string()
          .optional()
          .describe("Comma-separated list of fields to return, e.g. 'id,title,main_picture,synopsis,mean'."),
      }),
    },
    async ({ q, limit, offset, fields }) => {
      try {
        const data = await client.get("/manga", { q, limit, offset, fields });
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "get_manga_details",
    {
      description: "Get detailed information about a specific manga by its ID.",
      inputSchema: z.object({
        manga_id: z.number().int().describe("The MyAnimeList manga ID."),
        fields: z
          .string()
          .optional()
          .describe("Comma-separated list of fields to return. Use a broad set for full details, e.g. 'id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_list_users,num_scoring_users,nsfw,created_at,updated_at,media_type,status,genres,my_list_status,num_volumes,num_chapters,authors{first_name,last_name},pictures,background,related_anime,related_manga,recommendations,serialization{name}'."),
      }),
    },
    async ({ manga_id, fields }) => {
      try {
        const data = await client.get(`/manga/${manga_id}`, { fields });
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "get_manga_ranking",
    {
      description:
        "Get a ranked list of manga by ranking type. The returned manga include a 'ranking' field.",
      inputSchema: z.object({
        ranking_type: z.enum(MANGA_RANKING_TYPES).describe("The ranking category to retrieve."),
        limit: z.number().int().min(1).max(500).optional().describe("Max results to return (1-500, default 100)."),
        offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)."),
        fields: z.string().optional().describe("Comma-separated list of fields to return."),
      }),
    },
    async ({ ranking_type, limit, offset, fields }) => {
      try {
        const data = await client.get("/manga/ranking", { ranking_type, limit, offset, fields });
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "get_user_manga_list",
    {
      description:
        "Get a user's manga list by user name.",
      inputSchema: z.object({
        user_name: z
          .string()
          .describe("User name to look up."),
        status: z
          .enum(["reading", "completed", "on_hold", "dropped", "plan_to_read"])
          .optional()
          .describe("Filter by status. Omit to return all."),
        sort: z
          .enum(MANGA_LIST_SORT)
          .optional()
          .describe("Sort order: list_score, list_updated_at, manga_title, manga_start_date, or manga_id."),
        limit: z.number().int().min(1).max(1000).optional().describe("Max results to return (1-1000, default 100)."),
        offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)."),
        fields: z
          .string()
          .optional()
          .describe("Comma-separated list of fields to return. Use 'list_status' to include the user's list status per manga."),
      }),
    },
    async ({ user_name, status, sort, limit, offset, fields }) => {
      try {
        const data = await client.get(
          `/users/${user_name}/mangalist`,
          { status, sort, limit, offset, fields },
        );
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
