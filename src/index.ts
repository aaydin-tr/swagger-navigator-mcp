#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, detectSourceType } from "./config/loader.js";
import { SwaggerMCPConfig } from "./types/config.js";

async function main() {
    // Load configuration
    let config: SwaggerMCPConfig;
    try {
        config = loadConfig();
        console.error(`Loaded configuration with ${config.sources.length} sources`);
        
        // Log source information
        for (const source of config.sources) {
            const sourceType = detectSourceType(source.source);
            console.error(`  - ${source.name}: ${sourceType.isHttp ? 'HTTP' : 'File'} source`);
        }
    } catch (error) {
        console.error('Configuration error:', error);
        process.exit(1);
    }

    // Create an MCP server
    const server = new McpServer({
        name: "swagger-mcp",
        version: "1.0.0"
    });

    // Add a test tool to verify configuration loading
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
                }, null, 2)
            }]
        })
    );

    // Start receiving messages on stdin and sending messages on stdout
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Swagger MCP Server is running...");
}

main().catch(console.error); 