import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { MalClient, MalClientError } from "../mal-client.js";
import {
  ANIME_RANKING_TYPES,
  ANIME_LIST_SORT,
  ANIME_LIST_STATUS,
  SEASONS,
  SEASONAL_SORT,
} from "../types.js";

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

export function registerAnimeTools(server: McpServer, client: MalClient): void {
  server.registerTool(
    "search_anime",
    {
      description:
        "Search the MyAnimeList anime database by keyword. Returns a paginated list of matching anime.",
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
        const data = await client.get("/anime", { q, limit, offset, fields });
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "get_anime_details",
    {
      description: "Get detailed information about a specific anime by its ID.",
      inputSchema: z.object({
        anime_id: z.number().int().describe("The MyAnimeList anime ID."),
        fields: z
          .string()
          .optional()
          .describe("Comma-separated list of fields to return. Use a broad set for full details, e.g. 'id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_list_users,num_scoring_users,nsfw,created_at,updated_at,media_type,status,genres,my_list_status,num_episodes,start_season,broadcast,source,average_episode_duration,rating,pictures,background,related_anime,related_manga,recommendations,studios,statistics'."),
      }),
    },
    async ({ anime_id, fields }) => {
      try {
        const data = await client.get(`/anime/${anime_id}`, { fields });
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "get_anime_ranking",
    {
      description:
        "Get a ranked list of anime by ranking type. The returned anime include a 'ranking' field.",
      inputSchema: z.object({
        ranking_type: z.enum(ANIME_RANKING_TYPES).describe("The ranking category to retrieve."),
        limit: z.number().int().min(1).max(500).optional().describe("Max results to return (1-500, default 100)."),
        offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)."),
        fields: z.string().optional().describe("Comma-separated list of fields to return."),
      }),
    },
    async ({ ranking_type, limit, offset, fields }) => {
      try {
        const data = await client.get("/anime/ranking", { ranking_type, limit, offset, fields });
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "get_seasonal_anime",
    {
      description:
        "Get anime for a specific season and year. Seasons: winter (Jan-Mar), spring (Apr-Jun), summer (Jul-Sep), fall (Oct-Dec).",
      inputSchema: z.object({
        year: z.number().int().describe("The year of the season, e.g. 2024."),
        season: z.enum(SEASONS).describe("The season name: winter, spring, summer, or fall."),
        sort: z
          .enum(SEASONAL_SORT)
          .optional()
          .describe("Sort order: 'anime_score' (descending) or 'anime_num_list_users' (descending)."),
        limit: z.number().int().min(1).max(500).optional().describe("Max results to return (1-500, default 100)."),
        offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)."),
        fields: z.string().optional().describe("Comma-separated list of fields to return."),
      }),
    },
    async ({ year, season, sort, limit, offset, fields }) => {
      try {
        const data = await client.get(`/anime/season/${year}/${season}`, { sort, limit, offset, fields });
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "get_suggested_anime",
    {
      description:
        "Get anime suggestions for the authorized user. Requires OAuth (MAL_ACCESS_TOKEN). Returns an empty list for new users.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).optional().describe("Max results to return (1-100, default 100)."),
        offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)."),
        fields: z.string().optional().describe("Comma-separated list of fields to return."),
      }),
    },
    async ({ limit, offset, fields }) => {
      try {
        const data = await client.get("/anime/suggestions", { limit, offset, fields }, true);
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "update_my_anime_list_status",
    {
      description:
        "Add an anime to the authenticated user's anime list, or update its status if already present. Only provided fields are updated. Requires OAuth (MAL_ACCESS_TOKEN).",
      inputSchema: z.object({
        anime_id: z.number().int().describe("The MyAnimeList anime ID to add or update."),
        status: z.enum(ANIME_LIST_STATUS).optional().describe("Watch status: watching, completed, on_hold, dropped, or plan_to_watch."),
        is_rewatching: z.boolean().optional().describe("Whether the user is rewatching this anime."),
        score: z.number().int().min(0).max(10).optional().describe("User's score from 0 to 10."),
        num_watched_episodes: z.number().int().optional().describe("Number of episodes watched."),
        priority: z.number().int().min(0).max(2).optional().describe("Priority from 0 (low) to 2 (high)."),
        num_times_rewatched: z.number().int().optional().describe("Number of times the user has rewatched this anime."),
        rewatch_value: z.number().int().min(0).max(5).optional().describe("Rewatch value rating from 0 to 5."),
        tags: z.string().optional().describe("Comma-separated tags to attach to this list entry."),
        comments: z.string().optional().describe("Free-form comments about this list entry."),
      }),
    },
    async (params) => {
      try {
        const { anime_id, ...body } = params;
        const data = await client.patchForm(`/anime/${anime_id}/my_list_status`, body, true);
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "delete_my_anime_list_item",
    {
      description:
        "Remove an anime from the authenticated user's anime list. Returns 404 if the anime is not in the list. Requires OAuth (MAL_ACCESS_TOKEN).",
      inputSchema: z.object({
        anime_id: z.number().int().describe("The MyAnimeList anime ID to remove from the user's list."),
      }),
    },
    async ({ anime_id }) => {
      try {
        const data = await client.delete(`/anime/${anime_id}/my_list_status`, true);
        return textResult(data ?? { deleted: true, anime_id });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "get_user_anime_list",
    {
      description:
        "Get a user's anime list. Use '@me' to get the authenticated user's own list (requires OAuth). Other users can be viewed with client auth.",
      inputSchema: z.object({
        user_name: z
          .string()
          .describe("User name, or '@me' for the authenticated user's own list."),
        status: z
          .enum(ANIME_LIST_STATUS)
          .optional()
          .describe("Filter by status: watching, completed, on_hold, dropped, or plan_to_watch. Omit to return all."),
        sort: z
          .enum(ANIME_LIST_SORT)
          .optional()
          .describe("Sort order: list_score, list_updated_at, anime_title, anime_start_date, or anime_id."),
        limit: z.number().int().min(1).max(1000).optional().describe("Max results to return (1-1000, default 100)."),
        offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)."),
        fields: z
          .string()
          .optional()
          .describe("Comma-separated list of fields to return. Use 'list_status' to include the user's list status per anime."),
      }),
    },
    async ({ user_name, status, sort, limit, offset, fields }) => {
      try {
        const requireAuth = user_name === "@me";
        const data = await client.get(
          `/users/${user_name}/animelist`,
          { status, sort, limit, offset, fields },
          requireAuth,
        );
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
