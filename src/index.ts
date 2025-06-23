#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "@config/loader.js";
import { SwaggerMCPConfig } from "@app-types/config.js";
import { SwaggerParserModule } from "@parsers/swagger-parser.js";
import { z } from "zod";

async function main() {
  let config: SwaggerMCPConfig;
  const parser = new SwaggerParserModule();

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

  const server = new McpServer({
    name: "swagger-mcp",
    version: "1.0.0"
  });

  server.registerTool(
    "test_config",
    {
      title: "Test Configuration",
      description: "Returns the loaded configuration for testing",
      inputSchema: {}
    },
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              config: config,
              sources: config.sources.map((s) => ({
                name: s.name,
                type: s.type,
                source: s.source
              }))
            },
            null,
            2
          )
        }
      ]
    })
  );

  server.registerTool(
    "parse_sources",
    {
      title: "Parse Swagger Sources",
      description: "Parses all configured Swagger/OpenAPI sources and returns the results",
      inputSchema: {
        sourceName: z.string().optional().describe("Optional: Parse only a specific source by name")
      }
    },
    async (args) => {
      const results: any[] = [];
      const sourcesToParse = args.sourceName
        ? config.sources.filter((s) => s.name === args.sourceName)
        : config.sources;

      if (args.sourceName && sourcesToParse.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Source "${args.sourceName}" not found in configuration`
            }
          ]
        };
      }

      for (const source of sourcesToParse) {
        const parseResult = await parser.parse(source);

        if (parseResult.success && parseResult.spec) {
          results.push(parseResult.spec);
        } else {
          results.push({
            source: source.name,
            type: source.type,
            error: parseResult.errors?.[0]?.message || "Unknown error",
            errorCode: parseResult.errors?.[0]?.code
          });
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2)
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
