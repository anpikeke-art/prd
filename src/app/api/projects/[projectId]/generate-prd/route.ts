import { prisma } from '@/lib/prisma';
import { chatCompletion, extractAssistantText } from '@/lib/llm';
import { chatJsonCompletion } from '@/lib/llm-json';
import { buildPrdSystemPrompt, buildPrdUserContent, buildFeatureExtractPrompt } from '@/lib/prd-templates';
import { fallbackPrdPayload, fallbackPrdMarkdown } from '@/lib/prd-fallback';
import { featureExtractSchema } from '@/lib/prd-parser';
import { createProjectMcpToken, hashProjectMcpToken, endpointForProject } from '@/lib/mcp-token';
import { ActorType, TaskStatus } from '@prisma/client';
import { z } from 'zod';

const bodySchema = z.object({
  clarification_log: z.any().optional(),
  tech_stack: z.any().optional(),
  model: z.preprocess((v) => typeof v === 'string' && v.trim() ? v.trim() : undefined, z.string().optional()),
  api_key: z.preprocess((v) => typeof v === 'string' && v.trim() ? v.trim() : undefined, z.string().optional()),
  base_url: z.preprocess((v) => typeof v === 'string' && v.trim() ? v.trim() : undefined, z.string().url().optional()),
  stream: z.boolean().optional(),
});

const STEP_1_TIMEOUT = 600_000;
const STEP_2_TIMEOUT = 240_000;
type GenerateBody = z.infer<typeof bodySchema>;
type GenerateLog = (event: { progress: number; message: string; detail?: string }) => void;

function userFacingLlmError(message: string) {
  const text = message.trim();
  if (!text) return '';
  if (/fetch failed/i.test(text) || /LLM_PROXY_BASE_URL missing/i.test(text)) {
    return 'Koneksi ke LLM proxy gagal.';
  }
  return text;
}

