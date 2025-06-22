import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as yaml from 'js-yaml';
import { SwaggerMCPConfig, validateConfig } from '../types/config.js';
import { substituteEnvVarsInObject } from '../utils/env-substitution.js';

const CONFIG_FILE_NAME = 'swagger-mcp.config.yaml';

/**
 * Loads and validates the configuration file
 * @returns The validated configuration
 * @throws Error if configuration file not found or invalid
 */
export function loadConfig(): SwaggerMCPConfig {
  const configPath = resolve(process.cwd(), CONFIG_FILE_NAME);
  
  if (!existsSync(configPath)) {
    throw new Error(
      `Configuration file not found: ${configPath}\n` +
      `Please create a ${CONFIG_FILE_NAME} file in the project root.`
    );
  }
  
  try {
    // Read the YAML file
    const fileContent = readFileSync(configPath, 'utf8');
    
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
      protocol: httpMatch[1],
    };
  }
  
  return {
    isHttp: false,
    isFile: true,
  };
}

/**
 * Creates a sample configuration file
 * @param path Optional path to create the file at
 */
export function createSampleConfig(path?: string): void {
  const configPath = path || resolve(process.cwd(), CONFIG_FILE_NAME);
  
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
  
  require('fs').writeFileSync(configPath, sampleConfig);
  console.log(`Sample configuration created at: ${configPath}`);
} 