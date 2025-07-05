# Index.ts Testing Documentation

## Overview
This document outlines the testing strategy for the main `index.ts` file in the Swagger Navigator MCP project.

## Testing Challenges
The `index.ts` file is the main entry point for the MCP server and contains several complex components:
- Global state management
- Async operations and concurrency control
- File system operations
- External API integrations
- MCP server setup and tool registration

## Recommended Testing Approach

### 1. Unit Tests for Individual Functions
The following functions should be tested in isolation:

#### Configuration Loading
- `loadConfig()` - Test successful loading and error handling
- `parseAllSources()` - Test parsing multiple sources with success/failure scenarios
- `createFuseIndex()` - Test search index creation from parsed specs
- `updateFuseIndex()` - Test search index updates

#### Concurrency Control
- `waitForRefreshComplete()` - Test waiting for refresh operations
- `refreshSources()` - Test atomic refresh operations
- `handleConfigChange()` - Test configuration reload scenarios

#### Resource Management
- `setupConfigWatcher()` - Test file watcher setup and error handling
- `setupRefreshTimer()` - Test timer setup and cleanup
- `cleanup()` - Test resource cleanup

### 2. Integration Tests
Test the interaction between components:

#### Server Lifecycle
- Server initialization with valid configuration
- Server initialization with invalid configuration
- Graceful shutdown scenarios

#### Tool Registration
- Test all three MCP tools are registered correctly
- Test tool input/output schemas
- Test tool error handling

#### Configuration Management
- Test configuration file changes
- Test environment variable substitution
- Test source type detection

### 3. MCP Tool Tests
Each MCP tool should be tested individually:

#### list_all_sources
- Test with successful sources
- Test with failed sources
- Test with empty sources
- Test error scenarios

#### list_endpoints_for_source
- Test pagination functionality
- Test source not found scenarios
- Test failed source scenarios
- Test valid source with endpoints

#### search_endpoint
- Test fuzzy search functionality
- Test empty search results
- Test search with various query types
- Test search scoring and ranking

### 4. Error Handling Tests
Test all error scenarios:

#### Configuration Errors
- Missing CONFIG_PATH environment variable
- Invalid configuration file
- Configuration file not found
- Invalid YAML format

#### Parser Errors
- Network errors for HTTP sources
- File not found for file sources
- Invalid OpenAPI format
- Circular references

#### Runtime Errors
- Refresh operation failures
- File watcher errors
- Timer setup failures
- Memory/resource constraints

### 5. Performance Tests
Test performance characteristics:

#### Concurrent Operations
- Multiple simultaneous tool calls
- Refresh operations during tool calls
- Configuration changes during operations

#### Memory Usage
- Large OpenAPI specifications
- Many concurrent sources
- Long-running operations

#### Response Times
- Tool response times under load
- Search performance with large datasets
- Configuration reload times

## Test Data Requirements

### Mock Configurations
```typescript
const mockConfig: SwaggerMCPConfig = {
  sources: [
    {
      name: "test-api",
      source: "https://api.test.com/swagger.json",
      description: "Test API",
      type: "http",
      headers: { "Authorization": "Bearer token" }
    },
    {
      name: "local-api",
      source: "/path/to/local/swagger.json",
      description: "Local API",
      type: "file"
    }
  ],
  search: { fuzzyThreshold: 0.6 },
  refreshInterval: 300
};
```

### Mock OpenAPI Specifications
- Valid OpenAPI 3.0 specification
- Valid OpenAPI 2.0 specification
- Invalid specifications (various error types)
- Large specifications (performance testing)
- Specifications with circular references

### Mock Network Responses
- Successful HTTP responses
- Network timeout scenarios
- HTTP error responses (4xx, 5xx)
- Connection failures

## Testing Tools and Utilities

### Recommended Mocking Strategy
1. **External Dependencies**: Mock all external libraries (fs, axios, etc.)
2. **Time-based Operations**: Mock timers and intervals
3. **Environment Variables**: Mock process.env
4. **File System**: Mock file operations
5. **Network Requests**: Mock HTTP requests

### Test Utilities
Create helper functions for:
- Setting up mock configurations
- Creating mock OpenAPI specifications
- Simulating network conditions
- Managing test timers and intervals
- Cleaning up test resources

## Test Environment Setup

### Prerequisites
- Jest test runner with TypeScript support
- Proper Jest configuration for ES modules
- Mock implementations for external dependencies
- Test-specific environment variables

### Configuration Files
- `jest.config.cjs` - Jest configuration
- `tsconfig.json` - TypeScript configuration
- `.env.test` - Test environment variables

## Coverage Goals
- 100% function coverage for utility functions
- 95% line coverage for core functionality
- 90% branch coverage for error handling
- Integration test coverage for all MCP tools

## Continuous Integration
- Run tests on every commit
- Performance benchmarks on releases
- Integration tests with real OpenAPI specifications
- Security tests for environment variable handling

## Known Issues
1. Jest globals not properly loaded in test environment
2. ES module imports require specific Jest configuration
3. Mocking complex external dependencies
4. Testing file system operations in CI environment
5. Managing test timeouts for async operations

## Next Steps
1. Fix Jest configuration issues
2. Implement utility function tests first
3. Add integration tests for MCP tools
4. Create performance benchmarks
5. Add end-to-end tests with real APIs