async function generateProjectPrd(projectId: string, project: NonNullable<Awaited<ReturnType<typeof prisma.project.findUnique>>>, body: GenerateBody, log: GenerateLog, allowFallback: boolean) {
  const techStackValue = body.tech_stack ?? project.tech_stack;
  const clarifyLog = body.clarification_log ?? project.clarification_log;
  const modelOverride = body.model;
  const apiKeyOverride = body.api_key;
  const baseUrlOverride = body.base_url;
  const category = (clarifyLog && typeof clarifyLog === 'object' && 'category' in clarifyLog)
    ? String((clarifyLog as Record<string, unknown>).category)
    : '';

  // --- STEP 1: Generate structured markdown PRD ---
  let prdText: string;
  let features;
  let llmError = '';

  try {
    log({ progress: 20, message: 'Menghubungi LLM proxy', detail: baseUrlOverride ?? 'Menggunakan setting server' });
    const signal = AbortSignal.timeout(STEP_1_TIMEOUT);
    const raw = await chatCompletion({
      messages: [
        { role: 'system', content: buildPrdSystemPrompt() },
        { role: 'user', content: buildPrdUserContent({ title: project.title, idea: project.overview ?? '', category, clarificationLog: clarifyLog, techStack: techStackValue }) },
      ],
      temperature: 0.7,
      signal,
      model: modelOverride,
      apiKey: apiKeyOverride,
      baseUrl: baseUrlOverride,
    });
    prdText = extractAssistantText(raw) || '';
    if (!prdText) throw new Error('Empty markdown response');
    log({ progress: 62, message: 'Draft PRD selesai ditulis', detail: `${Math.round(prdText.length / 1000)}k karakter diterima` });
  } catch (e) {
    llmError = userFacingLlmError(e instanceof Error ? e.message.slice(0, 200) : 'Step 1 failed');
    if (!allowFallback) throw new Error(llmError || 'LLM gagal menulis PRD.');
    prdText = fallbackPrdMarkdown({ title: project.title, idea: project.overview ?? '', clarificationLog: clarifyLog, techStack: techStackValue });
  }

  // --- STEP 2: Extract features/tasks from markdown ---
  try {
    log({ progress: 68, message: 'Mengekstrak fitur dan task', detail: 'Menyiapkan diagram dan task list' });
    const extracted = await chatJsonCompletion({
      messages: [
        { role: 'system', content: 'Output JSON only.' },
        { role: 'user', content: buildFeatureExtractPrompt(prdText) },
      ],
      temperature: 0.2,
      schema: featureExtractSchema,
      correctionHint: 'Return { "features": [...] } with title, description, acceptance_criteria, sub_features, tasks.',
      timeout: STEP_2_TIMEOUT,
      model: modelOverride,
      apiKey: apiKeyOverride,
      baseUrl: baseUrlOverride,
    });
    features = extracted.features;
    log({ progress: 80, message: 'Struktur task selesai', detail: `${features.length} fitur terdeteksi` });
  } catch {
    const fallback = fallbackPrdPayload({ title: project.title, idea: project.overview ?? '', clarificationLog: clarifyLog, techStack: techStackValue });
    features = fallback.features;
    if (!llmError) llmError = 'Feature extraction failed, using fallback tasks.';
  }

  const overview = project.overview ?? '';
  log({ progress: 84, message: 'Menyimpan PRD ke database' });

  await prisma.project.update({
    where: { id: projectId },
    data: {
      overview,
      architecture_text: prdText,
      clarification_log: clarifyLog,
      tech_stack: techStackValue,
    },
  });

  // Auto-connect MCP
  log({ progress: 88, message: 'Menyiapkan koneksi MCP' });
  const token = createProjectMcpToken();
  const tokenHash = hashProjectMcpToken(token);
  await prisma.mCPConnection.create({
    data: { project_id: projectId, token_hash: tokenHash },
  });
  const mcp = { endpoint: endpointForProject(projectId), token, project_id: projectId };

  // Create features/tasks
  log({ progress: 92, message: 'Menyimpan fitur dan task' });
  await prisma.taskEventLog.deleteMany({ where: { task: { sub_feature: { feature: { project_id: projectId } } } } });
  await prisma.task.deleteMany({ where: { sub_feature: { feature: { project_id: projectId } } } });
  await prisma.subFeature.deleteMany({ where: { feature: { project_id: projectId } } });
  await prisma.feature.deleteMany({ where: { project_id: projectId } });

  for (let featureIndex = 0; featureIndex < features.length; featureIndex += 1) {
    const feature = features[featureIndex];
    const createdFeature = await prisma.feature.create({
      data: {
        project_id: projectId,
        title: feature.title,
        description: feature.description,
        priority: feature.priority ?? 'P0',
        acceptance_criteria: feature.acceptance_criteria,
        status: 'todo',
        order: featureIndex,
      },
    });

    for (let subIndex = 0; subIndex < feature.sub_features.length; subIndex += 1) {
      const sub = feature.sub_features[subIndex];
      const createdSub = await prisma.subFeature.create({
        data: {
          feature_id: createdFeature.id,
          title: sub.title,
          description: sub.description,
          status: 'todo',
          order: subIndex,
        },
      });

      for (const task of sub.tasks) {
        await prisma.task.create({
          data: {
            sub_feature_id: createdSub.id,
            title: task.title,
            description: task.description,
            status: TaskStatus.todo,
            assigned_to: ActorType.human,
          },
        });
      }
    }
  }

  log({ progress: 98, message: 'Menyiapkan file download' });

  return {
    project: { id: projectId, title: project.title, overview, architecture_text: prdText },
    feature_count: features.length,
    prd_text: prdText,
    mcp,
    llm_error: llmError || undefined,
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = bodySchema.parse(await request.json());
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });

  if (body.stream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: unknown) => { try { controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)); } catch { /* stream closed */ } };
        let heartbeat: ReturnType<typeof setInterval> | undefined;
        let latestProgress = 0;
        try {
          const sendLog = (event: { progress: number; message: string; detail?: string }) => {
            latestProgress = Math.max(latestProgress, event.progress);
            send({ type: 'log', ...event, progress: latestProgress });
          };
          sendLog({ progress: 8, message: 'Menyiapkan data generate' });
          heartbeat = setInterval(() => {
            if (latestProgress < 62) sendLog({ progress: 45, message: 'LLM masih menulis PRD', detail: 'Request masih aktif, belum timeout' });
          }, 15_000);
          const data = await generateProjectPrd(projectId, project, body, sendLog, false);
          send({ type: 'done', progress: 100, data });
        } catch (error) {
          const message = userFacingLlmError(error instanceof Error ? error.message : 'Generate failed');
          send({ type: 'error', progress: 0, message });
        } finally {
          if (heartbeat) clearInterval(heartbeat);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  }

  const data = await generateProjectPrd(projectId, project, body, () => {}, true);
  return Response.json({ success: true, data });
}
