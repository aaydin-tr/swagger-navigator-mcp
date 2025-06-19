# swagger-mcp

A TypeScript-based Model Context Protocol (MCP) server with hot reload support.

## Installation

```bash
npm install
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