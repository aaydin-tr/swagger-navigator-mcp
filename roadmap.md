# Swagger MCP Server Roadmap

## Project Overview

The Swagger MCP Server is a Model Context Protocol server that enables LLMs to understand and interact with API endpoints by parsing Swagger/OpenAPI specifications. It extracts endpoint information including request/response schemas and provides tools for LLMs to query and explore these APIs intelligently.

## Vision

To create a bridge between API documentation (Swagger/OpenAPI) and LLMs, enabling them to:

- Understand available API endpoints and their purposes
- Comprehend request/response structures
- Make informed decisions about which endpoints to use
- Generate accurate API calls with proper parameters

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   LLM Client    │────▶│  MCP Server      │────▶│ Swagger Sources │
│  (Claude, etc)  │◀────│  (swagger-mcp)   │◀────│ (Files/HTTP)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                        │
         │                        ├── Parser Module
         │                        ├── Schema Analyzer
         │                        ├── Tool Registry
         │                        └── Config Manager
         │
         └── MCP Tools:
             ├── list_all_endpoints
             ├── search_endpoint
             └── get_endpoint_details
```

## Development Phases

### Phase 1: Core Foundation (Week 1-2)

#### 1.1 Configuration System

- [x] Design configuration schema
- [x] Support multiple Swagger sources
- [x] File-based Swagger support (.json, .yaml)
- [x] HTTP/HTTPS endpoint support
- [x] Configuration validation
- [x] Environment variable substitution
- [x] Custom config path via CONFIG_PATH environment variable

**Configuration File:**

```
# Default configuration file location:
./swagger-mcp.config.yaml

# Or specify custom path via environment variable:
CONFIG_PATH=/path/to/config.yaml npx swagger-mcp
```

**Configuration Example:**

```yaml
# Environment variables can be used with ${VAR_NAME} syntax
# Example: ${PAYMENT_API_KEY} will be replaced with process.env.PAYMENT_API_KEY

sources:
  - name: "user-api" # Must be unique across all sources
    source: "./swagger/user-api.json"
    description: "User management API endpoints"

  - name: "payment-gateway" # Must be unique across all sources
    source: "https://api.example.com/swagger.json"
    description: "Payment processing endpoints"
    headers:
      Authorization: "Bearer ${PAYMENT_API_KEY}"

  - name: "internal-services" # Must be unique across all sources
    source: "./swagger/internal-services.yaml"
    description: "Internal microservices communication"
    tags: ["internal", "private"]

  - name: "github-api" # Must be unique across all sources
    source: "https://api.github.com/swagger.json"
    description: "GitHub REST API"
    headers:
      Accept: "application/vnd.github.v3+json"
      Authorization: "Bearer ${GITHUB_TOKEN}"
```

#### 1.2 Swagger Parser Module

- [x] JSON parser for Swagger 2.0/3.0
- [x] YAML parser support
- [x] Schema validation
- [x] Error handling for malformed specs
- [x] Support for $ref resolution
- [x] Handle circular references

### Phase 2: Core MCP Tools (Week 3-4)

#### 2.1 list_all_endpoints Tool

```typescript
interface ListEndpointsInput {
  source?: string; // Filter by specific source
  tags?: string[]; // Filter by tags
  methods?: string[]; // Filter by HTTP methods
  limit?: number; // Pagination limit
  offset?: number; // Pagination offset
}

interface EndpointSummary {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  tags?: string[];
  source: string;
}
```

#### 2.2 search_endpoint Tool

```typescript
interface SearchEndpointInput {
  query: string; // Search query
  searchIn?: string[]; // ["path", "summary", "description", "tags"]
  source?: string; // Filter by source
  fuzzy?: boolean; // Enable fuzzy matching
}

interface SearchResult {
  endpoint: EndpointSummary;
  relevance: number; // 0-1 score
  matches: {
    field: string;
    snippet: string;
  }[];
}
```

#### 2.3 get_endpoint_details Tool

```typescript
interface GetEndpointInput {
  path: string;
  method: string;
  source: string;
}

