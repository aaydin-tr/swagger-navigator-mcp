import SwaggerParser from "@apidevtools/swagger-parser";
import axios from "axios";
import { SwaggerParserModule } from "../../src/parsers/swagger-parser";
import { SwaggerSource } from "../../src/types/config";
import { SwaggerParserOptions, OpenAPIDocument } from "../../src/types/swagger";

// Mock external dependencies
jest.mock("@apidevtools/swagger-parser");
jest.mock("axios");

const mockSwaggerParser = SwaggerParser as jest.Mocked<typeof SwaggerParser>;
const mockAxios = axios as jest.Mocked<typeof axios>;

describe("SwaggerParserModule", () => {
  let swaggerParser: SwaggerParserModule;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    swaggerParser = new SwaggerParserModule();
  });

  describe("parse", () => {
    describe("file sources", () => {
      it("should parse a valid Swagger 2.0 file", async () => {
        const mockSwaggerV2: OpenAPIDocument = {
          swagger: "2.0",
          info: { title: "Test API", version: "1.0.0" },
          paths: {
            "/test": {
              get: {
                summary: "Test endpoint",
                responses: { "200": { description: "Success" } }
              }
            }
          }
        };

        mockSwaggerParser.validate.mockResolvedValue(mockSwaggerV2 as any);

        const source: SwaggerSource = {
          name: "test-api",
          source: "/path/to/swagger.json",
          type: "file",
          description: "Test API description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec).toBeDefined();
        expect(result.spec?.version).toBe("2.0");
        expect(result.spec?.info.title).toBe("Test API");
        expect(result.spec?.endpoints).toHaveLength(1);
        expect(result.spec?.endpoints[0].path).toBe("/test");
        expect(result.spec?.endpoints[0].method).toBe("GET");
        expect(mockSwaggerParser.validate).toHaveBeenCalledWith(source.source);
      });

      it("should parse a valid OpenAPI 3.0 file", async () => {
        const mockOpenAPIV3: OpenAPIDocument = {
          openapi: "3.0.0",
          info: { title: "Test API", version: "1.0.0" },
          servers: [{ url: "https://api.example.com" }],
          paths: {
            "/users": {
              post: {
                summary: "Create user",
                requestBody: {
                  content: {
                    "application/json": {
                      schema: { type: "object" }
                    }
                  }
                },
                responses: { "201": { description: "Created" } }
              }
            }
          }
        };

        mockSwaggerParser.validate.mockResolvedValue(mockOpenAPIV3 as any);

        const source: SwaggerSource = {
          name: "test-api-v3",
          source: "/path/to/openapi.yaml",
          type: "file",
          description: "Test API v3 description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec).toBeDefined();
        expect(result.spec?.version).toBe("3.0");
        expect(result.spec?.servers).toHaveLength(1);
        expect(result.spec?.endpoints).toHaveLength(1);
        expect(result.spec?.endpoints[0].path).toBe("/users");
        expect(result.spec?.endpoints[0].method).toBe("POST");
      });

      it("should parse a valid OpenAPI 3.1 file", async () => {
        const mockOpenAPIV31: OpenAPIDocument = {
          openapi: "3.1.0",
          info: { title: "Test API", version: "1.0.0" },
          paths: {
            "/health": {
              get: {
                summary: "Health check",
                responses: { "200": { description: "OK" } }
              }
            }
          }
        };

        mockSwaggerParser.validate.mockResolvedValue(mockOpenAPIV31 as any);

        const source: SwaggerSource = {
          name: "test-api-v31",
          source: "/path/to/openapi31.json",
          type: "file",
          description: "Test API v3.1 description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.version).toBe("3.1");
      });

      it("should handle file parsing errors", async () => {
        const error = new Error("ENOENT: no such file or directory");
        mockSwaggerParser.validate.mockRejectedValue(error);

        const source: SwaggerSource = {
          name: "missing-file",
          source: "/path/to/missing.json",
          type: "file",
          description: "Missing file description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe("FILE_NOT_FOUND");
        expect(result.errors?.[0].source).toBe("missing-file");
      });

      it("should handle circular reference errors", async () => {
        const error = new Error("Circular reference detected");
        mockSwaggerParser.validate.mockRejectedValue(error);

        const source: SwaggerSource = {
          name: "circular-ref",
          source: "/path/to/circular.json",
          type: "file",
          description: "Circular ref description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(false);
        expect(result.errors?.[0].code).toBe("CIRCULAR_REFERENCE");
      });

      it("should handle invalid format errors", async () => {
        const error = new Error("Invalid schema format");
        mockSwaggerParser.validate.mockRejectedValue(error);

        const source: SwaggerSource = {
          name: "invalid-format",
          source: "/path/to/invalid.json",
          type: "file",
          description: "Invalid format description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(false);
        expect(result.errors?.[0].code).toBe("INVALID_FORMAT");
      });

      it("should apply dereference option when requested", async () => {
        const mockSpec: OpenAPIDocument = {
          openapi: "3.0.0",
          info: { title: "Test API", version: "1.0.0" },
          paths: {}
        };

        mockSwaggerParser.validate.mockResolvedValue(mockSpec as any);
        mockSwaggerParser.dereference.mockResolvedValue(mockSpec as any);

        const source: SwaggerSource = {
          name: "test-api",
          source: "/path/to/swagger.json",
          type: "file",
          description: "Test API for dereference"
        };

        const options: SwaggerParserOptions = { dereference: true };

        await swaggerParser.parse(source, options);

        expect(mockSwaggerParser.dereference).toHaveBeenCalledWith(mockSpec);
      });
    });

    describe("HTTP sources", () => {
      it("should parse a valid HTTP JSON source", async () => {
        const mockResponse = {
          data: {
            swagger: "2.0",
            info: { title: "HTTP API", version: "1.0.0" },
            paths: {
              "/api": {
                get: {
                  summary: "API endpoint",
                  responses: { "200": { description: "Success" } }
                }
              }
            }
          }
        };

        mockAxios.get.mockResolvedValue(mockResponse);
        mockSwaggerParser.validate.mockResolvedValue(mockResponse.data as any);

        const source: SwaggerSource = {
          name: "http-api",
          source: "https://api.example.com/swagger.json",
          type: "http",
          headers: { "Authorization": "Bearer token" },
          description: "HTTP API description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.info.title).toBe("HTTP API");
        expect(mockAxios.get).toHaveBeenCalledWith(
          source.source,
          expect.objectContaining({
            headers: source.headers,
            timeout: 30000,
            validateStatus: expect.any(Function)
          })
        );
      });

      it("should parse a valid HTTP string source", async () => {
        const mockJsonString = JSON.stringify({
          swagger: "2.0",
          info: { title: "String API", version: "1.0.0" },
          paths: {}
        });

        const mockResponse = { data: mockJsonString };

        mockAxios.get.mockResolvedValue(mockResponse);
        mockSwaggerParser.validate.mockResolvedValue(JSON.parse(mockJsonString) as any);

        const source: SwaggerSource = {
          name: "string-api",
          source: "https://api.example.com/swagger.json",
          type: "http",
          description: "String API description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.info.title).toBe("String API");
      });

      it("should handle invalid JSON string gracefully", async () => {
        const mockYamlString = "swagger: '2.0'\ninfo:\n  title: YAML API";
        const mockResponse = { data: mockYamlString };

        mockAxios.get.mockResolvedValue(mockResponse);
        mockSwaggerParser.validate.mockResolvedValue({
          swagger: "2.0",
          info: { title: "YAML API", version: "1.0.0" }
        } as any);

        const source: SwaggerSource = {
          name: "yaml-api",
          source: "https://api.example.com/swagger.yaml",
          type: "http",
          description: "YAML API description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.info.title).toBe("YAML API");
      });

      it("should handle HTTP 404 error", async () => {
        const error = {
          response: {
            status: 404,
            statusText: "Not Found"
          }
        };

        mockAxios.get.mockRejectedValue(error);
        mockAxios.isAxiosError.mockReturnValue(true);

        const source: SwaggerSource = {
          name: "not-found-api",
          source: "https://api.example.com/missing.json",
          type: "http",
          description: "Not found API description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(false);
        expect(result.errors?.[0].code).toBe("NETWORK_ERROR");
      });

      it("should handle network timeout", async () => {
        const error = { request: {} };

        mockAxios.get.mockRejectedValue(error);
        mockAxios.isAxiosError.mockReturnValue(true);

        const source: SwaggerSource = {
          name: "timeout-api",
          source: "https://api.example.com/slow.json",
          type: "http",
          description: "Timeout API description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(false);
        expect(result.errors?.[0].code).toBe("NETWORK_ERROR");
      });

      it("should handle request configuration error", async () => {
        const error = { message: "Request configuration error" };

        mockAxios.get.mockRejectedValue(error);
        mockAxios.isAxiosError.mockReturnValue(true);

        const source: SwaggerSource = {
          name: "config-error-api",
          source: "invalid-url",
          type: "http",
          description: "Config error API description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(false);
        expect(result.errors?.[0].code).toBe("UNKNOWN");
      });

      it("should handle non-axios errors", async () => {
        const error = new Error("Unknown error");

        mockAxios.get.mockRejectedValue(error);
        mockAxios.isAxiosError.mockReturnValue(false);

        const source: SwaggerSource = {
          name: "unknown-error-api",
          source: "https://api.example.com/error.json",
          type: "http",
          description: "Unknown error API description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(false);
        expect(result.errors?.[0].code).toBe("UNKNOWN");
      });

      it("should use custom timeout option", async () => {
        const mockResponse = {
          data: {
            swagger: "2.0",
            info: { title: "Test API", version: "1.0.0" },
            paths: {}
          }
        };

        mockAxios.get.mockResolvedValue(mockResponse);
        mockSwaggerParser.validate.mockResolvedValue(mockResponse.data as any);

        const source: SwaggerSource = {
          name: "custom-timeout-api",
          source: "https://api.example.com/swagger.json",
          type: "http",
          description: "Custom timeout API description"
        };

        const options: SwaggerParserOptions = { timeout: 60000 };

        await swaggerParser.parse(source, options);

        expect(mockAxios.get).toHaveBeenCalledWith(
          source.source,
          expect.objectContaining({
            timeout: 60000
          })
        );
      });
    });

    describe("endpoint extraction", () => {
      it("should extract all HTTP methods from Swagger 2.0", async () => {
        const mockSwagger2: OpenAPIDocument = {
          swagger: "2.0",
          info: { title: "Test API", version: "1.0.0" },
          paths: {
            "/test": {
              get: { summary: "Get test", responses: { "200": { description: "OK" } } },
              post: { summary: "Post test", responses: { "201": { description: "Created" } } },
              put: { summary: "Put test", responses: { "200": { description: "OK" } } },
              delete: { summary: "Delete test", responses: { "204": { description: "No Content" } } },
              patch: { summary: "Patch test", responses: { "200": { description: "OK" } } },
              head: { summary: "Head test", responses: { "200": { description: "OK" } } },
              options: { summary: "Options test", responses: { "200": { description: "OK" } } }
            }
          }
        };

        mockSwaggerParser.validate.mockResolvedValue(mockSwagger2 as any);

        const source: SwaggerSource = {
          name: "methods-test",
          source: "/path/to/swagger.json",
          type: "file",
          description: "Methods test description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.endpoints).toHaveLength(7); // No TRACE in Swagger 2.0

        const methods = result.spec?.endpoints.map(e => e.method);
        expect(methods).toContain("GET");
        expect(methods).toContain("POST");
        expect(methods).toContain("PUT");
        expect(methods).toContain("DELETE");
        expect(methods).toContain("PATCH");
        expect(methods).toContain("HEAD");
        expect(methods).toContain("OPTIONS");
        expect(methods).not.toContain("TRACE");
      });

      it("should extract all HTTP methods from OpenAPI 3.0 including TRACE", async () => {
        const mockOpenAPI3: OpenAPIDocument = {
          openapi: "3.0.0",
          info: { title: "Test API", version: "1.0.0" },
          paths: {
            "/test": {
              get: { summary: "Get test", responses: { "200": { description: "OK" } } },
              trace: { summary: "Trace test", responses: { "200": { description: "OK" } } }
            }
          }
        };

        mockSwaggerParser.validate.mockResolvedValue(mockOpenAPI3 as any);

        const source: SwaggerSource = {
          name: "trace-test",
          source: "/path/to/openapi.json",
          type: "file",
          description: "Trace test description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.endpoints).toHaveLength(2);

        const methods = result.spec?.endpoints.map(e => e.method);
        expect(methods).toContain("GET");
        expect(methods).toContain("TRACE");
      });

      it("should handle endpoints with all optional properties", async () => {
        const mockSpec: OpenAPIDocument = {
          openapi: "3.0.0",
          info: { title: "Test API", version: "1.0.0" },
          paths: {
            "/complete": {
              get: {
                operationId: "getComplete",
                summary: "Complete endpoint",
                description: "A complete endpoint with all properties",
                tags: ["test", "complete"],
                parameters: [
                  { name: "id", in: "path", required: true, schema: { type: "string" } }
                ],
                requestBody: {
                  content: {
                    "application/json": {
                      schema: { type: "object" }
                    }
                  }
                },
                responses: { "200": { description: "OK" } },
                security: [{ apiKey: [] }],
                deprecated: true,
                servers: [{ url: "https://api.example.com" }]
              }
            }
          }
        };

        mockSwaggerParser.validate.mockResolvedValue(mockSpec as any);

        const source: SwaggerSource = {
          name: "complete-test",
          source: "/path/to/complete.json",
          type: "file",
          description: "Complete test description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.endpoints).toHaveLength(1);

        const endpoint = result.spec?.endpoints[0];
        expect(endpoint?.operationId).toBe("getComplete");
        expect(endpoint?.summary).toBe("Complete endpoint");
        expect(endpoint?.description).toBe("A complete endpoint with all properties");
        expect(endpoint?.tags).toEqual(["test", "complete"]);
        expect(endpoint?.parameters).toHaveLength(1);
        expect(endpoint?.requestBody).toBeDefined();
        expect(endpoint?.security).toBeDefined();
        expect(endpoint?.deprecated).toBe(true);
        expect(endpoint?.servers).toHaveLength(1);
      });

      it("should handle empty paths object", async () => {
        const mockSpec: OpenAPIDocument = {
          swagger: "2.0",
          info: { title: "Empty API", version: "1.0.0" },
          paths: {}
        };

        mockSwaggerParser.validate.mockResolvedValue(mockSpec as any);

        const source: SwaggerSource = {
          name: "empty-paths",
          source: "/path/to/empty.json",
          type: "file",
          description: "Empty paths description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.endpoints).toHaveLength(0);
      });

      it("should handle missing paths object", async () => {
        const mockSpec = {
          swagger: "2.0",
          info: { title: "No Paths API", version: "1.0.0" }
        } as OpenAPIDocument;

        mockSwaggerParser.validate.mockResolvedValue(mockSpec as any);

        const source: SwaggerSource = {
          name: "no-paths",
          source: "/path/to/no-paths.json",
          type: "file",
          description: "No paths description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.endpoints).toHaveLength(0);
      });
    });

    describe("version detection", () => {
      it("should detect Swagger 2.0 version", async () => {
        const mockSpec: OpenAPIDocument = {
          swagger: "2.0",
          info: { title: "Test API", version: "1.0.0" },
          paths: {}
        };

        mockSwaggerParser.validate.mockResolvedValue(mockSpec as any);

        const source: SwaggerSource = {
          name: "swagger-2",
          source: "/path/to/swagger2.json",
          type: "file",
          description: "Swagger 2 description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.version).toBe("2.0");
      });

      it("should detect OpenAPI 3.0 version", async () => {
        const mockSpec: OpenAPIDocument = {
          openapi: "3.0.2",
          info: { title: "Test API", version: "1.0.0" },
          paths: {}
        };

        mockSwaggerParser.validate.mockResolvedValue(mockSpec as any);

        const source: SwaggerSource = {
          name: "openapi-3",
          source: "/path/to/openapi3.json",
          type: "file",
          description: "OpenAPI 3 description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.version).toBe("3.0");
      });

      it("should detect OpenAPI 3.1 version", async () => {
        const mockSpec: OpenAPIDocument = {
          openapi: "3.1.0",
          info: { title: "Test API", version: "1.0.0" },
          paths: {}
        };

        mockSwaggerParser.validate.mockResolvedValue(mockSpec as any);

        const source: SwaggerSource = {
          name: "openapi-31",
          source: "/path/to/openapi31.json",
          type: "file",
          description: "OpenAPI 3.1 description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.version).toBe("3.1");
      });

      it("should default to version 2.0 when no version is specified", async () => {
        const mockSpec: OpenAPIDocument = {
          swagger: "2.0",
          info: { title: "Test API", version: "1.0.0" },
          paths: {}
        };

        mockSwaggerParser.validate.mockResolvedValue(mockSpec as any);

        const source: SwaggerSource = {
          name: "no-version",
          source: "/path/to/no-version.json",
          type: "file",
          description: "No version description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.version).toBe("2.0");
      });
    });

    describe("warnings detection", () => {
              it("should detect missing title warning", async () => {
          const mockSpec: OpenAPIDocument = {
            swagger: "2.0",
            info: { version: "1.0.0" } as any,
            paths: {}
          };

          mockSwaggerParser.validate.mockResolvedValue(mockSpec as any);

          const source: SwaggerSource = {
            name: "missing-title",
            source: "/path/to/missing-title.json",
            type: "file",
            description: "Missing title description"
          };

          const result = await swaggerParser.parse(source);

          expect(result.success).toBe(true);
          expect(result.warnings).toContain("Missing API title in info section");
        });

              it("should detect missing version warning", async () => {
          const mockSpec: OpenAPIDocument = {
            swagger: "2.0",
            info: { title: "Test API" } as any,
            paths: {}
          };

          mockSwaggerParser.validate.mockResolvedValue(mockSpec as any);

          const source: SwaggerSource = {
            name: "missing-version",
            source: "/path/to/missing-version.json",
            type: "file",
            description: "Missing version description"
          };

          const result = await swaggerParser.parse(source);

          expect(result.success).toBe(true);
          expect(result.warnings).toContain("Missing API version in info section");
        });

              it("should detect both missing title and version warnings", async () => {
          const mockSpec: OpenAPIDocument = {
            swagger: "2.0",
            info: {} as any,
            paths: {}
          };

          mockSwaggerParser.validate.mockResolvedValue(mockSpec as any);

          const source: SwaggerSource = {
            name: "missing-both",
            source: "/path/to/missing-both.json",
            type: "file",
            description: "Missing both description"
          };

          const result = await swaggerParser.parse(source);

          expect(result.success).toBe(true);
          expect(result.warnings).toContain("Missing API title in info section");
          expect(result.warnings).toContain("Missing API version in info section");
        });

      it("should not generate warnings for complete info", async () => {
        const mockSpec: OpenAPIDocument = {
          swagger: "2.0",
          info: { title: "Complete API", version: "1.0.0" },
          paths: {}
        };

        mockSwaggerParser.validate.mockResolvedValue(mockSpec as any);

        const source: SwaggerSource = {
          name: "complete-info",
          source: "/path/to/complete.json",
          type: "file",
          description: "Complete info description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });
    });

    describe("spec conversion", () => {
      it("should convert Swagger 2.0 spec correctly", async () => {
        const mockSwagger2: OpenAPIDocument = {
          swagger: "2.0",
          info: { title: "Swagger 2.0 API", version: "1.0.0" },
          host: "api.example.com",
          basePath: "/v1",
          schemes: ["https"],
          paths: {},
          definitions: {
            User: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" }
              }
            }
          },
          securityDefinitions: {
            apiKey: {
              type: "apiKey",
              in: "header",
              name: "X-API-Key"
            }
          }
        };

        mockSwaggerParser.validate.mockResolvedValue(mockSwagger2 as any);

        const source: SwaggerSource = {
          name: "swagger2-complete",
          source: "/path/to/swagger2.json",
          type: "file",
          description: "Swagger 2 complete description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.version).toBe("2.0");
        expect(result.spec?.host).toBe("api.example.com");
        expect(result.spec?.basePath).toBe("/v1");
        expect(result.spec?.schemes).toEqual(["https"]);
        expect(result.spec?.definitions).toBeDefined();
        expect(result.spec?.securityDefinitions).toBeDefined();
        expect(result.spec?.servers).toBeUndefined();
        expect(result.spec?.components).toBeUndefined();
      });

      it("should convert OpenAPI 3.0 spec correctly", async () => {
        const mockOpenAPI3: OpenAPIDocument = {
          openapi: "3.0.0",
          info: { title: "OpenAPI 3.0 API", version: "1.0.0" },
          servers: [
            { url: "https://api.example.com/v1" },
            { url: "https://staging.api.example.com/v1" }
          ],
          paths: {},
          components: {
            schemas: {
              User: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  name: { type: "string" }
                }
              }
            },
            securitySchemes: {
              bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT"
              }
            }
          }
        };

        mockSwaggerParser.validate.mockResolvedValue(mockOpenAPI3 as any);

        const source: SwaggerSource = {
          name: "openapi3-complete",
          source: "/path/to/openapi3.json",
          type: "file",
          description: "OpenAPI 3 complete description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.version).toBe("3.0");
        expect(result.spec?.servers).toHaveLength(2);
        expect(result.spec?.components).toBeDefined();
        expect(result.spec?.host).toBeUndefined();
        expect(result.spec?.basePath).toBeUndefined();
        expect(result.spec?.schemes).toBeUndefined();
        expect(result.spec?.definitions).toBeUndefined();
        expect(result.spec?.securityDefinitions).toBeUndefined();
      });

      it("should include source name in parsed spec", async () => {
        const mockSpec: OpenAPIDocument = {
          swagger: "2.0",
          info: { title: "Test API", version: "1.0.0" },
          paths: {}
        };

        mockSwaggerParser.validate.mockResolvedValue(mockSpec as any);

        const source: SwaggerSource = {
          name: "test-source-name",
          source: "/path/to/test.json",
          type: "file",
          description: "Test source name description"
        };

        const result = await swaggerParser.parse(source);

        expect(result.success).toBe(true);
        expect(result.spec?.sourceName).toBe("test-source-name");
      });
    });
  });
});
