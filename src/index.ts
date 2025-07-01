#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "@config/loader.js";
import { SwaggerMCPConfig } from "@app-types/config.js";
import { SwaggerParserModule } from "@parsers/swagger-parser.js";
import { ExtendedParsedEndpoint, OpenAPIInfo, SwaggerParserResult } from "@app-types/swagger.js";
import { z } from "zod";
import Fuse from "fuse.js";

async function main() {
  let config: SwaggerMCPConfig;
  const parser = new SwaggerParserModule();
  const parsedSpecs = new Map<string, SwaggerParserResult>();

  try {
    config = getConfig();
    const configPath = process.env.CONFIG_PATH || "swagger-mcp.config.yaml";
    console.error(`Loaded configuration from: ${configPath}`);
    console.error(`Found ${config.sources.length} sources`);

    for (const source of config.sources) {
      console.error(`  - ${source.name}: ${source.type === "http" ? "HTTP" : "File"} source`);
    }
  } catch (error) {
    console.error("Configuration error:", error);
    if (!process.env.CONFIG_PATH) {
      console.error("\nTip: You can specify a custom config path using the CONFIG_PATH environment variable");
    }
    process.exit(1);
  }

  console.error("Parsing Swagger sources...");
  let successCount = 0;
  let errorCount = 0;

  for (const source of config.sources) {
    try {
      console.error(`  Parsing ${source.name}...`);
      const parseResult = await parser.parse(source);

      if (parseResult.success && parseResult.spec) {
        parsedSpecs.set(source.name, parseResult);
        successCount++;
        console.error(`  ✓ ${source.name} parsed successfully`);
      } else {
        errorCount++;
        console.error(`  ✗ ${source.name} failed to parse: ${parseResult.errors?.[0]?.details || "Unknown error"}`);
        parsedSpecs.set(source.name, {
          errors: parseResult.errors,
          success: false
        });
      }
    } catch (error) {
      errorCount++;
      console.error(`  ✗ ${source.name} failed to parse: ${error}`);
      parsedSpecs.set(source.name, {
        errors: [
          {
            details: error instanceof Error ? error.message : "Unknown error",
            code: "UNKNOWN",
            source: source.name
          }
        ],
        success: false
      });
    }
  }

  console.error(`Parsing complete: ${successCount} successful, ${errorCount} failed`);

  if (successCount === 0) {
    console.error("No sources were successfully parsed. Exiting.");
    process.exit(1);
  }

  const allEndpoints: ExtendedParsedEndpoint[] = Array.from(parsedSpecs.values()).flatMap(
    (spec) =>
      spec.spec?.endpoints.map((endpoint) => ({ ...endpoint, source_name: spec.spec?.sourceName || "Unknown" })) || []
  );

  const fuseEndpoints = new Fuse(allEndpoints, {
    includeScore: true,
    shouldSort: true,
    keys: [
      { name: "description", weight: 0.3 },
      { name: "summary", weight: 0.2 },
      { name: "path", weight: 0.2 },
      { name: "method", weight: 0.15 },
      { name: "source_name", weight: 0.1 },
      { name: "tags", weight: 0.05 }
    ],
    threshold: config.search.fuzzyThreshold
  });

  const server = new McpServer({
    name: "swagger-mcp",
    version: "1.0.0"
  });

  server.registerTool(
    "list_all_sources",
    {
      title: "List All Sources",
      description: "Lists all available Swagger sources",
      inputSchema: {},
      outputSchema: {
        sources: z
          .array(
            z
              .object({
                name: z.string(),
                description: z.string(),
                info: z
                  .object({
                    title: z.string(),
                    version: z.string()
                  })
                  .passthrough()
              })
              .passthrough()
          )
          .optional(),
        error: z.string().optional()
      }
    },
    async () => {
      const sources: { name: string; description: string; info: OpenAPIInfo }[] = [];
      parsedSpecs.forEach((value, key) => {
        const info = { title: "Unknown", version: "Unknown", ...value.spec?.info };
        const description = config.sources.find((s) => s.name === key)?.description || "Unknown";

        if (value.success) {
          sources.push({
            name: key,
            description: description,
            info: info
          });
        }
      });

      if (sources.length === 0) {
        return {
          isError: true,
          content: [{ type: "text", text: JSON.stringify({ error: "No sources found" }) }],
          structuredContent: { error: "No sources found" }
        };
      }

      const result = { sources };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ],
        structuredContent: result
      };
    }
  );

  server.registerTool(
    "list_endpoints_for_source",
    {
      title: "List Endpoints for Source",
      description: "Lists endpoints for a given source (by name) with limit and offset",
      inputSchema: {
        request: z.object({
          name: z.string().describe("The name of the source to list endpoints for"),
          limit: z.number().min(1).max(100).default(10).describe("The maximum number of endpoints to return"),
          offset: z.number().min(0).default(0).describe("The number of endpoints to skip")
        })
      },
      outputSchema: {
        endpoints: z
          .array(
            z
              .object({
                path: z.string(),
                method: z.string(),
                description: z.string()
              })
              .passthrough()
          )
          .optional(),
        pagination: z
          .object({
            total: z.number().describe("The total number of endpoints"),
            limit: z.number().describe("The number of endpoints to return"),
            offset: z.number().describe("The number of endpoints to skip"),
            hasNext: z.boolean().describe("Whether there are more endpoints to fetch"),
            hasPrevious: z.boolean().describe("Whether there are previous endpoints to fetch")
          })
          .optional(),
        error: z.string().optional()
      }
    },
    async (input) => {
      const sourceName = input.request.name;
      const limit = input.request.limit;
      const offset = input.request.offset;

      const source = parsedSpecs.get(sourceName);
      if (!source) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Source '${sourceName}' not found` })
            }
          ],
          structuredContent: { error: `Source '${sourceName}' not found` }
        };
      }

      if (!source.success || !source.spec) {
        const errorDetails = source.errors?.[0]?.details || "Unknown parsing error";
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Source '${sourceName}' failed to parse - ${errorDetails}` })
            }
          ],
          structuredContent: { error: `Source '${sourceName}' failed to parse - ${errorDetails}` }
        };
      }

      const endpoints = source.spec.endpoints.slice(offset, offset + limit);
      const pagination = {
        total: source.spec.endpoints.length,
        limit: limit,
        offset: offset,
        hasNext: offset + limit < source.spec.endpoints.length,
        hasPrevious: offset > 0
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ endpoints, pagination })
          }
        ],
        structuredContent: { endpoints, pagination }
      };
    }
  );

  server.registerTool(
    "search_endpoint",
    {
      title: "Search Endpoint",
      description: `Intelligently searches Swagger/OpenAPI endpoints using fuzzy matching to find relevant API endpoints based on your query.
      **How it works:**
      This tool performs weighted fuzzy search across multiple endpoint attributes to return the most relevant matches. It's designed to help you quickly discover API endpoints even with partial or approximate search terms.

      **Search Algorithm:**
      Uses weighted scoring across these fields (higher weight = more influence on results):
      - description (30%) - Endpoint descriptions and documentation
      - summary (20%) - Brief endpoint summaries
      - path (20%) - URL paths (e.g., /api/users, /v1/orders)
      - method (15%) - HTTP methods (GET, POST, PUT, DELETE, etc.)
      - source_name (10%) - API source or service name
      - tags (5%) - Endpoint tags and categories

      **Example Queries:**
      - \`user\` - Find all user-related endpoints
      - \`authentication\` - Find authentication endpoints
      - \`create order\` - Find endpoints for creating orders
      - \`GET users\` - Find GET endpoints related to users
      - \`payment processing\` - Find payment-related endpoints

      Returns matching endpoints ranked by relevance score, helping you quickly identify the most suitable API endpoints for your needs.

      **For AI Assistants:**
      When endpoints ae found from a specific source_name, use the 'list_endpoints_for_source' tool to retrieve the complete endpoint collection for that source. This provides comprehensive context about all available endpoints in that API, enabling better endpoint selection and understanding of the full API capabilities rather than working with isolated search results.`,
      inputSchema: {
        request: z.object({
          query: z
            .string()
            .describe(
              "Search query using fuzzy matching and optional advanced operators. Examples: 'user profile', 'GET users', 'POST credentials'"
            )
        })
      },
      outputSchema: {
        endpoints: z
          .array(
            z
              .object({
                path: z.string(),
                method: z.string(),
                description: z.string(),
                source_name: z.string()
              })
              .passthrough()
          )
          .optional(),
        error: z.string().optional()
      }
    },
    async (input) => {
      const query = input.request.query;
      const result = fuseEndpoints.search(query);
      const endpoints = result?.map((r) => r.item) || [];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ endpoints })
          }
        ],
        structuredContent: { endpoints }
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Swagger MCP Server is running...");
}

main().catch(console.error);
