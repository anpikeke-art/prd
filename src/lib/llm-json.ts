import { chatCompletion, extractAssistantText, extractJsonBlock, type ChatMessage } from '@/lib/llm';
import { z } from 'zod';

export type JsonCompletionOptions<T> = {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  schema?: z.ZodType<T>;
  correctionHint?: string;
  timeout?: number;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
};

function safeParseJson(raw: string): unknown {
  const block = extractJsonBlock(raw);
  return JSON.parse(block);
}

export async function chatJsonCompletion<T = unknown>({ messages, temperature = 0.2, max_tokens, schema, correctionHint, timeout, model, apiKey, baseUrl }: JsonCompletionOptions<T>): Promise<T> {
  let lastError: unknown;
  let lastRaw = '';
  const signal = timeout ? AbortSignal.timeout(timeout) : undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const payload = await chatCompletion({ messages, temperature, max_tokens, signal, model, apiKey, baseUrl });
    const text = extractAssistantText(payload);
    const raw = text || JSON.stringify(payload);
    lastRaw = raw;

    try {
      const parsed = safeParseJson(raw);
      return schema ? schema.parse(parsed) : (parsed as T);
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        messages = [
          ...messages,
          {
            role: 'user',
            content: correctionHint ?? `Output tadi invalid JSON. Perbaiki dan return pure JSON only. Raw response:\n${raw}`,
          },
        ];
      }
    }
  }

  throw lastError instanceof Error ? new Error(`${lastError.message}\nRaw response:\n${lastRaw}`) : new Error(`Invalid JSON response\nRaw response:\n${lastRaw}`);
}
