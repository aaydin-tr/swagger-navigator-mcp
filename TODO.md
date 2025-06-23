# TODO - Future Enhancements

This file contains enhancement ideas that came up during the roadmap review. These are not critical for the initial release but could improve the user experience and functionality.

## 🚀 High Priority Enhancements

### 1. Configuration Flexibility
- [ ] Support multiple config file locations
  - ./swagger-mcp.config.yaml
  - ./swagger-mcp.config.json
  - ./.swagger-mcp/config.yaml
  - ./.swagger-mcp/config.json
- [x] Environment variable override: `CONFIG_PATH=/path/to/config.yaml`
- [ ] Hot-reload configuration support
- [ ] Configuration file watcher
- [ ] Graceful reload without dropping connections

### 2. Caching System
- [ ] Add cache configuration when implementing parser
```typescript
cache?: {
  enabled: boolean;
  ttl?: number;  // seconds
  maxSize?: number;  // MB
}
```
- [ ] In-memory cache for parsed Swagger specs
- [ ] Cache invalidation strategies
- [ ] Lazy loading for large specs
- [ ] Incremental updates

### 3. Validation Configuration
- [ ] Add validation configuration when implementing parser
```typescript
validation?: {
  strict?: boolean;
  allowAdditionalProperties?: boolean;
}
```
- [ ] Control strictness of OpenAPI/Swagger validation
- [ ] Handle non-standard extensions gracefully
- [ ] Warning vs error modes

### 4. Better Error Handling Strategy
- [ ] Graceful degradation when a source fails
- [ ] Clear error messages for LLMs to understand
- [ ] Retry logic for HTTP sources with exponential backoff
- [ ] Source health status in responses
- [ ] Partial results when some sources fail

### 5. Default Configuration Values
```typescript
// Add to configuration module
const defaultConfig = {
  cache: { enabled: true, ttl: 3600, maxSize: 100 },
  search: { fuzzyThreshold: 0.6, maxResults: 50 },
  validation: { strict: false, allowAdditionalProperties: true }
};
```

### 6. OpenAPI Version Support Documentation
Be explicit in documentation about supported versions:
- [ ] OpenAPI 3.0.x ✓
- [ ] OpenAPI 3.1.x ✓
- [ ] Swagger 2.0 ✓
- [ ] AsyncAPI (future consideration)
- [ ] Add version detection and warnings for unsupported versions

## 🔄 Medium Priority Enhancements

### 7. Batch Operations
Consider adding batch search support:
```typescript
interface BatchSearchInput {
  queries: string[];  // Multiple search queries
  source?: string;
  maxResultsPerQuery?: number;
}

// Usage example:
batch_search({
  queries: ["user authentication", "payment processing", "data export"],
  maxResultsPerQuery: 5
})
```

### 8. Schema Presentation Format
Enhance Phase 3 - Schema Intelligence:
- [ ] Standardized schema format for LLM consumption
- [ ] Simplified vs detailed schema modes
- [ ] JSON Schema to natural language description converter
- [ ] Type mappings for different programming languages

### 9. Health Check Tool
Add a new MCP tool:
```typescript
// check_sources - Verify all configured sources are accessible
interface HealthCheckInput {
  sources?: string[];  // Check specific sources, or all if empty
}

interface HealthCheckResult {
  source: string;
  status: "healthy" | "unhealthy" | "degraded";
  responseTime?: number;  // ms
  error?: string;
  lastSuccessfulFetch?: Date;
}
```

## 💡 Nice-to-Have Features

### 10. Hot Reload Specific Sources
- [ ] Allow reloading individual sources without full restart
- [ ] Webhook endpoint for triggering reload
- [ ] File watcher for local Swagger files
- [ ] Command: `reload_source({ name: "payment-gateway" })`

### 11. Source Groups
Group related sources for better organization:
```yaml
groups:
  - name: "production"
    sources: ["user-api", "payment-gateway"]
  - name: "internal"
    sources: ["internal-services", "admin-api"]

# Usage in tools:
list_all_endpoints({ group: "production" })
```

### 12. Enhanced Filtering by OpenAPI Tags
- [ ] Support filtering by OpenAPI's built-in tags (not just custom source tags)
- [ ] Tag inheritance and hierarchy
- [ ] Tag aliases for common variations
- [ ] Negative tag filters (exclude tags)

### 13. Request/Response Examples
- [ ] Extract and present request/response examples from Swagger
- [ ] Generate realistic example data when not provided
- [ ] Multiple examples for different scenarios
- [ ] Example validation against schema

### 14. Change Detection
- [ ] Track changes in API specifications
- [ ] Notify about breaking changes
- [ ] Version comparison tool
- [ ] Changelog generation

### 15. Performance Monitoring
- [ ] Track tool usage statistics
- [ ] Response time metrics
- [ ] Cache hit/miss rates
- [ ] Memory usage monitoring
- [ ] Slow query logging

## 🔒 Security Enhancements

### 16. Credential Management
- [ ] Secure credential storage (not just env vars)
- [ ] Credential rotation support
- [ ] API key usage tracking
- [ ] Rate limit awareness and management

### 17. Access Control
- [ ] Source-level permissions
- [ ] Tool-level access control
- [ ] Audit logging for sensitive operations
- [ ] IP whitelisting for certain sources

## 📚 Documentation & Developer Experience

### 18. Interactive Documentation
- [ ] Web UI for exploring available endpoints
- [ ] Swagger UI integration
- [ ] Real-time search preview
- [ ] Configuration validator tool

### 19. Migration Tools
- [ ] Import from Postman collections
- [ ] Import from Insomnia
- [ ] Export to various formats
- [ ] Configuration migration between versions

## 🧪 Testing Improvements

### 20. Test Data Generation
- [ ] Generate test data based on schemas
- [ ] Property-based testing support
- [ ] Edge case generation
- [ ] Faker.js integration for realistic data

### 21. Contract Testing
- [ ] Verify API implementations match Swagger specs
- [ ] Automated regression testing
- [ ] Schema compatibility testing
- [ ] Response validation tools

## Notes

These enhancements are collected from the roadmap review and represent potential improvements beyond the core functionality. They should be prioritized based on user feedback and actual usage patterns once the MVP is released.

Priority levels:
- 🚀 High Priority - Consider for v1.x releases
- 🔄 Medium Priority - Consider for v2.0
- 💡 Nice-to-Have - Future versions or based on user demand
- 🔒 Security - Important but depends on use cases
- 📚 Documentation - Improves developer experience
- 🧪 Testing - Enhances reliability and development workflow 