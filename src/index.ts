#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "@config/loader.js";
import { SwaggerMCPConfig } from "@app-types/config.js";
import { SwaggerParserModule } from "@parsers/swagger-parser.js";
import { OpenAPIInfo, ParsedEndpoint, SwaggerParserResult } from "@app-types/swagger.js";
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Swagger MCP Server is running...");
}

main().catch(console.error);
