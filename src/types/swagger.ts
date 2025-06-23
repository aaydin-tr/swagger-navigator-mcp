export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, any>;
}

export interface OpenAPIParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: any;
  example?: any;
  examples?: Record<string, any>;
}

export interface OpenAPIRequestBody {
  description?: string;
  content: Record<string, any>;
  required?: boolean;
}

export interface OpenAPIResponse {
  description: string;
  headers?: Record<string, any>;
  content?: Record<string, any>;
  links?: Record<string, any>;
}

export interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: any;
  operationId?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  callbacks?: Record<string, any>;
  deprecated?: boolean;
  security?: Array<Record<string, string[]>>;
  servers?: OpenAPIServer[];
}

export interface OpenAPIPathItem {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: OpenAPIOperation;
  put?: OpenAPIOperation;
  post?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  trace?: OpenAPIOperation;
  servers?: OpenAPIServer[];
  parameters?: OpenAPIParameter[];
}

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
  responses?: Record<string, OpenAPIResponse>;
  security?: Array<Record<string, string[]>>;
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
  components?: any;
  definitions?: any;
  securityDefinitions?: any;
  sourceName: string;
}

export interface SwaggerParseError extends Error {
  code: "INVALID_FORMAT" | "NETWORK_ERROR" | "FILE_NOT_FOUND" | "CIRCULAR_REFERENCE" | "UNKNOWN";
  details?: any;
  source: string;
}

export interface SwaggerParserOptions {
  validateSpec?: boolean;
  resolveReferences?: boolean;
  dereference?: boolean;
  continueOnError?: boolean;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface SwaggerParserResult {
  success: boolean;
  spec?: ParsedSwaggerSpec;
  errors?: SwaggerParseError[];
  warnings?: string[];
}
