import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  LLM_PROXY_BASE_URL: z.string().url(),
  LLM_PROXY_API_KEY: z.string().optional().default(''),
  MCP_TOKEN_SECRET: z.string().min(1),
  MCP_PORT: z.coerce.number().int().positive(),
  APP_BASE_URL: z.string().url(),
  MCP_BASE_URL: z.string().url(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  return envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    LLM_PROXY_BASE_URL: process.env.LLM_PROXY_BASE_URL,
    LLM_PROXY_API_KEY: process.env.LLM_PROXY_API_KEY,
    MCP_TOKEN_SECRET: process.env.MCP_TOKEN_SECRET,
    MCP_PORT: process.env.MCP_PORT,
    APP_BASE_URL: process.env.APP_BASE_URL,
    MCP_BASE_URL: process.env.MCP_BASE_URL,
  });
}
