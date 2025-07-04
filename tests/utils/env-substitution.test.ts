import { substituteEnvVars, substituteEnvVarsInObject } from "../../src/utils/env-substitution";

describe("env-substitution", () => {
  // Store original environment variables to restore later
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe("substituteEnvVars", () => {
    it("should substitute a single environment variable", () => {
      process.env.TEST_VAR = "test_value";
      const result = substituteEnvVars("Hello ${TEST_VAR}");
      expect(result).toBe("Hello test_value");
    });

    it("should substitute multiple environment variables", () => {
      process.env.NAME = "John";
      process.env.AGE = "30";
      const result = substituteEnvVars("Name: ${NAME}, Age: ${AGE}");
      expect(result).toBe("Name: John, Age: 30");
    });

    it("should substitute the same variable multiple times", () => {
      process.env.REPEAT = "hello";
      const result = substituteEnvVars("${REPEAT} world ${REPEAT}");
      expect(result).toBe("hello world hello");
    });

    it("should return original string when no variables are present", () => {
      const input = "No variables here";
      const result = substituteEnvVars(input);
      expect(result).toBe(input);
    });

    it("should return original placeholder when environment variable is undefined", () => {
      // Ensure the variable is not set
      delete process.env.UNDEFINED_VAR;

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      const result = substituteEnvVars("Value: ${UNDEFINED_VAR}");
      expect(result).toBe("Value: ${UNDEFINED_VAR}");
      expect(consoleSpy).toHaveBeenCalledWith("Environment variable UNDEFINED_VAR is not defined");

      consoleSpy.mockRestore();
    });

    it("should handle empty environment variable", () => {
      process.env.EMPTY_VAR = "";
      const result = substituteEnvVars("Value: ${EMPTY_VAR}");
      expect(result).toBe("Value: ");
    });

    it("should handle environment variable with special characters", () => {
      process.env.SPECIAL_VAR = "!@#$%^&*()";
      const result = substituteEnvVars("Special: ${SPECIAL_VAR}");
      expect(result).toBe("Special: !@#$%^&*()");
    });

    it("should handle environment variable with spaces", () => {
      process.env.SPACE_VAR = "hello world";
      const result = substituteEnvVars("Value: ${SPACE_VAR}");
      expect(result).toBe("Value: hello world");
    });

    it("should handle malformed variable syntax", () => {
      process.env.TEST_VAR = "test_value";
      const result = substituteEnvVars("Malformed: ${TEST_VAR and more text}");
      expect(result).toBe("Malformed: ${TEST_VAR and more text}");
    });

    it("should handle empty string input", () => {
      const result = substituteEnvVars("");
      expect(result).toBe("");
    });

    it("should handle variable names with numbers and underscores", () => {
      process.env.VAR_123 = "numbered_var";
      process.env.VAR_WITH_UNDERSCORES = "underscore_var";
      const result = substituteEnvVars("${VAR_123} and ${VAR_WITH_UNDERSCORES}");
      expect(result).toBe("numbered_var and underscore_var");
    });

    it("should handle nested variable-like patterns", () => {
      process.env.OUTER = "outer_value";
      const result = substituteEnvVars("${OUTER} and ${INNER_${OUTER}}");
      expect(result).toBe("outer_value and ${INNER_${OUTER}}");
    });
  });

  describe("substituteEnvVarsInObject", () => {
    it("should substitute environment variables in string values", () => {
      process.env.API_KEY = "secret_key";
      process.env.BASE_URL = "https://api.example.com";

      const input = {
        apiKey: "${API_KEY}",
        baseUrl: "${BASE_URL}",
        timeout: 5000
      };

      const result = substituteEnvVarsInObject(input);

      expect(result).toEqual({
        apiKey: "secret_key",
        baseUrl: "https://api.example.com",
        timeout: 5000
      });
    });

    it("should handle nested objects", () => {
      process.env.DB_HOST = "localhost";
      process.env.DB_PORT = "5432";

      const input = {
        database: {
          host: "${DB_HOST}",
          port: "${DB_PORT}",
          settings: {
            ssl: true,
            connectionString: "postgres://${DB_HOST}:${DB_PORT}/mydb"
          }
        }
      };

      const result = substituteEnvVarsInObject(input);

      expect(result).toEqual({
        database: {
          host: "localhost",
          port: "5432",
          settings: {
            ssl: true,
            connectionString: "postgres://localhost:5432/mydb"
          }
        }
      });
    });

    it("should handle arrays", () => {
      process.env.SERVER1 = "server1.com";
      process.env.SERVER2 = "server2.com";

      const input = {
        servers: ["${SERVER1}", "${SERVER2}", "static.com"],
        ports: [8080, 8081]
      };

      const result = substituteEnvVarsInObject(input);

      expect(result).toEqual({
        servers: ["server1.com", "server2.com", "static.com"],
        ports: [8080, 8081]
      });
    });

    it("should handle arrays with nested objects", () => {
      process.env.TOKEN1 = "token1";
      process.env.TOKEN2 = "token2";

      const input = {
        endpoints: [
          {
            url: "https://api1.com",
            headers: { Authorization: "Bearer ${TOKEN1}" }
          },
          {
            url: "https://api2.com",
            headers: { Authorization: "Bearer ${TOKEN2}" }
          }
        ]
      };

      const result = substituteEnvVarsInObject(input);

      expect(result).toEqual({
        endpoints: [
          {
            url: "https://api1.com",
            headers: { Authorization: "Bearer token1" }
          },
          {
            url: "https://api2.com",
            headers: { Authorization: "Bearer token2" }
          }
        ]
      });
    });

    it("should handle primitive values", () => {
      const stringResult = substituteEnvVarsInObject("plain string");
      expect(stringResult).toBe("plain string");

      const numberResult = substituteEnvVarsInObject(42);
      expect(numberResult).toBe(42);

      const booleanResult = substituteEnvVarsInObject(true);
      expect(booleanResult).toBe(true);

      const nullResult = substituteEnvVarsInObject(null);
      expect(nullResult).toBeNull();

      const undefinedResult = substituteEnvVarsInObject(undefined);
      expect(undefinedResult).toBeUndefined();
    });

    it("should handle string with environment variables", () => {
      process.env.TEST_STRING = "test_value";
      const result = substituteEnvVarsInObject("Hello ${TEST_STRING}");
      expect(result).toBe("Hello test_value");
    });

    it("should handle empty objects and arrays", () => {
      const emptyObject = substituteEnvVarsInObject({});
      expect(emptyObject).toEqual({});

      const emptyArray = substituteEnvVarsInObject([]);
      expect(emptyArray).toEqual([]);
    });

    it("should preserve object structure and non-string values", () => {
      process.env.ENV_VAR = "env_value";

      const input = {
        stringValue: "${ENV_VAR}",
        numberValue: 123,
        booleanValue: true,
        nullValue: null,
        undefinedValue: undefined,
        functionValue: () => "test"
      };

      const result = substituteEnvVarsInObject(input);

      expect(result.stringValue).toBe("env_value");
      expect(result.numberValue).toBe(123);
      expect(result.booleanValue).toBe(true);
      expect(result.nullValue).toBeNull();
      expect(result.undefinedValue).toBeUndefined();
      expect(typeof result.functionValue).toBe("function");
    });

    it("should handle complex real-world configuration", () => {
      process.env.GITHUB_TOKEN = "ghp_1234567890";
      process.env.API_KEY = "api_key_123";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";

      const input = {
        sources: [
          {
            name: "github-api",
            source: "https://api.github.com",
            headers: {
              Authorization: "token ${GITHUB_TOKEN}",
              Accept: "application/vnd.github.v3+json"
            }
          },
          {
            name: "internal-api",
            source: "https://internal.company.com/api/swagger.json",
            headers: {
              "X-API-Key": "${API_KEY}"
            }
          }
        ],
        database: {
          url: "${DATABASE_URL}",
          ssl: true,
          maxConnections: 10
        },
        search: {
          fuzzyThreshold: 0.6
        }
      };

      const result = substituteEnvVarsInObject(input);

      expect(result).toEqual({
        sources: [
          {
            name: "github-api",
            source: "https://api.github.com",
            headers: {
              Authorization: "token ghp_1234567890",
              Accept: "application/vnd.github.v3+json"
            }
          },
          {
            name: "internal-api",
            source: "https://internal.company.com/api/swagger.json",
            headers: {
              "X-API-Key": "api_key_123"
            }
          }
        ],
        database: {
          url: "postgresql://user:pass@localhost:5432/db",
          ssl: true,
          maxConnections: 10
        },
        search: {
          fuzzyThreshold: 0.6
        }
      });
    });

    it("should handle undefined environment variables in objects", () => {
      delete process.env.UNDEFINED_VAR;

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      const input = {
        value: "${UNDEFINED_VAR}",
        other: "static"
      };

      const result = substituteEnvVarsInObject(input);

      expect(result).toEqual({
        value: "${UNDEFINED_VAR}",
        other: "static"
      });
      expect(consoleSpy).toHaveBeenCalledWith("Environment variable UNDEFINED_VAR is not defined");

      consoleSpy.mockRestore();
    });

    it("should handle objects with complex nested structures", () => {
      process.env.TEST_VAR = "test_value";

      const input = {
        value: "${TEST_VAR}",
        nested: {
          deep: {
            value: "${TEST_VAR}_nested"
          }
        }
      };

      const result = substituteEnvVarsInObject(input);

      expect(result.value).toBe("test_value");
      expect(result.nested.deep.value).toBe("test_value_nested");
    });
  });
});
