import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { MalClient, MalClientError } from "../mal-client.js";

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

export function registerUserTools(server: McpServer, client: MalClient): void {
  server.registerTool(
    "get_my_user_info",
    {
      description:
        "Get the authenticated user's profile information. Only '@me' is supported. Requires OAuth (MAL_ACCESS_TOKEN).",
      inputSchema: z.object({
        fields: z
          .string()
          .optional()
          .describe("Comma-separated list of fields to return, e.g. 'anime_statistics'."),
      }),
    },
    async ({ fields }) => {
      try {
        const data = await client.get("/users/@me", { fields }, true);
        return textResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
