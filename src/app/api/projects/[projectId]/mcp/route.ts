import { prisma } from '@/lib/prisma';
import { endpointForProject } from '@/lib/mcp-token';

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const conn = await prisma.mCPConnection.findFirst({ where: { project_id: projectId }, orderBy: { created_at: 'desc' } });
  if (!conn) return Response.json({ success: true, data: null });
  return Response.json({
    success: true,
    data: {
      endpoint: endpointForProject(projectId),
      token_hash: conn.token_hash.slice(0, 12) + '…',
      project_id: projectId,
      created_at: conn.created_at,
      last_sync_at: conn.last_sync_at,
      last_agent: conn.last_agent,
    },
  });
}
