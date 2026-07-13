import { prisma } from './prisma';
import { chatCompletion, extractAssistantText } from './llm';
import { chatJsonCompletion } from './llm-json';
import { buildPrdSystemPrompt, buildPrdUserContent, buildFeatureExtractPrompt } from './prd-templates';
import { fallbackPrdPayload, fallbackPrdMarkdown } from './prd-fallback';
import { featureExtractSchema } from './prd-parser';
import { inferProjectTitle } from './prd-title';
import { createProjectMcpToken, hashProjectMcpToken, endpointForProject } from './mcp-token';
import { ActorType, TaskStatus } from '@prisma/client';

export const STEP_1_TIMEOUT = 600_000;
export const STEP_2_TIMEOUT = 300_000;

export interface GenerateBody {
  clarification_log?: unknown;
  tech_stack?: unknown;
  model?: string;
  api_key?: string;
  base_url?: string;
  stream?: boolean;
  mode?: 'full' | 'draft' | 'extract' | 'save';
  force_fresh?: boolean;
  prd_text?: string;
  features?: unknown[];
}

export interface Step1Result {
  prd_text: string;
  llm_error?: string;
  project: { id: string; title: string; overview: string; architecture_text: string };
}

export interface Step2Result {
  features: Array<{
    title: string;
    description: string;
    priority?: string;
    acceptance_criteria: string[];
    sub_features: Array<{ title: string; description: string; tasks: Array<{ title: string; description: string }> }>;
  }>;
  llm_error?: string;
}

export interface Step3Result {
  project: { id: string; title: string; overview: string; architecture_text: string };
  feature_count: number;
  prd_text: string;
  mcp: { endpoint: string; token: string; project_id: string };
}

export function userFacingLlmError(message: string): string {
  const text = message.trim();
  if (!text) return '';
  if (/fetch failed/i.test(text) || /LLM_PROXY_BASE_URL missing/i.test(text)) {
    return 'Koneksi ke LLM proxy gagal.';
  }
  if (/aborted/i.test(text) || /timeout/i.test(text) || /AbortError/i.test(text)) {
    return 'Request ke LLM proxy timeout atau terlalu lama merespons.';
  }
  return text;
}

