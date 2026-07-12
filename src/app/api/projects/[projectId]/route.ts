import { getProjectGraph } from '@/lib/project-service';
import { getAuthSession } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProjectGraph(projectId);
  if (!project) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });
  return Response.json({ success: true, data: { project } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getAuthSession();
  if (!session) return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } }, { status: 401 });

  const { projectId } = await params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, owner_id: session.user.id },
    select: { id: true },
  });

  if (!project) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });

  await prisma.project.delete({ where: { id: projectId } });
  return Response.json({ success: true, data: { projectId } });
}
