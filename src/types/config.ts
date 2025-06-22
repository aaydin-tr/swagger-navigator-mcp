import { z } from 'zod';

// Schema for authentication configuration
export const authSchema = z.object({
  type: z.enum(['bearer', 'basic', 'apiKey']),
  credentials: z.string(),
});

// Schema for individual Swagger source
export const swaggerSourceSchema = z.object({
  name: z.string().min(1, 'Source name cannot be empty'),
  source: z.string().min(1, 'Source cannot be empty'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  headers: z.record(z.string()).optional(),
  auth: authSchema.optional(),
  refreshInterval: z.number().positive().optional(),
});

// Schema for search configuration
export const searchConfigSchema = z.object({
  fuzzyThreshold: z.number().min(0).max(1).default(0.6),
  maxResults: z.number().positive().default(50),
});

// Main configuration schema
export const configSchema = z.object({
  sources: z.array(swaggerSourceSchema).min(1, 'At least one source is required'),
  search: searchConfigSchema.optional().default({
    fuzzyThreshold: 0.6,
    maxResults: 50,
  }),
});

// Type exports
export type AuthConfig = z.infer<typeof authSchema>;
export type SwaggerSource = z.infer<typeof swaggerSourceSchema>;
export type SearchConfig = z.infer<typeof searchConfigSchema>;
export type SwaggerMCPConfig = z.infer<typeof configSchema>;

// Validation function with detailed error messages
export function validateConfig(config: unknown): SwaggerMCPConfig {
  try {
    // Validate and ensure unique source names
    const parsed = configSchema.parse(config);
    
    const sourceNames = parsed.sources.map(s => s.name);
    const uniqueNames = new Set(sourceNames);
    
    if (sourceNames.length !== uniqueNames.size) {
      const duplicates = sourceNames.filter((name, index) => 
        sourceNames.indexOf(name) !== index
      );
      throw new Error(`Duplicate source names found: ${duplicates.join(', ')}`);
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => 
        `${e.path.join('.')}: ${e.message}`
      ).join('\n');
      throw new Error(`Configuration validation failed:\n${messages}`);
    }
    throw error;
  }
} 