#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

async function main() {
    // Create an MCP server
    const server = new McpServer({
        name: "demo-server",
        version: "1.0.0"
    });

    // Add an addition tool
    server.registerTool("add",
        {
            title: "Addition Tool",
            description: "Add two numbers",
            inputSchema: { a: z.number(), b: z.number() }
        },
        async ({ a, b }) => ({
            content: [{ type: "text", text: String(a + b) }]
        })
    );

    // Start receiving messages on stdin and sending messages on stdout
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("MCP Server is running...");
}

main().catch(console.error); 