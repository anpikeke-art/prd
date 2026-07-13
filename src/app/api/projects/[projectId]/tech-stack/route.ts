import { prisma } from '@/lib/prisma';
import { chatJsonCompletion } from '@/lib/llm-json';
import { buildTechStackPrompt, type ManualTechStack } from '@/lib/prd-templates';
import { z } from 'zod';
import { requireOwnedProject } from '@/lib/route-guards';

const bodySchema = z.object({
  mode: z.enum(['manual', 'ai']),
  idea: z.string().min(1),
  manual_stack: z.object({
    frontend: z.string().min(1),
    backend: z.string().min(1),
    database: z.string().min(1),
    realtime: z.string().min(1),
    auth_ready: z.boolean(),
  }).optional(),
  clarification_log: z.any().optional(),
});

const aiStackSchema = z.object({
  frontend: z.string().min(1),
  backend: z.string().min(1),
  database: z.string().min(1),
  realtime: z.string().min(1),
  auth_ready: z.boolean(),
  reasons: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireOwnedProject(projectId);
  if ('error' in auth) return auth.error;
  const body = bodySchema.parse(await request.json());
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });

  let techStack: ManualTechStack;
  let reasons: Record<string, string> | undefined;

  if (body.mode === 'manual') {
    if (!body.manual_stack) return Response.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'manual_stack required' } }, { status: 400 });
    techStack = body.manual_stack;
  } else {
    const parsed = await chatJsonCompletion({
      messages: [
        { role: 'system', content: 'Return JSON only.' },
        { role: 'user', content: buildTechStackPrompt(body.idea, body.clarification_log) },
      ],
      temperature: 0.2,
      schema: aiStackSchema,
      correctionHint: 'Return only JSON object with frontend, backend, database, realtime, auth_ready, reasons.',
    });
    techStack = {
      frontend: parsed.frontend,
      backend: parsed.backend,
      database: parsed.database,
      realtime: parsed.realtime,
      auth_ready: parsed.auth_ready,
    };
    reasons = parsed.reasons;
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { tech_stack: { ...techStack, reasons } },
  });

  return Response.json({ success: true, data: { tech_stack: { ...techStack, reasons } } });
}
