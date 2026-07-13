import { prisma } from '@/lib/prisma';
import { requireOwnedProject } from '@/lib/route-guards';

function encodeEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireOwnedProject(projectId);
  if ('error' in auth) return auth.error;
  const encoder = new TextEncoder();
  let closed = false;
  let lastKey = '';

  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        if (closed) return;
        const latest = await prisma.taskEventLog.findFirst({
          where: { task: { sub_feature: { feature: { project_id: projectId } } } },
          orderBy: { timestamp: 'desc' },
          select: {
            id: true,
            timestamp: true,
            event_type: true,
            actor: true,
            detail: true,
            task: {
              select: {
                title: true,
              },
            },
          },
        });
        const key = latest ? `${latest.id}:${latest.timestamp.toISOString()}` : 'empty';
        if (key !== lastKey) {
          lastKey = key;
          controller.enqueue(encoder.encode(encodeEvent('project_event', {
            projectId,
            latest: latest ? {
              id: latest.id,
              task_title: latest.task.title,
              event_type: latest.event_type,
              actor: latest.actor,
              timestamp: latest.timestamp,
              detail: latest.detail,
            } : null,
          })));
        } else {
          controller.enqueue(encoder.encode(`event: ping\ndata: ${JSON.stringify({ ok: true })}\n\n`));
        }
      };

      void send();
      const interval = setInterval(() => {
        void send();
      }, 2000);

      const abort = () => {
        closed = true;
        clearInterval(interval);
        controller.close();
      };

      request.signal.addEventListener('abort', abort, { once: true });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
