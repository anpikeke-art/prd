import { prisma } from '@/lib/prisma';
import { ActorType, TaskStatus } from '@prisma/client';
import { z } from 'zod';
import { requireOwnedProject, requireSession } from '@/lib/route-guards';

const bodySchema = z.object({
  projectId: z.string().min(1),
  subFeatureId: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().optional().default(''),
});

export async function POST(request: Request) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const body = bodySchema.parse(await request.json());
  const projectAuth = await requireOwnedProject(body.projectId);
  if ('error' in projectAuth) return projectAuth.error;

  const subFeature = body.subFeatureId
    ? await prisma.subFeature.findFirst({
        where: {
          id: body.subFeatureId,
          feature: { project_id: body.projectId },
        },
        select: { id: true },
      })
    : await prisma.subFeature.findFirst({
        where: { feature: { project_id: body.projectId } },
        orderBy: [{ feature: { order: 'asc' } }, { order: 'asc' }],
        select: { id: true },
      });

  if (!subFeature) {
    return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Sub feature not found' } }, { status: 404 });
  }

  const task = await prisma.task.create({
    data: {
      sub_feature_id: subFeature.id,
      title: body.title,
      description: body.description,
      status: TaskStatus.todo,
      assigned_to: ActorType.human,
    },
  });

  await prisma.taskEventLog.create({
    data: {
      task_id: task.id,
      event_type: 'created',
      actor: ActorType.human,
      detail: { title: body.title, description: body.description },
    },
  });

  return Response.json({ success: true, data: { task } });
}
