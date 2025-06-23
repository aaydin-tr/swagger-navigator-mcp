import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Substitutes environment variables in a string using ${VAR_NAME} syntax
 * @param input The string containing environment variables
 * @returns The string with environment variables substituted
 */
export function substituteEnvVars(input: string): string {
  return input.replace(/\${([^}]+)}/g, (match, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      console.warn(`Environment variable ${varName} is not defined`);
      return match; // Return original if not found
    }
    return value;
  });
}

/**
 * Recursively substitutes environment variables in an object
 * @param obj The object to process
 * @returns The object with environment variables substituted in string values
 */
export function substituteEnvVarsInObject<T>(obj: T): T {
  if (typeof obj === "string") {
    return substituteEnvVars(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => substituteEnvVarsInObject(item)) as T;
  }

  if (obj !== null && typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteEnvVarsInObject(value);
    }
    return result as T;
  }

  return obj;
}
