import { getEnv } from '@/lib/env';
import { requireOwnedProject } from '@/lib/route-guards';

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireOwnedProject(projectId);
  if ('error' in auth) return auth.error;
  const env = getEnv();
  const body = await request.json();

  const upstream = await fetch(`${env.LLM_PROXY_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.LLM_PROXY_API_KEY ? { Authorization: `Bearer ${env.LLM_PROXY_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: body.model ?? 'ollama/minimax-m2.5',
      messages: body.messages,
      temperature: body.temperature ?? 0.2,
      stream: true,
    }),
  });

  if (!upstream.ok) {
    const errorText = await upstream.text();
    return Response.json({ success: false, error: { code: 'INTERNAL_ERROR', message: errorText } }, { status: upstream.status });
  }

  if (!upstream.body) {
    return Response.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Empty stream body' } }, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Project-Id': projectId,
    },
  });
}
