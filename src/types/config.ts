import { z } from "zod";

export const swaggerSourceSchema = z.object({
  name: z.string().min(1, "Source name cannot be empty"),
  source: z.string().min(1, "Source cannot be empty"),
  description: z.string().min(1, "Description cannot be empty"),
  headers: z.record(z.string()).optional()
});

export const searchConfigSchema = z.object({
  fuzzyThreshold: z.number().min(0).max(1).default(0.6)
});

export const configSchema = z.object({
  sources: z.array(swaggerSourceSchema).min(1, "At least one source is required"),
  search: searchConfigSchema.optional().default({
    fuzzyThreshold: 0.6
  }),
  refreshInterval: z.number().positive().optional().default(300) // 5 minutes
});

export type Config = z.infer<typeof configSchema>;

export type SwaggerSource = z.infer<typeof swaggerSourceSchema> & {
  type: "file" | "http";
};

export type SwaggerMCPConfig = Omit<Config, "sources"> & {
  sources: SwaggerSource[];
};

export function validateConfig(config: unknown): Config {
  try {
    const parsed = configSchema.parse(config);

    const sourceNames = parsed.sources.map((s) => s.name);
    const uniqueNames = new Set(sourceNames);

    if (sourceNames.length !== uniqueNames.size) {
      throw new Error("Duplicate source names found in configuration");
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("\n");
      throw new Error(`Configuration validation failed:\n${messages}`);
    }
    throw error;
  }
}
