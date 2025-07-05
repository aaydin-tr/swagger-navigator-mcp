import { OpenAPI, OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

// Re-export common types
export type OpenAPIDocument = OpenAPI.Document;
export type OpenAPIInfo = OpenAPIV3.InfoObject | OpenAPIV3_1.InfoObject | OpenAPIV2.InfoObject;
export type OpenAPIServer = OpenAPIV3.ServerObject | OpenAPIV3_1.ServerObject;
export type OpenAPIParameter = OpenAPI.Parameter;
export type OpenAPIRequestBody = OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject;

export type OpenAPIOperation = OpenAPI.Operation;
export type OpenAPIPathItem = OpenAPIV3.PathItemObject | OpenAPIV3_1.PathItemObject | OpenAPIV2.PathItemObject;
export type OpenAPIComponents = OpenAPIV3.ComponentsObject | OpenAPIV3_1.ComponentsObject;

// Custom types for our parser
export interface ParsedEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: OpenAPIV3.ResponsesObject | OpenAPIV3_1.ResponsesObject | OpenAPIV2.ResponsesDefinitionsObject;
  security?:
    | OpenAPIV3.SecurityRequirementObject[]
    | OpenAPIV3_1.SecurityRequirementObject[]
    | OpenAPIV2.SecurityRequirementObject[];
  deprecated?: boolean;
  servers?: OpenAPIServer[];
}

export interface ParsedSwaggerSpec {
  version: "2.0" | "3.0" | "3.1";
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  host?: string;
  basePath?: string;
  schemes?: string[];
  endpoints: ParsedEndpoint[];
  components?: OpenAPIComponents;
  definitions?: OpenAPIV2.DefinitionsObject;
  securityDefinitions?: OpenAPIV2.SecurityDefinitionsObject;
  sourceName: string;
}

export interface SwaggerParseError {
  code: "INVALID_FORMAT" | "NETWORK_ERROR" | "FILE_NOT_FOUND" | "CIRCULAR_REFERENCE" | "UNKNOWN";
  details?: unknown;
  source: string;
}

export interface SwaggerParserResult {
  success: boolean;
  spec?: ParsedSwaggerSpec;
  errors?: SwaggerParseError[];
}

export type ExtendedParsedEndpoint = ParsedEndpoint & {
  source_name: string;
};
