#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getReviews, getPlaceInfo, closeBrowser } from "./scraper";

const server = new McpServer({
  name: "google-maps-reviews",
  version: "1.0.0",
});

// Register get_reviews tool
server.tool(
  "get_reviews",
  "Scrape reviews from a Google Maps place URL",
  {
    url: z.string().describe("Google Maps place URL"),
    count: z.number().optional().default(10).describe("Number of reviews to fetch (default: 10)"),
  },
  async ({ url, count }) => {
    try {
      const reviews = await getReviews(url, count);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(reviews, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching reviews: ${message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register get_place_info tool
server.tool(
  "get_place_info",
  "Get basic info about a Google Maps place",
  {
    url: z.string().describe("Google Maps place URL"),
  },
  async ({ url }) => {
    try {
      const info = await getPlaceInfo(url);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching place info: ${message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Handle cleanup
process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
