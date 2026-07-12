import { getEnv } from '@/lib/env';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatCompletionOptions = {
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  signal?: AbortSignal;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
};

function authHeaders(env: ReturnType<typeof getEnv>) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (env.LLM_PROXY_API_KEY) {
    headers.Authorization = `Bearer ${env.LLM_PROXY_API_KEY}`;
  }

  return headers;
}

function normalizeErrorBody(body: unknown): string {
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    for (const key of ['error', 'message', 'detail', 'err', 'msg', 'error_message', 'error_msg']) {
      const val = o[key];
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && val && typeof (val as Record<string, unknown>).message === 'string')
        return (val as Record<string, unknown>).message as string;
    }
  }
  return 'LLM proxy error';
}

export async function chatCompletion({ messages, stream = false, temperature = 0.2, signal, model, apiKey, baseUrl }: ChatCompletionOptions) {
  const env = getEnv();
  const proxyBaseUrl = baseUrl || env.LLM_PROXY_BASE_URL;
  if (!proxyBaseUrl) {
    throw new Error('LLM_PROXY_BASE_URL missing');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = apiKey || env.LLM_PROXY_API_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;

  let response: Response;
  try {
    response = await fetch(`${proxyBaseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model ?? 'cx/gpt-5.5',
        messages,
        temperature,
        stream,
      }),
      signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown fetch error';
    if (message.toLowerCase().includes('fetch failed')) {
      throw new Error(`Tidak bisa terhubung ke LLM proxy (${proxyBaseUrl}).`);
    }
    throw error;
  }

  if (!response.ok) {
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {}
    throw new Error(normalizeErrorBody(parsed));
  }

  if (stream) {
    if (!response.body) throw new Error('LLM stream empty body');
    return response.body;
  }

  const json = await response.json();
  return json as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: unknown;
    [key: string]: unknown;
  };
}

export function extractAssistantText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return '';
  const first = choices[0] as { message?: { content?: unknown } } | undefined;
  const content = first?.message?.content;
  return typeof content === 'string' ? content : '';
}

export function extractJsonBlock(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1).trim();

  const arrStart = trimmed.indexOf('[');
  const arrEnd = trimmed.lastIndexOf(']');
  if (arrStart >= 0 && arrEnd > arrStart) return trimmed.slice(arrStart, arrEnd + 1).trim();

  return trimmed;
}