interface EndpointDetails {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: ResponseMap;
  security?: SecurityRequirement[];
  deprecated?: boolean;
  servers?: Server[]; // Base URLs if specified
}
```

### Phase 3: Enhanced Intelligence (Week 5-6)

#### 3.1 Smart Suggestions

- [ ] Endpoint recommendation based on query intent
- [ ] Parameter auto-completion
- [ ] Common usage patterns detection
- [ ] Related endpoints discovery

#### 3.2 Schema Intelligence

- [ ] Schema simplification for LLM consumption
- [ ] Required vs optional field highlighting
- [ ] Example value generation
- [ ] Type conversion helpers

### Phase 4: Performance & Optimization (Week 7-8)

#### 4.1 Caching System

- [ ] In-memory cache for parsed Swagger specs
- [ ] Cache invalidation strategies
- [ ] Lazy loading for large specs
- [ ] Incremental updates

#### 4.2 Performance Optimizations

- [ ] Indexed search for fast queries
- [ ] Efficient schema resolution
- [ ] Batch operations support
- [ ] Memory usage optimization

## Technical Stack

### Core Dependencies

- **@modelcontextprotocol/sdk**: MCP server framework
- **zod**: Schema validation
- **swagger-parser**: OpenAPI/Swagger parsing
- **js-yaml**: YAML support
- **axios**: HTTP client for fetching remote specs
- **fuse.js**: Fuzzy search implementation

### Development Dependencies

- **typescript**: Type safety
- **vitest**: Testing framework
- **tsx**: TypeScript execution
- **eslint**: Code quality
- **prettier**: Code formatting

## Configuration Schema

```typescript
interface SwaggerMCPConfig {
  sources: SwaggerSource[];
  search?: {
    fuzzyThreshold?: number; // 0-1
    maxResults?: number;
  };
}

interface SwaggerSource {
  name: string; // Must be unique across all sources
  source: string; // File path or HTTP/HTTPS URL
  description?: string;
  tags?: string[];
  headers?: Record<string, string>; // Only used for HTTP sources, supports ${ENV_VAR} syntax
  auth?: {
    // Only used for HTTP sources
    type: "bearer" | "basic" | "apiKey";
    credentials: string; // Supports ${ENV_VAR} syntax
  };
  refreshInterval?: number; // seconds, only for HTTP sources
}

// In implementation, detect source type:
// const isHttpSource = source.startsWith('http://') || source.startsWith('https://');
```

## Future Enhancements

### Version 2.0

- [ ] GraphQL schema support
- [ ] Postman collection import
- [ ] API versioning support
- [ ] Webhook endpoint handling
- [ ] Rate limiting awareness
- [ ] get_schema tool - For extracting specific schema definitions
- [ ] test_endpoint tool - For generating mock requests and responses

### Version 3.0

- [ ] API mocking server
- [ ] Request/Response transformation
- [ ] Custom tool extensions
- [ ] Multi-language SDK generation
- [ ] API documentation generation

## Success Metrics

1. **Parsing Success Rate**: >99% of valid Swagger specs
2. **Query Performance**: <100ms for endpoint searches
3. **Memory Efficiency**: <100MB for 1000 endpoints
4. **LLM Accuracy**: >95% correct endpoint selection
5. **Developer Satisfaction**: Easy configuration and setup with flexible config paths

## Testing Strategy

### Unit Tests

- Parser module tests
- Schema validation tests
- Tool function tests
- Cache mechanism tests

### Integration Tests

- End-to-end MCP communication
- Multiple source handling
- Error recovery scenarios
- Performance benchmarks

### LLM Testing

- Endpoint discovery accuracy
- Parameter matching tests
- Schema understanding validation
- Real-world usage scenarios

## Release Plan

### v0.1.0 - MVP

- Basic configuration support with CONFIG_PATH environment variable
- File-based Swagger parsing
- list_all_endpoints tool
- search_endpoint tool

### v0.2.0 - Core Features

- HTTP source support
- get_endpoint_details tool
- Enhanced search with fuzzy matching
- Basic caching

### v0.3.0 - Enhanced Experience

- Smart suggestions
- Schema intelligence
- Performance optimizations
- Comprehensive documentation

### v1.0.0 - Production Ready

- Full test coverage
- Performance benchmarks
- LLM integration examples
- Community feedback incorporated

## Contributing Guidelines

1. **Code Style**: Follow TypeScript best practices
2. **Testing**: Maintain >90% test coverage
3. **Documentation**: Update docs with new features
4. **Performance**: Profile before/after changes
5. **Security**: Validate all inputs, sanitize outputs

## Conclusion

The Swagger MCP Server will revolutionize how LLMs interact with APIs by providing them with deep understanding of available endpoints, their schemas, and usage patterns. By focusing on the core tools that matter most - listing, searching, and understanding endpoints - we deliver maximum value with minimal complexity. This roadmap provides a clear path from MVP to a production-ready tool that will benefit the entire AI development community.
