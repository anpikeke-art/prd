import { prisma } from '@/lib/prisma';
import { createProjectMcpToken, hashProjectMcpToken, endpointForProject } from '@/lib/mcp-token';
import { requireOwnedProject } from '@/lib/route-guards';

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireOwnedProject(projectId);
  if ('error' in auth) return auth.error;

  const token = createProjectMcpToken();
  const tokenHash = hashProjectMcpToken(token);
  await prisma.mCPConnection.create({
    data: {
      project_id: projectId,
      token_hash: tokenHash,
    },
  });

  return Response.json({
    success: true,
    data: {
      endpoint: endpointForProject(projectId),
      token,
      project_id: projectId,
    },
  });
}
