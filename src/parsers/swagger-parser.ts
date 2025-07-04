import SwaggerParser from "@apidevtools/swagger-parser";
import axios from "axios";
import { SwaggerSource } from "../types/config.js";
import {
  ParsedSwaggerSpec,
  ParsedEndpoint,
  SwaggerParseError,
  SwaggerParserOptions,
  SwaggerParserResult,
  OpenAPIPathItem,
  OpenAPIOperation,
  OpenAPIDocument
} from "../types/swagger.js";

export class SwaggerParserModule {
  /**
   * Parses a Swagger/OpenAPI specification from a source
   * @param source The source configuration
   * @param options Parser options
   * @returns Parsed specification result
   */
  async parse(source: SwaggerSource, options: SwaggerParserOptions = {}): Promise<SwaggerParserResult> {
    try {
      let api: OpenAPIDocument;

      if (source.type === "file") {
        // For file sources, use SwaggerParser directly
        api = (await SwaggerParser.validate(source.source)) as unknown as OpenAPIDocument;
      } else {
        // For HTTP sources, fetch the content first
        const content = await this.fetchHttpContent(source, options);
        api = (await SwaggerParser.validate(content)) as unknown as OpenAPIDocument;
      }

      // If dereference is requested, apply it
      if (options.dereference) {
        api = (await SwaggerParser.dereference(api)) as unknown as OpenAPIDocument;
      }

      // Convert to our format
      const parsedSpec = this.convertToInternalFormat(api, source.name);

      return {
        success: true,
        spec: parsedSpec,
        warnings: this.detectWarnings(api)
      };
    } catch (error) {
      return {
        success: false,
        errors: [this.createParseError(error, source.name)]
      };
    }
  }

  /**
   * Fetches content from an HTTP source
   */
  private async fetchHttpContent(
    source: SwaggerSource,
    options: SwaggerParserOptions
  ): Promise<string | OpenAPIDocument> {
    try {
      const response = await axios.get(source.source, {
        headers: source.headers,
        timeout: options.timeout || 30000,
        validateStatus: (status) => status < 400
      });

      // If it's a string, try to parse it as JSON/YAML
      if (typeof response.data === "string") {
        try {
          return JSON.parse(response.data);
        } catch {
          // If JSON parsing fails, return as-is (might be YAML)
          return response.data;
        }
      }

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
        } else if (error.request) {
          throw new Error("Network error: No response received");
        } else {
          throw new Error(`Request error: ${error.message}`);
        }
      }
      throw new Error(`Request error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Converts a parsed OpenAPI document to our internal format
   */
  private convertToInternalFormat(api: OpenAPIDocument, sourceName: string): ParsedSwaggerSpec {
    const version = this.detectVersion(api);
    const endpoints = this.extractEndpoints(api);

    // Handle different versions of OpenAPI
    const isV2 = "swagger" in api && api.swagger === "2.0";
    const isV3 = "openapi" in api;

    return {
      version,
      info: api.info || {},
      servers: isV3 && "servers" in api ? api.servers : undefined,
      host: isV2 && "host" in api ? api.host : undefined,
      basePath: isV2 && "basePath" in api ? api.basePath : undefined,
      schemes: isV2 && "schemes" in api ? api.schemes : undefined,
      endpoints,
      components: isV3 && "components" in api ? api.components : undefined,
      definitions: isV2 && "definitions" in api ? api.definitions : undefined,
      securityDefinitions: isV2 && "securityDefinitions" in api ? api.securityDefinitions : undefined,
      sourceName
    };
  }

  /**
   * Detects the OpenAPI/Swagger version
   */
  private detectVersion(api: OpenAPIDocument): "2.0" | "3.0" | "3.1" {
    if ("swagger" in api && api.swagger === "2.0") {
      return "2.0";
    } else if ("openapi" in api && api.openapi) {
      if (api.openapi.startsWith("3.0")) {
        return "3.0";
      } else if (api.openapi.startsWith("3.1")) {
        return "3.1";
      }
    }
    // Default to 2.0 if no version is specified
    return "2.0";
  }

  /**
   * Extracts all endpoints from the API specification
   */
  private extractEndpoints(api: OpenAPIDocument): ParsedEndpoint[] {
    const endpoints: ParsedEndpoint[] = [];

    if (!api.paths) {
      return endpoints;
    }

    for (const [path, pathItem] of Object.entries(api.paths)) {
      if (!pathItem) continue;

      const pathObj = pathItem as OpenAPIPathItem;
      // Note: 'trace' is only available in OpenAPI 3.x, not in Swagger 2.0
      const isV2 = "swagger" in api && api.swagger === "2.0";
      const methods = isV2
        ? (["get", "post", "put", "delete", "patch", "head", "options"] as const)
        : (["get", "post", "put", "delete", "patch", "head", "options", "trace"] as const);

      for (const method of methods) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const operation = (pathObj as any)[method] as OpenAPIOperation | undefined;
        if (operation) {
          endpoints.push(this.createEndpoint(path, method, operation));
        }
      }
    }

    return endpoints;
  }

  /**
   * Creates a parsed endpoint from an operation
   */
  private createEndpoint(path: string, method: string, operation: OpenAPIOperation): ParsedEndpoint {
    const endpoint: ParsedEndpoint = {
      path,
      method: method.toUpperCase(),
      operationId: operation.operationId,
      summary: operation.summary,
      description: operation.description,
      tags: operation.tags,
      parameters: operation.parameters,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responses: operation.responses as any, // Type differences between versions
      security: operation.security,
      deprecated: operation.deprecated
    };

    // Handle request body (only in OpenAPI 3.x)
    if ("requestBody" in operation && operation.requestBody) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      endpoint.requestBody = operation.requestBody as any;
    }

    // Handle servers (can be on operation level in OpenAPI 3.x)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ("servers" in operation && (operation as any).servers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      endpoint.servers = (operation as any).servers;
    }

    return endpoint;
  }

  /**
   * Detects potential warnings in the specification
   */
  private detectWarnings(api: OpenAPIDocument): string[] {
    const warnings: string[] = [];

    // Check for missing info
    if (!api.info?.title) {
      warnings.push("Missing API title in info section");
    }

    if (!api.info?.version) {
      warnings.push("Missing API version in info section");
    }

    return warnings;
  }

  /**
   * Creates a parse error from an exception
   */
  private createParseError(error: unknown, source: string): SwaggerParseError {
    let code: SwaggerParseError["code"] = "UNKNOWN";

    if (error instanceof Error) {
      if (error.message?.includes("ENOENT")) {
        code = "FILE_NOT_FOUND";
      } else if (error.message?.includes("Circular")) {
        code = "CIRCULAR_REFERENCE";
      } else if (error.message?.includes("Network") || error.message?.includes("HTTP")) {
        code = "NETWORK_ERROR";
      } else if (error.message?.includes("valid") || error.message?.includes("schema")) {
        code = "INVALID_FORMAT";
      }
    }

    return {
      code,
      source,
      details: error
    };
  }
}
