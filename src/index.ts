#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "./config/loader.js";
import { SwaggerMCPConfig } from "./types/config.js";

async function main() {
    let config: SwaggerMCPConfig;
    try {
        config = getConfig();
        const configPath = process.env.CONFIG_PATH || 'swagger-mcp.config.yaml';
        console.error(`Loaded configuration from: ${configPath}`);
        console.error(`Found ${config.sources.length} sources`);
        
        for (const source of config.sources) {
            console.error(`  - ${source.name}: ${source.type === 'http' ? 'HTTP' : 'File'} source`);
        }
    } catch (error) {
        console.error('Configuration error:', error);
        if (!process.env.CONFIG_PATH) {
            console.error('\nTip: You can specify a custom config path using the CONFIG_PATH environment variable');
        }
        process.exit(1);
    }

    const server = new McpServer({
        name: "swagger-mcp",
        version: "1.0.0"
    });

    server.registerTool("test_config",
        {
            title: "Test Configuration",
            description: "Returns the loaded configuration for testing",
            inputSchema: {}
        },
        async () => ({
            content: [{
                type: "text",
                text: JSON.stringify({
                    config: config,
                    sources: config.sources.map(s => ({
                        name: s.name,
                        type: s.type,
                        source: s.source
                    }))
                }, null, 2)
            }]
        })
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Swagger MCP Server is running...");
}

main().catch(console.error); 