import SwaggerParser from "@apidevtools/swagger-parser";
import axios from "axios";
import { SwaggerParserModule } from "../../src/parsers/swagger-parser";
import { SwaggerSource } from "../../src/types/config";
import { OpenAPIDocument } from "../../src/types/swagger";

// Mock dependencies
jest.mock("@apidevtools/swagger-parser");
jest.mock("axios");

const mockSwaggerParser = SwaggerParser as jest.Mocked<typeof SwaggerParser>;
const mockAxios = axios as jest.Mocked<typeof axios>;

describe("parsers/swagger-parser", () => {
  let swaggerParser: SwaggerParserModule;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    swaggerParser = new SwaggerParserModule();
  });

  describe("parse", () => {
    it("should parse a file source successfully", async () => {
      // Setup
      const fileSource: SwaggerSource = {
        name: "test-file",
        source: "./test-swagger.json",
        description: "Test file source",
        type: "file"
      };

      const mockOpenApiDoc: OpenAPIDocument = {
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        },
        paths: {
          "/users": {
            get: {
              summary: "Get users",
              operationId: "getUsers",
              responses: {
                "200": {
                  description: "Success"
                }
              }
            }
          }
        }
      };

      mockSwaggerParser.validate.mockResolvedValue(mockOpenApiDoc as any);

      // Execute
      const result = await swaggerParser.parse(fileSource);

      // Verify
      expect(result.success).toBe(true);
      expect(result.spec).toBeDefined();
      expect(result.spec!.version).toBe("3.0");
      expect(result.spec!.info.title).toBe("Test API");
      expect(result.spec!.endpoints).toHaveLength(1);
      expect(result.spec!.endpoints[0].path).toBe("/users");
      expect(result.spec!.endpoints[0].method).toBe("GET");
      expect(result.spec!.sourceName).toBe("test-file");
      expect(mockSwaggerParser.validate).toHaveBeenCalledWith(fileSource.source);
    });

    it("should parse an HTTP source successfully", async () => {
      // Setup
      const httpSource: SwaggerSource = {
        name: "test-http",
        source: "https://api.example.com/swagger.json",
        description: "Test HTTP source",
        type: "http",
        headers: {
          Authorization: "Bearer token"
        }
      };

      const mockOpenApiDoc: OpenAPIDocument = {
        swagger: "2.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        },
        paths: {
          "/posts": {
            post: {
              summary: "Create post",
              operationId: "createPost",
              parameters: [
                {
                  name: "body",
                  in: "body",
                  required: true,
                  schema: {
                    type: "object"
                  }
                }
              ],
              responses: {
                "201": {
                  description: "Created"
                }
              }
            }
          }
        }
      };

      const mockHttpResponse = {
        data: mockOpenApiDoc
      };

      mockAxios.get.mockResolvedValue(mockHttpResponse);
      mockSwaggerParser.validate.mockResolvedValue(mockOpenApiDoc as any);

      // Execute
      const result = await swaggerParser.parse(httpSource);

      // Verify
      expect(result.success).toBe(true);
      expect(result.spec).toBeDefined();
      expect(result.spec!.version).toBe("2.0");
      expect(result.spec!.info.title).toBe("Test API");
      expect(result.spec!.endpoints).toHaveLength(1);
      expect(result.spec!.endpoints[0].path).toBe("/posts");
      expect(result.spec!.endpoints[0].method).toBe("POST");
      expect(result.spec!.sourceName).toBe("test-http");
      expect(mockAxios.get).toHaveBeenCalledWith(httpSource.source, {
        headers: httpSource.headers,
        timeout: 30000,
        validateStatus: expect.any(Function)
      });
    });

    it("should handle file validation errors", async () => {
      // Setup
      const fileSource: SwaggerSource = {
        name: "invalid-file",
        source: "./invalid-swagger.json",
        description: "Invalid file source",
        type: "file"
      };

      const validationError = new Error("Invalid OpenAPI document");
      mockSwaggerParser.validate.mockRejectedValue(validationError);

      // Execute
      const result = await swaggerParser.parse(fileSource);

      // Verify
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].code).toBe("INVALID_FORMAT");
      expect(result.errors![0].source).toBe("invalid-file");
      expect(result.errors![0].details).toBe(validationError);
    });

    it("should handle HTTP fetch errors", async () => {
      // Setup
      const httpSource: SwaggerSource = {
        name: "failing-http",
        source: "https://api.example.com/swagger.json",
        description: "Failing HTTP source",
        type: "http"
      };

      const networkError = new Error("Network error: No response received");
      mockAxios.get.mockRejectedValue(networkError);

      // Execute
      const result = await swaggerParser.parse(httpSource);

      // Verify
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].code).toBe("NETWORK_ERROR");
      expect(result.errors![0].source).toBe("failing-http");
    });

    it("should handle file not found errors", async () => {
      // Setup
      const fileSource: SwaggerSource = {
        name: "missing-file",
        source: "./missing-swagger.json",
        description: "Missing file source",
        type: "file"
      };

      const fileNotFoundError = new Error("ENOENT: no such file or directory");
      mockSwaggerParser.validate.mockRejectedValue(fileNotFoundError);

      // Execute
      const result = await swaggerParser.parse(fileSource);

      // Verify
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].code).toBe("FILE_NOT_FOUND");
      expect(result.errors![0].source).toBe("missing-file");
    });

    it("should handle circular reference errors", async () => {
      // Setup
      const fileSource: SwaggerSource = {
        name: "circular-ref",
        source: "./circular-swagger.json",
        description: "Circular reference source",
        type: "file"
      };

      const circularError = new Error("Circular reference detected");
      mockSwaggerParser.validate.mockRejectedValue(circularError);

      // Execute
      const result = await swaggerParser.parse(fileSource);

      // Verify
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].code).toBe("CIRCULAR_REFERENCE");
      expect(result.errors![0].source).toBe("circular-ref");
    });
  });

  describe("fetchHttpContent", () => {
    it("should fetch HTTP content successfully", async () => {
      // Setup
      const httpSource: SwaggerSource = {
        name: "test-http",
        source: "https://api.example.com/swagger.json",
        description: "Test HTTP source",
        type: "http",
        headers: {
          Authorization: "Bearer token"
        }
      };

      const mockData = { openapi: "3.0.0", info: { title: "Test" } };
      mockAxios.get.mockResolvedValue({ data: mockData });

      // Execute
      const result = await (swaggerParser as any).fetchHttpContent(httpSource);

      // Verify
      expect(result).toEqual(mockData);
      expect(mockAxios.get).toHaveBeenCalledWith(httpSource.source, {
        headers: httpSource.headers,
        timeout: 30000,
        validateStatus: expect.any(Function)
      });
    });

    it("should handle JSON string responses", async () => {
      // Setup
      const httpSource: SwaggerSource = {
        name: "test-http",
        source: "https://api.example.com/swagger.json",
        description: "Test HTTP source",
        type: "http"
      };

      const jsonString = '{"openapi": "3.0.0", "info": {"title": "Test"}}';
      mockAxios.get.mockResolvedValue({ data: jsonString });

      // Execute
      const result = await (swaggerParser as any).fetchHttpContent(httpSource);

      // Verify
      expect(result).toEqual({ openapi: "3.0.0", info: { title: "Test" } });
    });

    it("should handle YAML string responses", async () => {
      // Setup
      const httpSource: SwaggerSource = {
        name: "test-http",
        source: "https://api.example.com/swagger.yaml",
        description: "Test HTTP source",
        type: "http"
      };

      const yamlString = "openapi: 3.0.0\ninfo:\n  title: Test";
      mockAxios.get.mockResolvedValue({ data: yamlString });

      // Execute
      const result = await (swaggerParser as any).fetchHttpContent(httpSource);

      // Verify
      expect(result).toBe(yamlString);
    });

    it("should handle HTTP response errors", async () => {
      // Setup
      const httpSource: SwaggerSource = {
        name: "test-http",
        source: "https://api.example.com/swagger.json",
        description: "Test HTTP source",
        type: "http"
      };

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          statusText: "Not Found"
        }
      };

      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.get.mockRejectedValue(axiosError);

      // Execute & Verify
      await expect((swaggerParser as any).fetchHttpContent(httpSource)).rejects.toThrow("HTTP 404: Not Found");
    });

    it("should handle network errors", async () => {
      // Setup
      const httpSource: SwaggerSource = {
        name: "test-http",
        source: "https://api.example.com/swagger.json",
        description: "Test HTTP source",
        type: "http"
      };

      const axiosError = {
        isAxiosError: true,
        request: {}
      };

      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.get.mockRejectedValue(axiosError);

      // Execute & Verify
      await expect((swaggerParser as any).fetchHttpContent(httpSource)).rejects.toThrow(
        "Network error: No response received"
      );
    });

    it("should handle request configuration errors", async () => {
      // Setup
      const httpSource: SwaggerSource = {
        name: "test-http",
        source: "https://api.example.com/swagger.json",
        description: "Test HTTP source",
        type: "http"
      };

      const axiosError = {
        isAxiosError: true,
        message: "Request configuration error"
      };

      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.get.mockRejectedValue(axiosError);

      // Execute & Verify
      await expect((swaggerParser as any).fetchHttpContent(httpSource)).rejects.toThrow(
        "Request error: Request configuration error"
      );
    });

    it("should handle unknown errors", async () => {
      // Setup
      const httpSource: SwaggerSource = {
        name: "test-http",
        source: "https://api.example.com/swagger.json",
        description: "Test HTTP source",
        type: "http"
      };

      const unknownError = new Error("Unknown error");
      mockAxios.isAxiosError.mockReturnValue(false);
      mockAxios.get.mockRejectedValue(unknownError);

      // Execute & Verify
      await expect((swaggerParser as any).fetchHttpContent(httpSource)).rejects.toThrow("Request error: Unknown error");
    });
  });

  describe("convertToInternalFormat", () => {
    it("should convert OpenAPI 3.0 document to internal format", () => {
      // Setup
      const openApiDoc: OpenAPIDocument = {
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0",
          description: "Test API description"
        },
        servers: [
          {
            url: "https://api.example.com",
            description: "Production server"
          }
        ],
        paths: {
          "/users": {
            get: {
              summary: "Get users",
              operationId: "getUsers",
              tags: ["users"],
              responses: {
                "200": {
                  description: "Success"
                }
              }
            }
          }
        },
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" }
              }
            }
          }
        }
      } as OpenAPIDocument;

      // Execute
      const result = (swaggerParser as any).convertToInternalFormat(openApiDoc, "test-source");

      // Verify
      expect(result.version).toBe("3.0");
      expect(result.info.title).toBe("Test API");
      expect(result.servers).toEqual((openApiDoc as any).servers);
      expect(result.components).toEqual((openApiDoc as any).components);
      expect(result.host).toBeUndefined();
      expect(result.basePath).toBeUndefined();
      expect(result.schemes).toBeUndefined();
      expect(result.definitions).toBeUndefined();
      expect(result.securityDefinitions).toBeUndefined();
      expect(result.sourceName).toBe("test-source");
      expect(result.endpoints).toHaveLength(1);
    });

    it("should convert Swagger 2.0 document to internal format", () => {
      // Setup
      const swaggerDoc: OpenAPIDocument = {
        swagger: "2.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        },
        host: "api.example.com",
        basePath: "/v1",
        schemes: ["https"],
        paths: {
          "/posts": {
            post: {
              summary: "Create post",
              operationId: "createPost",
              responses: {
                "201": {
                  description: "Created"
                }
              }
            }
          }
        },
        definitions: {
          Post: {
            type: "object",
            properties: {
              id: { type: "integer" },
              title: { type: "string" }
            }
          }
        },
        securityDefinitions: {
          apiKey: {
            type: "apiKey",
            name: "X-API-Key",
            in: "header"
          }
        }
      } as OpenAPIDocument;

      // Execute
      const result = (swaggerParser as any).convertToInternalFormat(swaggerDoc, "test-source");

      // Verify
      expect(result.version).toBe("2.0");
      expect(result.info.title).toBe("Test API");
      expect(result.host).toBe("api.example.com");
      expect(result.basePath).toBe("/v1");
      expect(result.schemes).toEqual(["https"]);
      expect(result.definitions).toEqual((swaggerDoc as any).definitions);
      expect(result.securityDefinitions).toEqual((swaggerDoc as any).securityDefinitions);
      expect(result.servers).toBeUndefined();
      expect(result.components).toBeUndefined();
      expect(result.sourceName).toBe("test-source");
      expect(result.endpoints).toHaveLength(1);
    });

    it("should handle documents with empty paths", () => {
      // Setup
      const openApiDoc: OpenAPIDocument = {
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0"
        },
        paths: {},
        components: {}
      } as OpenAPIDocument;

      // Execute
      const result = (swaggerParser as any).convertToInternalFormat(openApiDoc, "test-source");

      // Verify
      expect(result.endpoints).toHaveLength(0);
    });
  });

  describe("detectVersion", () => {
    it("should detect Swagger 2.0 version", () => {
      // Setup
      const swaggerDoc: OpenAPIDocument = {
        swagger: "2.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {}
      } as OpenAPIDocument;

      // Execute
      const result = (swaggerParser as any).detectVersion(swaggerDoc);

      // Verify
      expect(result).toBe("2.0");
    });

    it("should detect OpenAPI 3.0 version", () => {
      // Setup
      const openApiDoc: OpenAPIDocument = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {}
      } as OpenAPIDocument;

      // Execute
      const result = (swaggerParser as any).detectVersion(openApiDoc);

      // Verify
      expect(result).toBe("3.0");
    });

    it("should detect OpenAPI 3.1 version", () => {
      // Setup
      const openApiDoc: OpenAPIDocument = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {}
      } as OpenAPIDocument;

      // Execute
      const result = (swaggerParser as any).detectVersion(openApiDoc);

      // Verify
      expect(result).toBe("3.1");
    });

    it("should default to 2.0 when no version is specified", () => {
      // Setup
      const doc: OpenAPIDocument = {
        info: { title: "Test", version: "1.0.0" },
        paths: {}
      } as OpenAPIDocument;

      // Execute
      const result = (swaggerParser as any).detectVersion(doc);

      // Verify
      expect(result).toBe("2.0");
    });
  });

  describe("extractEndpoints", () => {
    it("should extract endpoints from OpenAPI 3.0 document", () => {
      // Setup
      const openApiDoc: OpenAPIDocument = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              summary: "Get users",
              operationId: "getUsers",
              tags: ["users"],
              responses: {
                "200": {
                  description: "Success"
                }
              }
            },
            post: {
              summary: "Create user",
              operationId: "createUser",
              tags: ["users"],
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      type: "object"
                    }
                  }
                }
              },
              responses: {
                "201": {
                  description: "Created"
                }
              }
            }
          },
          "/posts/{id}": {
            get: {
              summary: "Get post",
              operationId: "getPost",
              parameters: [
                {
                  name: "id",
                  in: "path",
                  required: true,
                  schema: {
                    type: "integer"
                  }
                }
              ],
              responses: {
                "200": {
                  description: "Success"
                }
              }
            },
            trace: {
              summary: "Trace post",
              operationId: "tracePost",
              responses: {
                "200": {
                  description: "Success"
                }
              }
            }
          }
        },
        components: {}
      } as OpenAPIDocument;

      // Execute
      const result = (swaggerParser as any).extractEndpoints(openApiDoc);

      // Verify
      expect(result).toHaveLength(4);

      // Check GET /users
      expect(result[0]).toEqual({
        path: "/users",
        method: "GET",
        summary: "Get users",
        operationId: "getUsers",
        tags: ["users"],
        responses: {
          "200": {
            description: "Success"
          }
        },
        parameters: undefined,
        description: undefined,
        security: undefined,
        deprecated: undefined
      });

      // Check POST /users
      expect(result[1]).toEqual({
        path: "/users",
        method: "POST",
        summary: "Create user",
        operationId: "createUser",
        tags: ["users"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Created"
          }
        },
        parameters: undefined,
        description: undefined,
        security: undefined,
        deprecated: undefined
      });

      // Check GET /posts/{id}
      expect(result[2]).toEqual({
        path: "/posts/{id}",
        method: "GET",
        summary: "Get post",
        operationId: "getPost",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer"
            }
          }
        ],
        responses: {
          "200": {
            description: "Success"
          }
        },
        tags: undefined,
        description: undefined,
        security: undefined,
        deprecated: undefined
      });

      // Check TRACE /posts/{id} (only available in OpenAPI 3.x)
      expect(result[3]).toEqual({
        path: "/posts/{id}",
        method: "TRACE",
        summary: "Trace post",
        operationId: "tracePost",
        responses: {
          "200": {
            description: "Success"
          }
        },
        parameters: undefined,
        tags: undefined,
        description: undefined,
        security: undefined,
        deprecated: undefined
      });
    });

    it("should extract endpoints from Swagger 2.0 document", () => {
      // Setup
      const swaggerDoc: OpenAPIDocument = {
        swagger: "2.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              summary: "Get users",
              operationId: "getUsers",
              responses: {
                "200": {
                  description: "Success"
                }
              }
            }
          }
        }
      } as OpenAPIDocument;

      // Execute
      const result = (swaggerParser as any).extractEndpoints(swaggerDoc);

      // Verify
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("/users");
      expect(result[0].method).toBe("GET");
    });

    it("should handle empty paths", () => {
      // Setup
      const openApiDoc: OpenAPIDocument = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {}
      } as OpenAPIDocument;

      // Execute
      const result = (swaggerParser as any).extractEndpoints(openApiDoc);

      // Verify
      expect(result).toHaveLength(0);
    });

    it("should handle null path items", () => {
      // Setup
      const openApiDoc: OpenAPIDocument = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {
          "/users": undefined
        },
        components: {}
      } as OpenAPIDocument;

      // Execute
      const result = (swaggerParser as any).extractEndpoints(openApiDoc);

      // Verify
      expect(result).toHaveLength(0);
    });
  });

  describe("createEndpoint", () => {
    it("should create endpoint with all properties", () => {
      // Setup
      const operation = {
        operationId: "getUsers",
        summary: "Get users",
        description: "Retrieve all users",
        tags: ["users"],
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: {
              type: "integer"
            }
          }
        ],
        responses: {
          "200": {
            description: "Success"
          }
        },
        security: [
          {
            apiKey: []
          }
        ],
        deprecated: true
      };

      // Execute
      const result = (swaggerParser as any).createEndpoint("/users", "get", operation);

      // Verify
      expect(result).toEqual({
        path: "/users",
        method: "GET",
        operationId: "getUsers",
        summary: "Get users",
        description: "Retrieve all users",
        tags: ["users"],
        parameters: operation.parameters,
        responses: operation.responses,
        security: operation.security,
        deprecated: true
      });
    });

    it("should create endpoint with minimal properties", () => {
      // Setup
      const operation = {
        responses: {
          "200": {
            description: "Success"
          }
        }
      };

      // Execute
      const result = (swaggerParser as any).createEndpoint("/posts", "post", operation);

      // Verify
      expect(result).toEqual({
        path: "/posts",
        method: "POST",
        operationId: undefined,
        summary: undefined,
        description: undefined,
        tags: undefined,
        parameters: undefined,
        responses: operation.responses,
        security: undefined,
        deprecated: undefined
      });
    });

    it("should handle request body (OpenAPI 3.x)", () => {
      // Setup
      const operation = {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Success"
          }
        }
      };

      // Execute
      const result = (swaggerParser as any).createEndpoint("/users", "post", operation);

      // Verify
      expect(result.requestBody).toEqual(operation.requestBody);
    });

    it("should handle servers at operation level", () => {
      // Setup
      const operation = {
        servers: [
          {
            url: "https://api.example.com",
            description: "Production server"
          }
        ],
        responses: {
          "200": {
            description: "Success"
          }
        }
      };

      // Execute
      const result = (swaggerParser as any).createEndpoint("/users", "get", operation);

      // Verify
      expect(result.servers).toEqual(operation.servers);
    });
  });

  describe("createParseError", () => {
    it("should create FILE_NOT_FOUND error", () => {
      // Setup
      const error = new Error("ENOENT: no such file or directory");

      // Execute
      const result = (swaggerParser as any).createParseError(error, "test-source");

      // Verify
      expect(result).toEqual({
        code: "FILE_NOT_FOUND",
        source: "test-source",
        details: error
      });
    });

    it("should create CIRCULAR_REFERENCE error", () => {
      // Setup
      const error = new Error("Circular reference detected");

      // Execute
      const result = (swaggerParser as any).createParseError(error, "test-source");

      // Verify
      expect(result).toEqual({
        code: "CIRCULAR_REFERENCE",
        source: "test-source",
        details: error
      });
    });

    it("should create NETWORK_ERROR error", () => {
      // Setup
      const error = new Error("Network timeout");

      // Execute
      const result = (swaggerParser as any).createParseError(error, "test-source");

      // Verify
      expect(result).toEqual({
        code: "NETWORK_ERROR",
        source: "test-source",
        details: error
      });
    });

    it("should create INVALID_FORMAT error", () => {
      // Setup
      const error = new Error("Invalid schema format");

      // Execute
      const result = (swaggerParser as any).createParseError(error, "test-source");

      // Verify
      expect(result).toEqual({
        code: "INVALID_FORMAT",
        source: "test-source",
        details: error
      });
    });

    it("should create UNKNOWN error for unrecognized errors", () => {
      // Setup
      const error = new Error("Some other error");

      // Execute
      const result = (swaggerParser as any).createParseError(error, "test-source");

      // Verify
      expect(result).toEqual({
        code: "UNKNOWN",
        source: "test-source",
        details: error
      });
    });

    it("should handle non-Error objects", () => {
      // Setup
      const error = "String error";

      // Execute
      const result = (swaggerParser as any).createParseError(error, "test-source");

      // Verify
      expect(result).toEqual({
        code: "UNKNOWN",
        source: "test-source",
        details: error
      });
    });
  });
});
