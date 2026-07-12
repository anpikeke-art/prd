import { prisma } from '@/lib/prisma';
import { createProjectMcpToken, hashProjectMcpToken, endpointForProject } from '@/lib/mcp-token';

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });

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
