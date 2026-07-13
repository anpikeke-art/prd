import { prisma } from '@/lib/prisma';
import { step1DraftPrd, step2ExtractFeatures, step3SaveAndConnect, userFacingLlmError, type GenerateBody } from '@/lib/generate-prd-steps';
import { z } from 'zod';
import { requireOwnedProject } from '@/lib/route-guards';

export const maxDuration = 600;

const bodySchema = z.object({
  mode: z.enum(['full', 'draft', 'extract', 'save']).optional().default('full'),
  clarification_log: z.any().optional(),
  tech_stack: z.any().optional(),
  force_fresh: z.boolean().optional(),
  prd_text: z.string().optional(),
  features: z.any().optional(),
  model: z.preprocess((v) => typeof v === 'string' && v.trim() ? v.trim() : undefined, z.string().optional()),
  api_key: z.preprocess((v) => typeof v === 'string' && v.trim() ? v.trim() : undefined, z.string().optional()),
  base_url: z.preprocess((v) => typeof v === 'string' && v.trim() ? v.trim() : undefined, z.string().url().optional()),
  stream: z.boolean().optional(),
});

function streamResponse(
  run: (send: (event: unknown) => void, sendLog: (event: { progress: number; message: string; detail?: string }) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => { try { controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)); } catch { /* stream closed */ } };
      let latestProgress = 0;
      const sendLog = (event: { progress: number; message: string; detail?: string }) => {
        latestProgress = Math.max(latestProgress, event.progress);
        send({ type: 'log', ...event, progress: latestProgress });
      };
      const heartbeat = setInterval(() => {
        sendLog({ progress: 45, message: 'LLM masih bekerja', detail: 'Request masih aktif' });
      }, 5_000);
      try {
        send({ type: 'log', progress: 5, message: 'Memulai proses' });
        await run(send, sendLog);
      } catch (error) {
        const message = userFacingLlmError(error instanceof Error ? error.message : 'Generate failed');
        send({ type: 'error', progress: 0, message });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireOwnedProject(projectId);
  if ('error' in auth) return auth.error;
  const body = bodySchema.parse(await request.json()) as GenerateBody & { mode: 'full' | 'draft' | 'extract' | 'save' };
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });

  const mode = body.mode ?? 'full';
  const wantsStream = body.stream !== false;

  // Fast path: save mode is always JSON (no LLM call)
  if (mode === 'save') {
    const prdText = body.prd_text ?? '';
    const features = (body.features ?? []) as Parameters<typeof step3SaveAndConnect>[2];
    const data = await step3SaveAndConnect(projectId, prdText, features, project, body, () => {});
    return Response.json({ success: true, data });
  }

  // Draft mode
  if (mode === 'draft') {
    if (!wantsStream) {
      const result = await step1DraftPrd(projectId, project, body, () => {});
      return Response.json({ success: true, data: result });
    }
    return streamResponse(async (send, sendLog) => {
      const result = await step1DraftPrd(projectId, project, body, sendLog);
      send({ type: 'done', progress: 100, data: result });
    });
  }

  // Extract mode
  if (mode === 'extract') {
    const prdText = body.prd_text ?? '';
    if (!prdText) {
      return Response.json({ success: false, error: { code: 'BAD_REQUEST', message: 'prd_text required for extract mode' } }, { status: 400 });
    }
    if (!wantsStream) {
      const result = await step2ExtractFeatures(projectId, prdText, project, body, () => {});
      return Response.json({ success: true, data: result });
    }
    return streamResponse(async (send, sendLog) => {
      const result = await step2ExtractFeatures(projectId, prdText, project, body, sendLog);
      send({ type: 'done', progress: 100, data: result });
    });
  }

  // Full mode (default) — backward compatible: all 3 steps in one stream
  if (!wantsStream) {
    const prdResult = await step1DraftPrd(projectId, project, body, () => {});
    const featureResult = await step2ExtractFeatures(projectId, prdResult.prd_text, project, body, () => {});
    const data = await step3SaveAndConnect(projectId, prdResult.prd_text, featureResult.features, project, body, () => {});
    return Response.json({ success: true, data: { ...data, llm_error: prdResult.llm_error || featureResult.llm_error || undefined } });
  }

  return streamResponse(async (send, sendLog) => {
    if (body.force_fresh) {
      sendLog({ progress: 8, message: 'Fresh regenerate dimulai', detail: 'Cache PRD dan task dilewati' });
    }
    const prdResult = await step1DraftPrd(projectId, project, body, sendLog);
    const featureResult = await step2ExtractFeatures(projectId, prdResult.prd_text, project, body, sendLog);
    const data = await step3SaveAndConnect(projectId, prdResult.prd_text, featureResult.features, project, body, sendLog);
    send({ type: 'done', progress: 100, data: { ...data, llm_error: prdResult.llm_error || featureResult.llm_error || undefined } });
  });
}
