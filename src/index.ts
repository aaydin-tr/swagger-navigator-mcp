#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "@config/loader.js";
import { SwaggerMCPConfig } from "@app-types/config.js";
import { SwaggerParserModule } from "@parsers/swagger-parser.js";
import { ParsedEndpoint, SwaggerParserResult } from "@app-types/swagger.js";
import { z } from "zod";

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
        // Store error information for later reference
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

  const server = new McpServer({
    name: "swagger-mcp",
    version: "1.0.0"
  });

  server.registerTool(
    "test_config",
    {
      title: "Test Configuration",
      description: "Returns the loaded configuration and parsing status for testing",
      inputSchema: {}
    },
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              config: config
            },
            null,
            2
          )
        }
      ]
    })
  );

  server.registerTool(
    "list_all_endpoints",
    {
      title: "List All Endpoints",
      description:
        "Lists all available API endpoints from configured Swagger sources with optional filtering and pagination",
      inputSchema: {
        source: z.string().optional().describe("Optional: Filter by specific source name"),
        limit: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Optional: Maximum number of endpoints to return (default: 100)"),
        offset: z
          .number()
          .min(0)
          .optional()
          .describe("Optional: Number of endpoints to skip for pagination (default: 0)")
      }
    },
    async (args) => {
      const limit = args.limit || 100;
      const offset = args.offset || 0;

      if (args.source && !parsedSpecs.has(args.source)) {
        return {
          content: [
            {
              type: "text",
              text: `Source "${args.source}" not found in configuration`
            }
          ]
        };
      }

      const singleSourceResult = parsedSpecs.get(args.source);

      const allEndpoints: ParsedEndpoint[] = [];

      for (const source of sourceResult) {
        const parseResult = await parser.parse(source);

        if (parseResult.success && parseResult.spec) {
          const spec = parseResult.spec;

          if (spec.endpoints) {
            for (const endpoint of spec.endpoints) {
              allEndpoints.push(endpoint);
            }
          }
        }
      }

      // Apply pagination
      const paginatedEndpoints = allEndpoints.slice(offset, offset + limit);

      const result = {
        endpoints: paginatedEndpoints,
        pagination: {
          total: allEndpoints.length,
          limit: limit,
          offset: offset,
          hasMore: offset + limit < allEndpoints.length
        },
        sources: sourcesToParse.map((s) => s.name)
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Swagger MCP Server is running...");
}

main().catch(console.error);
