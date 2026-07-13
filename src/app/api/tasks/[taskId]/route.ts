import { prisma } from '@/lib/prisma';
import { ActorType, TaskStatus } from '@prisma/client';
import { z } from 'zod';
import { requireSession } from '@/lib/route-guards';

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  expected_version: z.number().int().positive(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const body = patchSchema.parse(await request.json());
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      sub_feature: { feature: { project: { owner_id: auth.session.user.id } } },
    },
  });

  if (!task) {
    return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } }, { status: 404 });
  }

  if (task.version !== body.expected_version) {
    return Response.json({ success: false, error: { code: 'VERSION_CONFLICT', message: 'Task version conflict' } }, { status: 409 });
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(body.title ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.status ? { status: body.status as TaskStatus } : {}),
      version: { increment: 1 },
    },
  });

  if (body.status) {
    await prisma.taskEventLog.create({
      data: {
        task_id: taskId,
        event_type: 'status_changed',
        actor: ActorType.human,
        detail: { from: task.status, to: body.status },
      },
    });
  }

  return Response.json({ success: true, data: { task: updated } });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      sub_feature: { feature: { project: { owner_id: auth.session.user.id } } },
    },
  });
  if (!task) {
    return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } }, { status: 404 });
  }

  await prisma.taskEventLog.create({
    data: {
      task_id: taskId,
      event_type: 'deleted',
      actor: ActorType.human,
      detail: { title: task.title },
    },
  });
  await prisma.task.delete({ where: { id: taskId } });

  return Response.json({ success: true, data: { task_id: taskId } });
}
