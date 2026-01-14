# Google Maps Reviews MCP

An MCP (Model Context Protocol) server that scrapes Google Maps reviews using Playwright.

## Why?

Google requires sign-in to view reviews on desktop. This MCP uses a mobile user-agent to bypass that restriction, letting AI assistants fetch reviews without authentication.

## Installation

```bash
bun install
```

## Usage

### As MCP Server

Add to your Claude Code config (`~/.claude.json`):

```json
{
  "mcpServers": {
    "google-maps-reviews": {
      "command": "bun",
      "args": ["run", "src/index.ts"],
      "cwd": "/path/to/google-maps-reviews-mcp"
    }
  }
}
```

### Available Tools

#### `get_reviews`

Fetch reviews from a Google Maps place.

```
url: Google Maps place URL (full URL with data parameters works best)
count: Number of reviews to fetch (default: 10)
```

#### `get_place_info`

Get basic info about a place (name, address, rating, review count).

```
url: Google Maps place URL
```

### Testing

```bash
bun run test
```

## How It Works

1. Uses Playwright with mobile Safari user-agent
2. Navigates to Google Maps place URL
3. Parses review text using regex patterns (more resilient than DOM selectors)
4. Returns structured review data (name, rating, text, date)

## Limitations

- Google may change their mobile layout, breaking the scraper
- Rate limiting may apply with heavy use
- Some review text may be truncated

## License

MIT
