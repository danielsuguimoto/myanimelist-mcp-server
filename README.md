# myanimelist-mcp-server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server for the [MyAnimeList API v2](https://myanimelist.net/apiconfig/references/api/v2), designed to be deployed on [Cloudflare Workers](https://developers.cloudflare.com/workers/).

It exposes the MyAnimeList public API as a set of MCP tools that any MCP-compatible client (Claude Desktop, Cursor, Windsurf, etc.) can call.

## Authentication

No env vars or secrets needed. Pass your **MAL Client ID** as a Bearer token:

```
Authorization: Bearer <your_mal_client_id>
```

Register your application at <https://myanimelist.net/apiconfig> to obtain a **Client ID**.

## Setup

```bash
npm install
```

### Local development

```bash
npm run dev
```

### Deploy to Cloudflare Workers

```bash
npm run deploy
```

No secrets to set — the Client ID is provided per-request by the MCP client.

## Connecting an MCP client

Point your MCP client at the `/mcp` route using the Streamable HTTP transport, with your MAL Client ID as the Bearer token:

```json
{
  "mcpServers": {
    "myanimelist": {
      "url": "https://myanimelist-mcp-server.<your-subdomain>.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer <your_mal_client_id>"
      }
    }
  }
}
```

## Available tools

### Anime (5)

| Tool | Description |
|------|-------------|
| `search_anime` | Search anime by keyword. |
| `get_anime_details` | Get details for an anime by ID. |
| `get_anime_ranking` | Get a ranked anime list by type. |
| `get_seasonal_anime` | Get anime for a season/year. |
| `get_user_anime_list` | Get a user's anime list by user name. |

### Manga (4)

| Tool | Description |
|------|-------------|
| `search_manga` | Search manga by keyword. |
| `get_manga_details` | Get details for a manga by ID. |
| `get_manga_ranking` | Get a ranked manga list by type. |
| `get_user_manga_list` | Get a user's manga list by user name. |

### Forum (3)

| Tool | Description |
|------|-------------|
| `get_forum_boards` | List forum boards and sub-boards. |
| `get_forum_topic` | Get a forum topic's details and posts. |
| `get_forum_topics` | Search forum topics. |

## Project structure

```
src/
  index.ts          Worker entry: /mcp route, Bearer token auth
  mal-client.ts     MyAnimeList API client (headers, error handling)
  types.ts          Enum constants
  tools/
    anime.ts        5 anime tools
    manga.ts        4 manga tools
    forum.ts        3 forum tools
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the local Wrangler dev server. |
| `npm run deploy` | Deploy to Cloudflare Workers. |
| `npm run typecheck` | Run the TypeScript type checker. |
