import { prisma } from '@/lib/prisma';
import { ActorType, TaskStatus } from '@prisma/client';
import { z } from 'zod';

const bodySchema = z.object({
  projectId: z.string().min(1),
  subFeatureId: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().optional().default(''),
});

export async function POST(request: Request) {
  const body = bodySchema.parse(await request.json());

  const subFeatureId = body.subFeatureId ?? (await prisma.subFeature.findFirst({
    where: { feature: { project_id: body.projectId } },
    orderBy: [{ feature: { order: 'asc' } }, { order: 'asc' }],
    select: { id: true },
  }))?.id;

  if (!subFeatureId) {
    return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Sub feature not found' } }, { status: 404 });
  }

  const task = await prisma.task.create({
    data: {
      sub_feature_id: subFeatureId,
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
