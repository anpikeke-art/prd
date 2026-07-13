import { z } from 'zod';
import { requireSession } from '@/lib/route-guards';

const bodySchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().optional().default(''),
  model: z.string().min(1).default('ollama/minimax-m2.5'),
});

export async function POST(request: Request) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const body = bodySchema.parse(await request.json());
  const url = `${body.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (body.apiKey) headers.Authorization = `Bearer ${body.apiKey}`;

  const start = performance.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: body.model,
        messages: [{ role: 'user', content: 'Balas hanya: ok' }],
        stream: false,
        max_tokens: 10,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const elapsed = Math.round((performance.now() - start) * 10) / 10;

    if (!res.ok) {
      const text = await res.text();
      return Response.json({
        success: true,
        data: {
          ok: false,
          status: res.status,
          latency: elapsed,
          error: text.slice(0, 500),
        },
      });
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? '';

    return Response.json({
      success: true,
      data: {
        ok: true,
        status: res.status,
        latency: elapsed,
        model: json.model ?? body.model,
        response: content.slice(0, 200),
      },
    });
  } catch (err) {
    const elapsed = Math.round((performance.now() - start) * 10) / 10;
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({
      success: true,
      data: {
        ok: false,
        status: 0,
        latency: elapsed,
        error: message,
      },
    });
  }
}
