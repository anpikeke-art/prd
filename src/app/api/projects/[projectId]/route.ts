import { getProjectGraph } from '@/lib/project-service';
import { prisma } from '@/lib/prisma';
import { requireOwnedProject } from '@/lib/route-guards';

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireOwnedProject(projectId);
  if ('error' in auth) return auth.error;
  const project = await getProjectGraph(projectId);
  if (!project) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });
  return Response.json({ success: true, data: { project } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireOwnedProject(projectId);
  if ('error' in auth) return auth.error;

  await prisma.project.delete({ where: { id: projectId } });
  return Response.json({ success: true, data: { projectId } });
}
