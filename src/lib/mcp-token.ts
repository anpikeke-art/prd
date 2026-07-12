import crypto from 'node:crypto';
import { getEnv } from '@/lib/env';

export function createProjectMcpToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

export function hashProjectMcpToken(token: string) {
  const env = getEnv();
  return crypto.createHash('sha256').update(`${env.MCP_TOKEN_SECRET}:${token}`).digest('hex');
}

export function endpointForProject(projectId: string) {
  const env = getEnv();
  return `${env.MCP_BASE_URL.replace(/\/$/, '')}/mcp/${projectId}`;
}
