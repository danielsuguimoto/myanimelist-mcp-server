# myanimelist-mcp-server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server for the [MyAnimeList API v2](https://myanimelist.net/apiconfig/references/api/v2), designed to be deployed on [Cloudflare Workers](https://developers.cloudflare.com/workers/).

It exposes the MyAnimeList public API as a set of MCP tools that any MCP-compatible client (Claude Desktop, Cursor, Windsurf, etc.) can call.

## Authentication

Only one secret is needed:

| Secret             | Required | Purpose                                                                 |
|--------------------|----------|-------------------------------------------------------------------------|
| `MAL_CLIENT_ID`    | Yes      | API client ID, sent as the `X-MAL-CLIENT-ID` header. |

Register your application at <https://myanimelist.net/apiconfig> to obtain a **Client ID**.

## Setup

```bash
npm install
```

### Local development

Create a `.dev.vars` file (gitignored) with your client ID:

```bash
cp .dev.vars.example .dev.vars
# edit .dev.vars with your MAL_CLIENT_ID
```

Run the dev server:

```bash
npm run dev
```

### Deploy to Cloudflare Workers

Set the secret on your deployed Worker:

```bash
wrangler secret put MAL_CLIENT_ID
```

Deploy:

```bash
npm run deploy
```

## Connecting an MCP client

Point your MCP client at the deployed Worker URL using the Streamable HTTP transport. For example, in a client config:

```json
{
  "mcpServers": {
    "myanimelist": {
      "url": "https://myanimelist-mcp-server.<your-subdomain>.workers.dev/"
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

## Architecture

- **Stateless**: Each request constructs a fresh `McpServer` + handler, so the Worker scales horizontally without session affinity.
- **Per-request env access**: The Worker's `fetch(request, env)` handler reads `MAL_CLIENT_ID` from the Cloudflare environment, so the secret is never baked into the bundle.
- **Faithful API mapping**: One MCP tool per MyAnimeList API endpoint, with parameters matching the official API docs.

## Project structure

```
src/
  index.ts          Worker entry: per-request handler + server setup
  mal-client.ts     MyAnimeList API client (headers, error handling)
  types.ts          Shared types, Env interface, and enum constants
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