function isRetryableLlmError(message: string): boolean {
  return /fetch failed/i.test(message)
    || /timeout/i.test(message)
    || /aborted/i.test(message)
    || /AbortError/i.test(message)
    || /502/i.test(message)
    || /503/i.test(message)
    || /504/i.test(message);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cachedPrdLooksUsable(text: string): boolean {
  const firstHeading = text.split('\n').find((line) => /^#\s+/.test(line)) ?? '';
  const heading = firstHeading.replace(/^#\s+/, '').trim();
  if (!heading) return false;
  if (/dokumen ini adalah prd awal yang dibuat secara otomatis/i.test(text)) return false;
  if (heading.length > 40 && /\b(?:merupakan|adalah|ialah|yakni)\b/i.test(heading)) return false;
  return true;
}

export async function step1DraftPrd(
  projectId: string,
  project: NonNullable<Awaited<ReturnType<typeof prisma.project.findUnique>>>,
  body: GenerateBody,
  log: (event: { progress: number; message: string; detail?: string }) => void,
): Promise<Step1Result> {
  const techStackValue = body.tech_stack ?? project.tech_stack;
  const clarifyLog = body.clarification_log ?? project.clarification_log;
  const modelOverride = body.model;
  const apiKeyOverride = body.api_key;
  const baseUrlOverride = body.base_url;
  const forceFresh = body.force_fresh === true;
  const category = (clarifyLog && typeof clarifyLog === 'object' && 'category' in clarifyLog)
    ? String((clarifyLog as Record<string, unknown>).category)
    : '';
  const displayTitle = inferProjectTitle(project.title, inferProjectTitle(project.overview ?? '', project.title));
  let llmError = '';

  // Check if draft already exists (idempotent)
  const existing = forceFresh
    ? null
    : await prisma.project.findUnique({ where: { id: projectId }, select: { architecture_text: true } });
  if (existing?.architecture_text && cachedPrdLooksUsable(existing.architecture_text)) {
    log({ progress: 62, message: 'Draft PRD (dari cache)', detail: `${Math.round(existing.architecture_text.length / 1000)}k karakter` });
    return {
      prd_text: existing.architecture_text,
      llm_error: llmError || undefined,
      project: { id: project.id, title: displayTitle, overview: project.overview ?? '', architecture_text: existing.architecture_text },
    };
  } else if (existing?.architecture_text) {
    log({ progress: 22, message: 'Cache PRD diabaikan', detail: 'Draft lama terlihat masih fallback atau judulnya belum bersih' });
  }

  const userContent = buildPrdUserContent({ title: displayTitle, idea: project.overview ?? '', category, clarificationLog: clarifyLog, techStack: techStackValue });
  let prdText = '';

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      log({ progress: 20, message: attempt === 0 ? 'Menulis draft PRD' : 'Retry draft PRD', detail: attempt === 0 ? 'Satu request penuh ke LLM proxy' : 'Mencoba lagi dengan timeout baru' });
      if (forceFresh) {
        log({ progress: 18, message: 'Fresh regenerate aktif', detail: 'Cache draft dilewati' });
      }
      const raw = await chatCompletion({
        messages: [
          { role: 'system', content: buildPrdSystemPrompt() },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 2048,
        signal: AbortSignal.timeout(STEP_1_TIMEOUT),
        model: modelOverride,
        apiKey: apiKeyOverride,
        baseUrl: baseUrlOverride,
      });
      prdText = extractAssistantText(raw) || '';
      if (!prdText) throw new Error('Draft PRD kosong');
      log({ progress: 62, message: 'Draft PRD selesai', detail: `${Math.round(prdText.length / 1000)}k karakter` });
      llmError = '';
      break;
    } catch (e) {
      const message = e instanceof Error ? e.message.slice(0, 200) : 'Draft PRD gagal';
      llmError = userFacingLlmError(message);
      const retryable = isRetryableLlmError(message);
      if (attempt === 0 && retryable) {
        log({ progress: 28, message: 'Draft PRD timeout, retry sekali', detail: llmError || message });
        await sleep(2_000);
        continue;
      }
      prdText = fallbackPrdMarkdown({ title: displayTitle, idea: project.overview ?? '', clarificationLog: clarifyLog, techStack: techStackValue });
      log({ progress: 62, message: 'Gunakan PRD fallback', detail: llmError || 'Semua section gagal' });
      break;
    }
  }

  return {
    prd_text: prdText,
    llm_error: llmError || undefined,
    project: { id: project.id, title: displayTitle, overview: project.overview ?? '', architecture_text: prdText },
  };
}

export async function step2ExtractFeatures(
  projectId: string,
  prdText: string,
  project: NonNullable<Awaited<ReturnType<typeof prisma.project.findUnique>>>,
  body: GenerateBody,
  log: (event: { progress: number; message: string; detail?: string }) => void,
): Promise<Step2Result> {
  const modelOverride = body.model;
  const apiKeyOverride = body.api_key;
  const baseUrlOverride = body.base_url;
  const forceFresh = body.force_fresh === true;
  const techStackValue = body.tech_stack ?? project.tech_stack;
  const clarifyLog = body.clarification_log ?? project.clarification_log;
  let llmError = '';

  // Check if features already exist (idempotent)
  const existingCount = forceFresh ? 0 : await prisma.feature.count({ where: { project_id: projectId } });
  if (existingCount > 0) {
    log({ progress: 80, message: 'Fitur dan task (dari cache)', detail: `${existingCount} fitur sudah tersimpan` });
    const features = await prisma.feature.findMany({
      where: { project_id: projectId },
      orderBy: { order: 'asc' },
      include: {
        sub_features: {
          orderBy: { order: 'asc' },
          include: { tasks: true },
        },
      },
    });
    const mapped: Step2Result['features'] = features.map(f => ({
      title: f.title,
      description: f.description ?? '',
      priority: f.priority ?? undefined,
      acceptance_criteria: f.acceptance_criteria as string[],
      sub_features: f.sub_features.map(sf => ({
        title: sf.title,
        description: sf.description ?? '',
        tasks: sf.tasks.map(t => ({ title: t.title, description: t.description ?? '' })),
      })),
    }));
    return { features: mapped, llm_error: llmError || undefined };
  }

  let features: Step2Result['features'];
  try {
    log({ progress: 68, message: forceFresh ? 'Fresh extract fitur dan task' : 'Mengekstrak fitur dan task', detail: forceFresh ? 'Cache fitur dilewati' : 'Menyiapkan diagram dan task list' });
    const extracted = await chatJsonCompletion({
      messages: [
        { role: 'system', content: 'Output JSON only.' },
        { role: 'user', content: buildFeatureExtractPrompt(prdText) },
      ],
      temperature: 0.2,
      max_tokens: 1024,
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
    llmError = 'Feature extraction failed, using fallback tasks.';
  }

  return { features, llm_error: llmError || undefined };
}

export async function step3SaveAndConnect(
  projectId: string,
  prdText: string,
  features: Step2Result['features'],
  project: NonNullable<Awaited<ReturnType<typeof prisma.project.findUnique>>>,
  body: GenerateBody,
  log: (event: { progress: number; message: string; detail?: string }) => void,
): Promise<Step3Result> {
  const techStackValue = body.tech_stack ?? project.tech_stack;
  const clarifyLog = body.clarification_log ?? project.clarification_log;
  const overview = project.overview ?? '';

  log({ progress: 84, message: 'Menyimpan PRD ke database' });
  await prisma.project.update({
    where: { id: projectId },
    data: {
      overview,
      architecture_text: prdText,
      clarification_log: clarifyLog ?? {},
      tech_stack: techStackValue ?? {},
    },
  });

  log({ progress: 88, message: 'Menyiapkan koneksi MCP' });
  const token = createProjectMcpToken();
  const tokenHash = hashProjectMcpToken(token);
  await prisma.mCPConnection.create({
    data: { project_id: projectId, token_hash: tokenHash },
  });
  const mcp = { endpoint: endpointForProject(projectId), token, project_id: projectId };

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
  };
}
