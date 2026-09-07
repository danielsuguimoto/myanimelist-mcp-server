# myanimelist-mcp-server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server for the [MyAnimeList API v2](https://myanimelist.net/apiconfig/references/api/v2), designed to be deployed on [Cloudflare Workers](https://developers.cloudflare.com/workers/).

It exposes the MyAnimeList API as a set of MCP tools that any MCP-compatible client (Claude Desktop, Cursor, Windsurf, etc.) can call.

## Authentication

The MyAnimeList API supports two authentication methods, both handled via Worker secrets:

| Secret               | Required | Purpose                                                                 |
|----------------------|----------|-------------------------------------------------------------------------|
| `MAL_CLIENT_ID`      | Yes      | API client ID, sent as the `X-MAL-CLIENT-ID` header. Enables all public/read endpoints. |
| `MAL_CLIENT_SECRET`  | For OAuth | API client secret. Required for the OAuth flow and token refresh. |
| `MAL_ACCESS_TOKEN`   | For OAuth | OAuth2 Bearer token (`write:users` scope). Required for user-specific endpoints (suggestions, updating/deleting list items, your own user info, `@me` lists). Auto-refreshes when expired. |
| `MAL_REFRESH_TOKEN`  | For OAuth | OAuth2 refresh token. Used to automatically refresh expired access tokens (access tokens expire in 1 hour, refresh tokens last 1 month). |

### Getting credentials

1. Register your application at <https://myanimelist.net/apiconfig> to obtain a **Client ID** and **Client Secret**.
2. Set your app's **App Redirect URL** to `http://localhost:8787/callback` (for the local OAuth helper).
3. Add your `MAL_CLIENT_ID` and `MAL_CLIENT_SECRET` to `.dev.vars`:
   ```bash
   cp .dev.vars.example .dev.vars
   # edit .dev.vars with your MAL_CLIENT_ID and MAL_CLIENT_SECRET
   ```
4. Run the OAuth helper to obtain access and refresh tokens automatically:
   ```bash
   npm run oauth
   ```
   This opens your browser for MyAnimeList authorization, catches the callback, exchanges the code for tokens, and saves them to `.dev.vars`.

## Setup

```bash
npm install
```

### Local development

```bash
cp .dev.vars.example .dev.vars
# edit .dev.vars with your MAL_CLIENT_ID and MAL_CLIENT_SECRET
npm run oauth    # obtain access + refresh tokens (saved to .dev.vars)
npm run dev
```

### Deploy to Cloudflare Workers

Set the secrets on your deployed Worker:

```bash
wrangler secret put MAL_CLIENT_ID
wrangler secret put MAL_CLIENT_SECRET
wrangler secret put MAL_ACCESS_TOKEN
wrangler secret put MAL_REFRESH_TOKEN
```

Deploy:

```bash
npm run deploy
```

> **Note:** Access tokens expire in 1 hour. The Worker automatically refreshes them using the refresh token (which lasts 1 month). After a month, re-run `npm run oauth` to get fresh tokens.

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

### Anime (8)

| Tool | Description | Auth |
|------|-------------|------|
| `search_anime` | Search anime by keyword. | Client |
| `get_anime_details` | Get details for an anime by ID. | Client |
| `get_anime_ranking` | Get a ranked anime list by type. | Client |
| `get_seasonal_anime` | Get anime for a season/year. | Client |
| `get_suggested_anime` | Get anime suggestions for the authenticated user. | OAuth |
| `update_my_anime_list_status` | Add/update an anime on the user's list. | OAuth |
| `delete_my_anime_list_item` | Remove an anime from the user's list. | OAuth |
| `get_user_anime_list` | Get a user's anime list (use `@me` for your own). | OAuth for `@me` |

### Manga (6)

| Tool | Description | Auth |
|------|-------------|------|
| `search_manga` | Search manga by keyword. | Client |
| `get_manga_details` | Get details for a manga by ID. | Client |
| `get_manga_ranking` | Get a ranked manga list by type. | Client |
| `update_my_manga_list_status` | Add/update a manga on the user's list. | OAuth |
| `delete_my_manga_list_item` | Remove a manga from the user's list. | OAuth |
| `get_user_manga_list` | Get a user's manga list (use `@me` for your own). | OAuth for `@me` |

### Forum (3)

| Tool | Description | Auth |
|------|-------------|------|
| `get_forum_boards` | List forum boards and sub-boards. | Client |
| `get_forum_topic` | Get a forum topic's details and posts. | Client |
| `get_forum_topics` | Search forum topics. | Client |

### User (1)

| Tool | Description | Auth |
|------|-------------|------|
| `get_my_user_info` | Get the authenticated user's profile. | OAuth |

## Architecture

- **Stateless**: Each request constructs a fresh `McpServer` + handler, so the Worker scales horizontally without session affinity.
- **Per-request env access**: The Worker's `fetch(request, env)` handler reads secrets from the Cloudflare environment, so they're never baked into the bundle.
- **Auto-refreshing tokens**: The `MalClient` automatically refreshes expired access tokens using the refresh token, with a 60-second safety margin before expiry. If a 401 is still received, it retries with a fresh token.
- **Faithful API mapping**: One MCP tool per MyAnimeList API endpoint, with parameters matching the official API docs.

## Project structure

```
src/
  index.ts          Worker entry: per-request handler + server setup
  mal-client.ts     MyAnimeList API client (headers, error handling, token refresh)
  types.ts          Shared types, Env interface, and enum constants
  tools/
    anime.ts        8 anime tools
    manga.ts        6 manga tools
    forum.ts        3 forum tools
    user.ts         1 user tool
scripts/
  oauth.ts          OAuth helper: automates the PKCE flow to get tokens
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the local Wrangler dev server. |
| `npm run deploy` | Deploy to Cloudflare Workers. |
| `npm run oauth` | Run the OAuth helper to obtain access/refresh tokens. |
| `npm run typecheck` | Run the TypeScript type checker. |
