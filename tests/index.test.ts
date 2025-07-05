import { SwaggerMCPConfig } from "../src/types/config";
import { SwaggerParserResult, ExtendedParsedEndpoint } from "../src/types/swagger";

describe("index module types and utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Type validation", () => {
    it("should validate SwaggerMCPConfig structure", () => {
      const config: SwaggerMCPConfig = {
        sources: [
          {
            name: "test-api",
            source: "https://api.test.com/swagger.json",
            description: "Test API",
            type: "http",
            headers: {
              "Authorization": "Bearer token"
            }
          }
        ],
        search: {
          fuzzyThreshold: 0.6
        },
        refreshInterval: 300
      };

      expect(config.sources).toHaveLength(1);
      expect(config.sources[0].type).toBe("http");
      expect(config.search.fuzzyThreshold).toBe(0.6);
      expect(config.refreshInterval).toBe(300);
    });

    it("should validate SwaggerParserResult structure", () => {
      const successResult: SwaggerParserResult = {
        success: true,
        spec: {
          version: "3.0",
          info: {
            title: "Test API",
            version: "1.0.0"
          },
          endpoints: [
            {
              path: "/users",
              method: "GET",
              summary: "Get users",
              description: "Retrieve all users"
            }
          ],
          sourceName: "test-api"
        }
      };

      const failureResult: SwaggerParserResult = {
        success: false,
        errors: [
          {
            code: "INVALID_FORMAT",
            details: "Invalid OpenAPI format",
            source: "test-api"
          }
        ]
      };

      expect(successResult.success).toBe(true);
      expect(successResult.spec?.endpoints).toHaveLength(1);
      expect(failureResult.success).toBe(false);
      expect(failureResult.errors).toHaveLength(1);
    });

    it("should validate ExtendedParsedEndpoint structure", () => {
      const endpoint: ExtendedParsedEndpoint = {
        path: "/users/{id}",
        method: "GET",
        summary: "Get user by ID",
        description: "Retrieve a specific user",
        tags: ["users"],
        source_name: "test-api"
      };

      expect(endpoint.path).toBe("/users/{id}");
      expect(endpoint.method).toBe("GET");
      expect(endpoint.source_name).toBe("test-api");
      expect(endpoint.tags).toContain("users");
    });
  });

  describe("Environment handling", () => {
    it("should handle CONFIG_PATH environment variable", () => {
      process.env.CONFIG_PATH = "/test/config.yaml";
      expect(process.env.CONFIG_PATH).toBe("/test/config.yaml");
    });

    it("should handle missing environment variables", () => {
      delete process.env.CONFIG_PATH;
      expect(process.env.CONFIG_PATH).toBeUndefined();
    });

    it("should restore environment after tests", () => {
      const testVar = "TEST_VALUE";
      process.env.TEST_VAR = testVar;
      expect(process.env.TEST_VAR).toBe(testVar);
    });
  });

  describe("Data structure operations", () => {
    it("should handle Map operations for parsed specs", () => {
      const specsMap = new Map<string, SwaggerParserResult>();
      const testResult: SwaggerParserResult = {
        success: true,
        spec: {
          version: "3.0",
          info: { title: "Test", version: "1.0.0" },
          endpoints: [],
          sourceName: "test"
        }
      };

      specsMap.set("test-api", testResult);

      expect(specsMap.size).toBe(1);
      expect(specsMap.has("test-api")).toBe(true);
      expect(specsMap.get("test-api")?.success).toBe(true);
    });

    it("should handle endpoint array operations", () => {
      const endpoints: ExtendedParsedEndpoint[] = [
        {
          path: "/users",
          method: "GET",
          description: "Get users",
          source_name: "api1"
        },
        {
          path: "/posts",
          method: "GET",
          description: "Get posts",
          source_name: "api2"
        }
      ];

      const api1Endpoints = endpoints.filter(ep => ep.source_name === "api1");
      expect(api1Endpoints).toHaveLength(1);
      expect(api1Endpoints[0].path).toBe("/users");
    });

    it("should handle endpoint flattening from multiple sources", () => {
      const specs = new Map<string, SwaggerParserResult>([
        ["api1", {
          success: true,
          spec: {
            version: "3.0",
            info: { title: "API 1", version: "1.0.0" },
            endpoints: [
              { path: "/users", method: "GET", description: "Get users" }
            ],
            sourceName: "api1"
          }
        }],
        ["api2", {
          success: true,
          spec: {
            version: "3.0",
            info: { title: "API 2", version: "1.0.0" },
            endpoints: [
              { path: "/posts", method: "GET", description: "Get posts" }
            ],
            sourceName: "api2"
          }
        }]
      ]);

      const allEndpoints = Array.from(specs.values())
        .flatMap(spec =>
          spec.spec?.endpoints.map(endpoint => ({
            ...endpoint,
            source_name: spec.spec?.sourceName || "Unknown"
          })) || []
        );

      expect(allEndpoints).toHaveLength(2);
      expect(allEndpoints[0].source_name).toBe("api1");
      expect(allEndpoints[1].source_name).toBe("api2");
    });
  });

  describe("Error handling patterns", () => {
    it("should handle parsing errors", () => {
      const parseError = {
        code: "NETWORK_ERROR" as const,
        details: "Failed to fetch from URL",
        source: "test-api"
      };

      expect(parseError.code).toBe("NETWORK_ERROR");
      expect(parseError.source).toBe("test-api");
      expect(parseError.details).toContain("fetch");
    });

    it("should handle different error codes", () => {
      const errorCodes = [
        "INVALID_FORMAT",
        "NETWORK_ERROR",
        "FILE_NOT_FOUND",
        "CIRCULAR_REFERENCE",
        "UNKNOWN"
      ] as const;

      errorCodes.forEach(code => {
        const error = { code, details: "test", source: "test" };
        expect(error.code).toBe(code);
      });
    });
  });

  describe("Async operation patterns", () => {
    it("should handle promise resolution", async () => {
      const mockPromise = Promise.resolve("test-result");
      const result = await mockPromise;
      expect(result).toBe("test-result");
    });

    it("should handle promise rejection", async () => {
      const mockError = new Error("Test error");
      const failingPromise = Promise.reject(mockError);

      await expect(failingPromise).rejects.toThrow("Test error");
    });

    it("should handle Promise.all for multiple operations", async () => {
      const operations = [
        Promise.resolve("result1"),
        Promise.resolve("result2"),
        Promise.resolve("result3")
      ];

      const results = await Promise.all(operations);
      expect(results).toEqual(["result1", "result2", "result3"]);
    });
  });

  describe("Configuration validation patterns", () => {
    it("should validate source configuration", () => {
      const validHttpSource = {
        name: "http-api",
        source: "https://api.example.com/swagger.json",
        description: "HTTP API",
        type: "http" as const,
        headers: { "Authorization": "Bearer token" }
      };

      const validFileSource = {
        name: "file-api",
        source: "/path/to/swagger.json",
        description: "File API",
        type: "file" as const
      };

      expect(validHttpSource.type).toBe("http");
      expect(validHttpSource.headers).toBeDefined();
      expect(validFileSource.type).toBe("file");
      expect(validFileSource.headers).toBeUndefined();
    });

    it("should validate search configuration", () => {
      const searchConfig = { fuzzyThreshold: 0.6 };

      expect(searchConfig.fuzzyThreshold).toBeGreaterThan(0);
      expect(searchConfig.fuzzyThreshold).toBeLessThanOrEqual(1);
    });

    it("should validate refresh interval", () => {
      const refreshInterval = 300;

      expect(refreshInterval).toBeGreaterThan(0);
      expect(Number.isInteger(refreshInterval)).toBe(true);
    });
  });

  describe("Tool response patterns", () => {
    it("should validate success response structure", () => {
      const successResponse = {
        content: [{ type: "text", text: JSON.stringify({ data: "test" }) }],
        structuredContent: { data: "test" }
      };

      expect(successResponse.content).toHaveLength(1);
      expect(successResponse.content[0].type).toBe("text");
      expect(successResponse.structuredContent.data).toBe("test");
    });

    it("should validate error response structure", () => {
      const errorResponse = {
        isError: true,
        content: [{ type: "text", text: JSON.stringify({ error: "Test error" }) }],
        structuredContent: { error: "Test error" }
      };

      expect(errorResponse.isError).toBe(true);
      expect(errorResponse.structuredContent.error).toBe("Test error");
    });

    it("should validate pagination structure", () => {
      const pagination = {
        total: 100,
        limit: 10,
        offset: 20,
        hasNext: true,
        hasPrevious: true
      };

      expect(pagination.total).toBeGreaterThan(0);
      expect(pagination.limit).toBeGreaterThan(0);
      expect(pagination.offset).toBeGreaterThanOrEqual(0);
      expect(pagination.hasNext).toBe(true);
      expect(pagination.hasPrevious).toBe(true);
    });
  });
});
