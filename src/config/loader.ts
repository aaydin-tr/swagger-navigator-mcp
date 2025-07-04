import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import * as yaml from "js-yaml";
import { SwaggerMCPConfig, validateConfig, SwaggerSource, Config } from "../types/config.js";
import { substituteEnvVarsInObject } from "../utils/env-substitution.js";

const CONFIG_PATH_ENV_VAR = "CONFIG_PATH";

/**
 * Gets the configuration file path from environment variable
 * @returns The resolved configuration file path
 * @throws Error if CONFIG_PATH environment variable is not set
 */
function getConfigPath(): string {
  const envConfigPath = process.env[CONFIG_PATH_ENV_VAR];

  if (!envConfigPath) {
    throw new Error(
      `${CONFIG_PATH_ENV_VAR} environment variable is required.\n` +
        "Please set CONFIG_PATH to the path of your configuration file."
    );
  }

  // Use the provided path as-is (can be absolute or relative)
  return resolve(envConfigPath);
}

/**
 * Loads and validates the configuration file
 * @returns The validated configuration
 * @throws Error if configuration file not found or invalid
 */
export function loadConfig(): Config {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    throw new Error(
      `Configuration file not found: ${configPath} (specified via ${CONFIG_PATH_ENV_VAR})\n` +
        "Please create the configuration file at the specified path."
    );
  }

  try {
    // Read the YAML file
    const fileContent = readFileSync(configPath, "utf8");

    // Parse YAML
    const rawConfig = yaml.load(fileContent);

    // Substitute environment variables
    const configWithEnvVars = substituteEnvVarsInObject(rawConfig);

    // Validate and return
    return validateConfig(configWithEnvVars);
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      throw new Error(`Invalid YAML in configuration file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Detects whether a source is a file or HTTP URL
 * @param source The source string
 * @returns Object indicating the source type
 */
export function detectSourceType(source: string): {
  isHttp: boolean;
  isFile: boolean;
  protocol?: string;
} {
  const httpMatch = source.match(/^(https?):\/\//);

  if (httpMatch) {
    return {
      isHttp: true,
      isFile: false,
      protocol: httpMatch[1]
    };
  }

  return {
    isHttp: false,
    isFile: true
  };
}

/**
 * Enriches the configuration with runtime-detected types
 * @param config The validated configuration
 * @returns Configuration with runtime-detected types
 */
export function enrichConfigWithTypes(config: Config): SwaggerMCPConfig {
  const enrichedSources: SwaggerSource[] = config.sources.map((source) => {
    const sourceType = detectSourceType(source.source);
    return {
      ...source,
      type: sourceType.isHttp ? "http" : "file"
    } as SwaggerSource;
  });

  return {
    ...config,
    sources: enrichedSources
  };
}

/**
 * Loads, validates, and enriches the configuration file
 * @returns The enriched configuration with runtime types
 * @throws Error if configuration file not found or invalid
 */
export function getConfig(): SwaggerMCPConfig {
  const config = loadConfig();
  return enrichConfigWithTypes(config);
}

/**
 * Creates a sample configuration file
 * @param path Optional path to create the file at
 */
export function createSampleConfig(path?: string): void {
  const configPath = path || getConfigPath();

  const sampleConfig = `# Swagger MCP Server Configuration

# List of Swagger/OpenAPI sources
sources:
  # Example: Local file source
  - name: "local-api"
    source: "./swagger/api.json"
    description: "Local API documentation"
    tags: ["local", "development"]

  # Example: HTTP source with authentication
  - name: "remote-api"
    source: "https://api.example.com/swagger.json"
    description: "Remote API with authentication"
    headers:
      Authorization: "Bearer \${API_TOKEN}"
    tags: ["remote", "production"]

# Optional: Search configuration
# search:
#   fuzzyThreshold: 0.6  # 0-1, lower = more fuzzy
#   maxResults: 50
`;

  require("fs").writeFileSync(configPath, sampleConfig);
  console.log(`Sample configuration created at: ${configPath}`);
}
