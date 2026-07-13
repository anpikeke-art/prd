import { prisma } from '@/lib/prisma';
import { chatJsonCompletion } from '@/lib/llm-json';
import { buildClarifySystemPrompt, buildClarifyUserContent } from '@/lib/prd-templates';
import { fallbackClarifyQuestions } from '@/lib/prd-fallback';
import { z } from 'zod';
import { requireOwnedProject } from '@/lib/route-guards';

const bodySchema = z.object({
  idea: z.string().min(1),
  existingContext: z.string().optional().default(''),
});

const questionSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  question: z.string().min(1),
  category: z.string().min(1),
  why: z.string().optional().default(''),
  quick_replies: z.array(z.string()).optional().default([]),
});

const clarifyResponseSchema = z.object({
  category: z.string().optional().default(''),
  secondary_category: z.string().nullable().optional().default(null),
  reasoning: z.string().optional().default(''),
  questions: z.array(questionSchema).min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireOwnedProject(projectId);
  if ('error' in auth) return auth.error;
  const body = bodySchema.parse(await request.json());
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });

  const ideaWordCount = body.idea.trim().split(/\s+/).filter(Boolean).length;
  const useFallback = ideaWordCount < 10 || body.idea.trim().length < 40;
  let sourceMode: 'ai' | 'fallback' = useFallback ? 'fallback' : 'ai';

  let result: { category?: string; secondary_category?: string | null; reasoning?: string; questions: z.infer<typeof questionSchema>[] };

  if (useFallback) {
    result = fallbackClarifyQuestions(body.idea);
  } else {
    try {
      const raw = await chatJsonCompletion({
        messages: [
          { role: 'system', content: buildClarifySystemPrompt() },
          { role: 'user', content: buildClarifyUserContent(body.idea, body.existingContext) },
        ],
        temperature: 0.2,
        schema: clarifyResponseSchema,
        correctionHint: 'Return { "category": "...", "secondary_category": ..., "reasoning": "...", "questions": [...] } with required fields.',
      });
      result = raw;
    } catch {
      sourceMode = 'fallback';
      result = fallbackClarifyQuestions(body.idea);
    }
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      clarification_log: {
        ...(project.clarification_log as Record<string, unknown> | null ?? {}),
        idea: body.idea,
        questions: result.questions,
        category: result.category,
        mode: sourceMode,
      },
    },
  });

  return Response.json({
    success: true,
    data: {
      category: result.category,
      secondary_category: result.secondary_category,
      reasoning: result.reasoning,
      questions: result.questions,
      mode: sourceMode,
    },
  });
}
