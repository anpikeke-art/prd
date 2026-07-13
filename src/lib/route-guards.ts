import { getAuthSession } from '@/auth';
import { prisma } from '@/lib/prisma';

function unauthorized() {
  return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } }, { status: 401 });
}

function notFound() {
  return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });
}

export async function requireSession() {
  const session = await getAuthSession();
  if (!session?.user?.id) return { error: unauthorized() as Response };
  return { session };
}

export async function requireOwnedProject(projectId: string) {
  const auth = await requireSession();
  if ('error' in auth) return auth;

  const project = await prisma.project.findFirst({
    where: { id: projectId, owner_id: auth.session.user.id },
    select: { id: true },
  });

  if (!project) return { error: notFound() as Response };
  return { session: auth.session, project };
}

