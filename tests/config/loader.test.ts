import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve } from "path";
import * as yaml from "js-yaml";
import { loadConfig, detectSourceType, enrichConfigWithTypes, getConfig } from "../../src/config/loader";
import { validateConfig } from "../../src/types/config";
import { substituteEnvVarsInObject } from "../../src/utils/env-substitution";

// Mock dependencies
jest.mock("fs");
jest.mock("js-yaml");
jest.mock("../../src/types/config");
jest.mock("../../src/utils/env-substitution");

const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;

const mockYamlLoad = yaml.load as jest.MockedFunction<typeof yaml.load>;
const mockValidateConfig = validateConfig as jest.MockedFunction<typeof validateConfig>;
const mockSubstituteEnvVarsInObject = substituteEnvVarsInObject as jest.MockedFunction<
  typeof substituteEnvVarsInObject
>;

describe("config/loader", () => {
  // Store original environment variables to restore later
  const originalEnv = process.env;
  const originalConsoleLog = console.log;

  beforeEach(() => {
    // Reset environment variables and mocks before each test
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    console.log = jest.fn();
  });

  afterAll(() => {
    // Restore original environment variables and console.log
    process.env = originalEnv;
    console.log = originalConsoleLog;
  });

  describe("loadConfig", () => {
    it("should load and validate configuration successfully", () => {
      // Setup
      process.env.CONFIG_PATH = "./test-config.yaml";
      const configPath = resolve("./test-config.yaml");
      const rawYamlContent = "sources:\n  - name: test";
      const parsedYaml = { sources: [{ name: "test" }] };
      const configWithEnvVars = { sources: [{ name: "test-substituted" }] };
      const validatedConfig = { sources: [{ name: "test-validated" }] };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(rawYamlContent);
      mockYamlLoad.mockReturnValue(parsedYaml);
      mockSubstituteEnvVarsInObject.mockReturnValue(configWithEnvVars);
      mockValidateConfig.mockReturnValue(validatedConfig as any);

      // Execute
      const result = loadConfig();

      // Verify
      expect(mockExistsSync).toHaveBeenCalledWith(configPath);
      expect(mockReadFileSync).toHaveBeenCalledWith(configPath, "utf8");
      expect(mockYamlLoad).toHaveBeenCalledWith(rawYamlContent);
      expect(mockSubstituteEnvVarsInObject).toHaveBeenCalledWith(parsedYaml);
      expect(mockValidateConfig).toHaveBeenCalledWith(configWithEnvVars);
      expect(result).toBe(validatedConfig);
    });

    it("should throw error when CONFIG_PATH environment variable is not set", () => {
      // Setup
      delete process.env.CONFIG_PATH;

      // Execute & Verify
      expect(() => loadConfig()).toThrow(
        "CONFIG_PATH environment variable is required.\nPlease set CONFIG_PATH to the path of your configuration file."
      );
    });

    it("should throw error when CONFIG_PATH environment variable is empty", () => {
      // Setup
      process.env.CONFIG_PATH = "";

      // Execute & Verify
      expect(() => loadConfig()).toThrow(
        "CONFIG_PATH environment variable is required.\nPlease set CONFIG_PATH to the path of your configuration file."
      );
    });

    it("should throw error when configuration file does not exist", () => {
      // Setup
      process.env.CONFIG_PATH = "./non-existent-config.yaml";
      const configPath = resolve("./non-existent-config.yaml");

      mockExistsSync.mockReturnValue(false);

      // Execute & Verify
      expect(() => loadConfig()).toThrow(
        `Configuration file not found: ${configPath} (specified via CONFIG_PATH)\nPlease create the configuration file at the specified path.`
      );
    });

    it("should handle YAML parsing errors", () => {
      // Setup
      process.env.CONFIG_PATH = "./invalid-config.yaml";
      const yamlError = Object.create(yaml.YAMLException.prototype);
      yamlError.message = "invalid YAML syntax";

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid: yaml: content:");
      mockYamlLoad.mockImplementation(() => {
        throw yamlError;
      });

      // Execute & Verify
      expect(() => loadConfig()).toThrow("Invalid YAML in configuration file: invalid YAML syntax");
    });

    it("should re-throw non-YAML errors", () => {
      // Setup
      process.env.CONFIG_PATH = "./test-config.yaml";
      const customError = new Error("Custom error");

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("valid: yaml");
      mockYamlLoad.mockReturnValue({});
      mockSubstituteEnvVarsInObject.mockReturnValue({});
      mockValidateConfig.mockImplementation(() => {
        throw customError;
      });

      // Execute & Verify
      expect(() => loadConfig()).toThrow("Custom error");
    });

    it("should handle file reading errors", () => {
      // Setup
      process.env.CONFIG_PATH = "./test-config.yaml";
      const fileError = new Error("File read error");

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw fileError;
      });

      // Execute & Verify
      expect(() => loadConfig()).toThrow("File read error");
    });

    it("should resolve relative paths correctly", () => {
      // Setup
      process.env.CONFIG_PATH = "../config/test.yaml";
      const expectedPath = resolve("../config/test.yaml");

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("sources: []");
      mockYamlLoad.mockReturnValue({ sources: [] });
      mockSubstituteEnvVarsInObject.mockReturnValue({ sources: [] });
      mockValidateConfig.mockReturnValue({ sources: [] } as any);

      // Execute
      loadConfig();

      // Verify
      expect(mockExistsSync).toHaveBeenCalledWith(expectedPath);
      expect(mockReadFileSync).toHaveBeenCalledWith(expectedPath, "utf8");
    });

    it("should resolve absolute paths correctly", () => {
      // Setup
      const absolutePath = "/absolute/path/to/config.yaml";
      process.env.CONFIG_PATH = absolutePath;
      const expectedPath = resolve(absolutePath);

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("sources: []");
      mockYamlLoad.mockReturnValue({ sources: [] });
      mockSubstituteEnvVarsInObject.mockReturnValue({ sources: [] });
      mockValidateConfig.mockReturnValue({ sources: [] } as any);

      // Execute
      loadConfig();

      // Verify
      expect(mockExistsSync).toHaveBeenCalledWith(expectedPath);
      expect(mockReadFileSync).toHaveBeenCalledWith(expectedPath, "utf8");
    });
  });

  describe("detectSourceType", () => {
    it("should detect HTTP URLs", () => {
      const result = detectSourceType("http://example.com/swagger.json");

      expect(result).toEqual({
        isHttp: true,
        isFile: false,
        protocol: "http"
      });
    });

    it("should detect HTTPS URLs", () => {
      const result = detectSourceType("https://api.example.com/swagger.json");

      expect(result).toEqual({
        isHttp: true,
        isFile: false,
        protocol: "https"
      });
    });

    it("should detect file paths", () => {
      const result = detectSourceType("./swagger/api.json");

      expect(result).toEqual({
        isHttp: false,
        isFile: true
      });
    });

    it("should detect absolute file paths", () => {
      const result = detectSourceType("/absolute/path/to/swagger.json");

      expect(result).toEqual({
        isHttp: false,
        isFile: true
      });
    });

    it("should detect relative file paths with extensions", () => {
      const result = detectSourceType("../config/swagger.yaml");

      expect(result).toEqual({
        isHttp: false,
        isFile: true
      });
    });

    it("should detect file paths without extensions", () => {
      const result = detectSourceType("./swagger-docs");

      expect(result).toEqual({
        isHttp: false,
        isFile: true
      });
    });

    it("should handle URLs with ports", () => {
      const result = detectSourceType("https://localhost:8080/api/docs");

      expect(result).toEqual({
        isHttp: true,
        isFile: false,
        protocol: "https"
      });
    });

    it("should handle URLs with query parameters", () => {
      const result = detectSourceType("http://api.example.com/swagger?version=v1");

      expect(result).toEqual({
        isHttp: true,
        isFile: false,
        protocol: "http"
      });
    });

    it("should handle URLs with fragments", () => {
      const result = detectSourceType("https://docs.example.com/api#swagger");

      expect(result).toEqual({
        isHttp: true,
        isFile: false,
        protocol: "https"
      });
    });

    it("should not match non-HTTP protocols", () => {
      const result = detectSourceType("ftp://example.com/file");

      expect(result).toEqual({
        isHttp: false,
        isFile: true
      });
    });
  });

  describe("enrichConfigWithTypes", () => {
    it("should enrich configuration with HTTP source types", () => {
      const config = {
        sources: [
          {
            name: "remote-api",
            source: "https://api.example.com/swagger.json",
            description: "Remote API"
          }
        ],
        search: { fuzzyThreshold: 0.6 }
      };

      const result = enrichConfigWithTypes(config as any);

      expect(result).toEqual({
        sources: [
          {
            name: "remote-api",
            source: "https://api.example.com/swagger.json",
            description: "Remote API",
            type: "http"
          }
        ],
        search: { fuzzyThreshold: 0.6 }
      });
    });

    it("should enrich configuration with file source types", () => {
      const config = {
        sources: [
          {
            name: "local-api",
            source: "./swagger/api.json",
            description: "Local API"
          }
        ]
      };

      const result = enrichConfigWithTypes(config as any);

      expect(result).toEqual({
        sources: [
          {
            name: "local-api",
            source: "./swagger/api.json",
            description: "Local API",
            type: "file"
          }
        ]
      });
    });

    it("should enrich configuration with mixed source types", () => {
      const config = {
        sources: [
          {
            name: "local-api",
            source: "./swagger/api.json",
            description: "Local API"
          },
          {
            name: "remote-api",
            source: "https://api.example.com/swagger.json",
            description: "Remote API"
          },
          {
            name: "another-local",
            source: "/absolute/path/swagger.yaml",
            description: "Another local API"
          }
        ],
        search: { fuzzyThreshold: 0.7 },
        refreshInterval: 300
      };

      const result = enrichConfigWithTypes(config as any);

      expect(result).toEqual({
        sources: [
          {
            name: "local-api",
            source: "./swagger/api.json",
            description: "Local API",
            type: "file"
          },
          {
            name: "remote-api",
            source: "https://api.example.com/swagger.json",
            description: "Remote API",
            type: "http"
          },
          {
            name: "another-local",
            source: "/absolute/path/swagger.yaml",
            description: "Another local API",
            type: "file"
          }
        ],
        search: { fuzzyThreshold: 0.7 },
        refreshInterval: 300
      });
    });

    it("should preserve all original config properties", () => {
      const config = {
        sources: [
          {
            name: "api-with-headers",
            source: "https://api.example.com/swagger.json",
            description: "API with custom headers",
            headers: {
              Authorization: "Bearer token",
              "X-API-Key": "secret"
            },
            tags: ["production", "v1"]
          }
        ],
        search: {
          fuzzyThreshold: 0.8
        },
        refreshInterval: 600,
        customProperty: "custom-value"
      };

      const result = enrichConfigWithTypes(config as any);

      expect(result).toEqual({
        sources: [
          {
            name: "api-with-headers",
            source: "https://api.example.com/swagger.json",
            description: "API with custom headers",
            headers: {
              Authorization: "Bearer token",
              "X-API-Key": "secret"
            },
            tags: ["production", "v1"],
            type: "http"
          }
        ],
        search: {
          fuzzyThreshold: 0.8
        },
        refreshInterval: 600,
        customProperty: "custom-value"
      });
    });

    it("should handle empty sources array", () => {
      const config = {
        sources: [],
        search: { fuzzyThreshold: 0.6 }
      };

      const result = enrichConfigWithTypes(config as any);

      expect(result).toEqual({
        sources: [],
        search: { fuzzyThreshold: 0.6 }
      });
    });
  });

  describe("getConfig", () => {
    it("should load, validate, and enrich configuration", () => {
      // Setup
      process.env.CONFIG_PATH = "./test-config.yaml";
      const rawConfig = {
        sources: [
          {
            name: "test-api",
            source: "https://api.test.com/swagger.json",
            description: "Test API"
          }
        ]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("sources: []");
      mockYamlLoad.mockReturnValue(rawConfig);
      mockSubstituteEnvVarsInObject.mockReturnValue(rawConfig);
      mockValidateConfig.mockReturnValue(rawConfig as any);

      // Execute
      const result = getConfig();

      // Verify
      expect(result).toEqual({
        sources: [
          {
            name: "test-api",
            source: "https://api.test.com/swagger.json",
            description: "Test API",
            type: "http"
          }
        ]
      });

      // Verify the integration flow
      expect(mockValidateConfig).toHaveBeenCalledWith(rawConfig);
      expect(result.sources[0].type).toBe("http");
    });

    it("should handle errors from loadConfig", () => {
      // Setup
      delete process.env.CONFIG_PATH;

      // Execute & Verify
      expect(() => getConfig()).toThrow(
        "CONFIG_PATH environment variable is required.\nPlease set CONFIG_PATH to the path of your configuration file."
      );
    });
  });
});
