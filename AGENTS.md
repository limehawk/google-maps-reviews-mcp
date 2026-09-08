# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MCP server that scrapes Google Maps reviews using Playwright. Uses mobile user-agent to bypass Google's sign-in requirement.

## Commands

```bash
bun run dev      # Run MCP server
bun run test     # Test scraper against Perry Gruman listing
bun run build    # Build for distribution
```

## Architecture

- `src/index.ts` - MCP server entry, registers `get_reviews` and `get_place_info` tools
- `src/scraper.ts` - Playwright scraping logic with mobile UA
- `src/types.ts` - TypeScript interfaces

## Key Design Decisions

- **Mobile user-agent**: Desktop Google Maps requires sign-in to view reviews; mobile doesn't
- **Text parsing**: Reviews extracted via regex patterns on page text rather than DOM selectors (more resilient to Google's obfuscated class names)
- **Browser reuse**: Single browser context kept alive for performance

## Adding to Claude Config

```json
{
  "mcpServers": {
    "google-maps-reviews": {
      "command": "bun",
      "args": ["run", "dev"],
      "cwd": "/path/to/google-maps-reviews-mcp"
    }
  }
}
```
