# swagger-mcp

A TypeScript-based Model Context Protocol (MCP) server with hot reload support.

## Installation

```bash
npm install
```

## Configuration

The server requires a YAML configuration file to define Swagger/OpenAPI sources. By default, it looks for `swagger-mcp.config.yaml` in the current working directory.

You can specify a custom configuration file path using the `CONFIG_PATH` environment variable:

```bash
# Using a config file in a different location
CONFIG_PATH=/path/to/my-config.yaml npx swagger-mcp

# Using a relative path
CONFIG_PATH=./config/api-config.yaml npx swagger-mcp

# Default behavior (looks for swagger-mcp.config.yaml in current directory)
npx swagger-mcp
```

## Development

Run with hot reload:
```bash
npm run dev
```

## Build

```bash
npm run build
```

## Usage

### Run locally with npx

From the project directory:
```bash
npx .
```

Or after building:
```bash
npm run build
npx swagger-mcp
```

### Run from npm (if published)

```bash
npx swagger-mcp
```

## Features

- TypeScript with ES modules
- Hot reload in development
- MCP server with example "add" tool
- Compatible with npx execution

## MCP Tools

### add
Adds two numbers together.
- Input: `{ a: number, b: number }`
- Output: The sum as text