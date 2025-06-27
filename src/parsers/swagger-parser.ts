import SwaggerParser from "@apidevtools/swagger-parser";
import axios from "axios";
import {
  ParsedSwaggerSpec,
  ParsedEndpoint,
  SwaggerParseError,
  SwaggerParserOptions,
  SwaggerParserResult,
  OpenAPIPathItem,
  OpenAPIOperation
} from "../types/swagger.js";
import { SwaggerSource } from "../types/config.js";

export class SwaggerParserModule {
  private cache: Map<string, ParsedSwaggerSpec> = new Map();

  /**
   * Parses a Swagger/OpenAPI specification from a source
   * @param source The source configuration
   * @param options Parser options
   * @returns Parsed specification result
   */
  async parse(source: SwaggerSource, options: SwaggerParserOptions = {}): Promise<SwaggerParserResult> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(source);
      if (this.cache.has(cacheKey) && !options.continueOnError) {
        return {
          success: true,
          spec: this.cache.get(cacheKey),
          warnings: []
        };
      }

      let api: any;

      if (source.type === "file") {
        // For file sources, use SwaggerParser directly
        api = await SwaggerParser.validate(source.source);
      } else {
        // For HTTP sources, fetch the content first
        const content = await this.fetchHttpContent(source, options);
        api = await SwaggerParser.validate(content);
      }

      // If dereference is requested, apply it
      if (options.dereference) {
        api = await SwaggerParser.dereference(api);
      }

      // Convert to our format
      const parsedSpec = this.convertToInternalFormat(api, source.name);

      // Cache the result
      this.cache.set(cacheKey, parsedSpec);

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
  private async fetchHttpContent(source: SwaggerSource, options: SwaggerParserOptions): Promise<any> {
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
    } catch (error: any) {
      if (error.response) {
        throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error(`Network error: No response received`);
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  /**
   * Converts a parsed OpenAPI document to our internal format
   */
  private convertToInternalFormat(api: any, sourceName: string): ParsedSwaggerSpec {
    const version = this.detectVersion(api);
    const endpoints = this.extractEndpoints(api);

    return {
      version,
      info: api.info || {},
      servers: api.servers,
      host: api.host,
      basePath: api.basePath,
      schemes: api.schemes,
      endpoints,
      components: api.components,
      definitions: api.definitions,
      securityDefinitions: api.securityDefinitions,
      sourceName
    };
  }

  /**
   * Detects the OpenAPI/Swagger version
   */
  private detectVersion(api: any): "2.0" | "3.0" | "3.1" {
    if (api.swagger === "2.0") {
      return "2.0";
    } else if (api.openapi) {
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
  private extractEndpoints(api: any): ParsedEndpoint[] {
    const endpoints: ParsedEndpoint[] = [];

    if (!api.paths) {
      return endpoints;
    }

    for (const [path, pathItem] of Object.entries(api.paths)) {
      const pathObj = pathItem as OpenAPIPathItem;
      const methods = ["get", "post", "put", "delete", "patch", "head", "options", "trace"] as const;

      for (const method of methods) {
        const operation = pathObj[method] as OpenAPIOperation | undefined;
        if (operation) {
          endpoints.push(this.createEndpoint(path, method, operation, api));
        }
      }
    }

    return endpoints;
  }

  /**
   * Creates a parsed endpoint from an operation
   */
  private createEndpoint(path: string, method: string, operation: OpenAPIOperation, api: any): ParsedEndpoint {
    const endpoint: ParsedEndpoint = {
      path,
      method: method.toUpperCase(),
      operationId: operation.operationId,
      summary: operation.summary,
      description: operation.description,
      tags: operation.tags,
      parameters: operation.parameters,
      responses: operation.responses,
      security: operation.security,
      deprecated: operation.deprecated
    };

    // Handle request body
    if (operation.requestBody) {
      endpoint.requestBody = operation.requestBody;
    }

    // Handle servers
    if (operation.servers) {
      endpoint.servers = operation.servers;
    }

    return endpoint;
  }

  /**
   * Detects potential warnings in the specification
   */
  private detectWarnings(api: any): string[] {
    const warnings: string[] = [];

    // Check for missing info
    if (!api.info?.title) {
      warnings.push("Missing API title in info section");
    }

    if (!api.info?.version) {
      warnings.push("Missing API version in info section");
    }

    // Check for endpoints without operationId
    let endpointsWithoutId = 0;
    if (api.paths) {
      for (const pathItem of Object.values(api.paths)) {
        const methods = ["get", "post", "put", "delete", "patch", "head", "options", "trace"] as const;
        for (const method of methods) {
          const operation = (pathItem as any)[method];
          if (operation && !operation.operationId) {
            endpointsWithoutId++;
          }
        }
      }
    }

    if (endpointsWithoutId > 0) {
      warnings.push(`${endpointsWithoutId} endpoints lack operationId`);
    }

    return warnings;
  }

  /**
   * Creates a parse error from an exception
   */
  private createParseError(error: any, source: string): SwaggerParseError {
    let code: SwaggerParseError["code"] = "UNKNOWN";
    let message = error.message || "Unknown error occurred";

    if (error.message?.includes("ENOENT")) {
      code = "FILE_NOT_FOUND";
      message = "File not found";
    } else if (error.message?.includes("Circular")) {
      code = "CIRCULAR_REFERENCE";
      message = "Circular reference detected";
    } else if (error.message?.includes("Network") || error.message?.includes("HTTP")) {
      code = "NETWORK_ERROR";
    } else if (error.message?.includes("valid") || error.message?.includes("schema")) {
      code = "INVALID_FORMAT";
    }

    const parseError = new Error(message) as SwaggerParseError;
    parseError.code = code;
    parseError.source = source;
    parseError.details = error;

    return parseError;
  }

  /**
   * Gets a cache key for a source
   */
  private getCacheKey(source: SwaggerSource): string {
    return `${source.name}:${source.source}`;
  }

  /**
   * Clears the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Removes a specific source from cache
   */
  invalidateCache(sourceName: string): void {
    for (const [key, spec] of this.cache.entries()) {
      if (spec.sourceName === sourceName) {
        this.cache.delete(key);
      }
    }
  }
}
